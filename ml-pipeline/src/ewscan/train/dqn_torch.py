from __future__ import annotations

import json
import threading
import time
from pathlib import Path

import numpy as np
import torch
from torch import nn

from ewscan.config import EnvConfig, TrainConfig
from ewscan.env.rf_env import RFScanEnv

N_BAND_FEATURES = 4
N_SCALARS = 3


def detect_devices(requested: str = "auto") -> list[torch.device]:
    if requested != "auto":
        return [torch.device(requested)]
    if not torch.cuda.is_available():
        return [torch.device("cpu")]
    return [torch.device(f"cuda:{i}") for i in range(torch.cuda.device_count())]


class BandQNet(nn.Module):
    """Parameter-shared per-band Q network: Q(s, b) = head(band_score(b), context).

    The same band sub-network scores every band from its own feature vector, so a
    single transition provides gradient signal for the Q-values of all bands.
    """

    def __init__(self, n_bands: int, hidden: int = 64):
        super().__init__()
        self.n_bands = n_bands
        self.band_mlp = nn.Sequential(
            nn.Linear(N_BAND_FEATURES, hidden),
            nn.ReLU(),
            nn.Linear(hidden, hidden),
            nn.ReLU(),
            nn.Linear(hidden, 1),
        )
        self.ctx_mlp = nn.Sequential(
            nn.Linear(N_SCALARS, hidden), nn.ReLU(), nn.Linear(hidden, hidden), nn.ReLU()
        )
        self.head = nn.Sequential(nn.Linear(hidden + 1, hidden), nn.ReLU(), nn.Linear(hidden, 1))

    def forward(self, obs: torch.Tensor) -> torch.Tensor:
        n = obs.shape[0]
        b = self.n_bands
        feats = obs[:, : b * N_BAND_FEATURES].reshape(n, b, N_BAND_FEATURES)
        scalars = obs[:, b * N_BAND_FEATURES :]
        score = self.band_mlp(feats).squeeze(-1)
        ctx = self.ctx_mlp(scalars).unsqueeze(1).expand(n, b, -1)
        q = self.head(torch.cat([score.unsqueeze(-1), ctx], dim=-1)).squeeze(-1)
        return q


class ReplayBuffer:
    def __init__(self, capacity: int, obs_dim: int, rng: np.random.Generator):
        self.capacity = capacity
        self.obs = np.zeros((capacity, obs_dim), dtype=np.float32)
        self.next_obs = np.zeros((capacity, obs_dim), dtype=np.float32)
        self.actions = np.zeros(capacity, dtype=np.int64)
        self.rewards = np.zeros(capacity, dtype=np.float32)
        self.rng = rng
        self.pos = 0
        self.size = 0
        self.lock = threading.Lock()

    def add(self, obs, action, reward, next_obs) -> None:
        with self.lock:
            i = self.pos
            self.obs[i] = obs
            self.next_obs[i] = next_obs
            self.actions[i] = action
            self.rewards[i] = reward
            self.pos = (self.pos + 1) % self.capacity
            self.size = min(self.size + 1, self.capacity)

    def sample(self, batch: int):
        with self.lock:
            idx = self.rng.integers(0, self.size, size=batch)
            return (
                self.obs[idx].copy(),
                self.actions[idx].copy(),
                self.rewards[idx].copy(),
                self.next_obs[idx].copy(),
            )


class _SharedState:
    def __init__(self):
        self.lock = threading.Lock()
        self.global_step = 0
        self.weights_version = 0
        self.latest_weights: dict | None = None
        self.stop = False
        self.episodes: list[tuple[int, int, float]] = []


def _publish_weights(net: nn.Module, shared: _SharedState) -> None:
    state = {k: v.detach().cpu() for k, v in net.state_dict().items()}
    with shared.lock:
        shared.latest_weights = state
        shared.weights_version += 1


def _actor(
    rank: int,
    device: torch.device,
    env: RFScanEnv,
    net: BandQNet,
    shared: _SharedState,
    buffer: ReplayBuffer,
    tc: TrainConfig,
    eps_start: float,
    eps_end: float,
    explore_steps: float,
) -> None:
    rng = np.random.default_rng(tc.seed + 1000 + rank)
    local_version = -1
    obs, _ = env.reset()
    episode_reward = 0.0
    while True:
        with shared.lock:
            step = shared.global_step
            stop = shared.stop
            new_version = shared.weights_version
            weights = shared.latest_weights
        if stop or step >= tc.total_timesteps:
            break
        if new_version != local_version and weights is not None:
            net.load_state_dict(weights)
            local_version = new_version
        eps = max(eps_end, eps_start - (eps_start - eps_end) * step / explore_steps)
        if rng.random() < eps:
            action = int(rng.integers(net.n_bands))
        else:
            with torch.no_grad():
                q = net(torch.as_tensor(obs[None], dtype=torch.float32, device=device))
            action = int(q.argmax(dim=1).item())
        next_obs, reward, term, trunc, info = env.step(action)
        buffer.add(obs, action, reward, next_obs)
        episode_reward += float(reward)
        obs = next_obs
        with shared.lock:
            shared.global_step += 1
            if trunc or term:
                shared.episodes.append((rank, shared.global_step, episode_reward))
                episode_reward = 0.0
                reset_obs, _ = env.reset()
                obs = reset_obs


def train_dqn(config: EnvConfig, tc: TrainConfig) -> Path:
    out = Path(tc.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    devices = detect_devices(tc.device)
    n_actors = tc.n_actors if tc.n_actors > 0 else min(len(devices), 4)
    learner_device = devices[0]
    print(
        f"actors: {n_actors} on {[str(devices[i % len(devices)]) for i in range(n_actors)]} | "
        f"learner on {learner_device} | buffer {tc.buffer_size}",
        flush=True,
    )

    obs_dim = config.spectrum.n_bands * N_BAND_FEATURES + N_SCALARS
    rng = np.random.default_rng(tc.seed)
    shared = _SharedState()
    buffer = ReplayBuffer(tc.buffer_size, obs_dim, rng)
    net = BandQNet(config.spectrum.n_bands).to(learner_device)
    target = BandQNet(config.spectrum.n_bands).to(learner_device)
    target.load_state_dict(net.state_dict())
    opt = torch.optim.Adam(net.parameters(), lr=tc.learning_rate)

    eps_start, eps_end = 1.0, 0.05
    explore_steps = max(tc.exploration_fraction * tc.total_timesteps, 1)

    actors = []
    for rank in range(n_actors):
        env = RFScanEnv(
            config, split=tc.train_split, shuffle=True, seed=tc.seed + 1000 * (rank + 1)
        )
        actor_net = BandQNet(config.spectrum.n_bands).to(devices[rank % len(devices)])
        t = threading.Thread(
            target=_actor,
            args=(
                rank,
                devices[rank % len(devices)],
                env,
                actor_net,
                shared,
                buffer,
                tc,
                eps_start,
                eps_end,
                explore_steps,
            ),
            daemon=True,
        )
        actors.append(t)
    _publish_weights(net, shared)
    for t in actors:
        t.start()

    grad_steps = 0
    last_trained_step = tc.learning_starts
    last_sync_step = 0
    last_log_step = 0
    best_mean_reward = -float("inf")
    monitor_rows: list[str] = ["r,l,actor"]
    while shared.global_step < tc.total_timesteps or (
        buffer.size >= tc.learning_starts and shared.global_step - last_trained_step >= tc.train_freq
    ):
        step_now = shared.global_step
        owed = 0
        if buffer.size >= tc.learning_starts:
            owed = (step_now - last_trained_step) // tc.train_freq
        if owed > 0:
            for _ in range(min(owed, 64)):
                s_obs, s_act, s_rew, s_next = buffer.sample(tc.batch_size)
                t_obs = torch.as_tensor(s_obs, device=learner_device)
                t_next = torch.as_tensor(s_next, device=learner_device)
                with torch.no_grad():
                    max_next = target(t_next).max(dim=1).values
                    target_q = torch.as_tensor(s_rew, device=learner_device) + tc.gamma * max_next
                q_all = net(t_obs)
                q_sel = q_all.gather(
                    1, torch.as_tensor(s_act, device=learner_device).view(-1, 1)
                ).squeeze(1)
                loss = nn.functional.smooth_l1_loss(q_sel, target_q)
                opt.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(net.parameters(), 10.0)
                opt.step()
                grad_steps += 1
                last_trained_step += tc.train_freq
                if grad_steps % tc.target_update_interval == 0:
                    target.load_state_dict(net.state_dict())
        else:
            time.sleep(0.001)
        if step_now - last_sync_step >= tc.sync_interval:
            _publish_weights(net, shared)
            last_sync_step = step_now
            with shared.lock:
                recent_rewards = [r for _, _, r in shared.episodes[-10:]]
            if len(recent_rewards) >= 5:
                mean_reward = float(np.mean(recent_rewards))
                if mean_reward > best_mean_reward:
                    best_mean_reward = mean_reward
                    torch.save(
                        {
                            "state_dict": net.state_dict(),
                            "n_bands": config.spectrum.n_bands,
                            "hidden": 64,
                            "config": json.loads(config.model_dump_json()),
                            "mean_reward": mean_reward,
                            "at_global_step": step_now,
                        },
                        out / "model_best.pt",
                    )
        if step_now - last_log_step >= 50_000:
            with shared.lock:
                recent = [r for _, _, r in shared.episodes[-10:]] or [0.0]
            print(
                f"step {step_now}: grad_steps={grad_steps} buffer={buffer.size} "
                f"mean_ep_reward(last10)={np.mean(recent):.1f} best={best_mean_reward:.1f}",
                flush=True,
            )
            torch.save(
                {
                    "state_dict": net.state_dict(),
                    "n_bands": config.spectrum.n_bands,
                    "hidden": 64,
                    "config": json.loads(config.model_dump_json()),
                },
                out / "model_latest.pt",
            )
            last_log_step = step_now

    with shared.lock:
        shared.stop = True
    for t in actors:
        t.join(timeout=30)

    episodes = sorted(shared.episodes, key=lambda e: e[1])
    for rank, step, r in episodes:
        monitor_rows.append(f"{r},{step},{rank}")
    (out / "monitor.csv").write_text("\n".join(monitor_rows) + "\n")
    model_path = out / "model_final.pt"
    torch.save(
        {
            "state_dict": net.state_dict(),
            "n_bands": config.spectrum.n_bands,
            "hidden": 64,
            "config": json.loads(config.model_dump_json()),
        },
        model_path,
    )
    (out / "train_config.json").write_text(
        json.dumps(
            {
                "env": json.loads(config.model_dump_json()),
                "train": json.loads(tc.model_dump_json()),
                "devices": [str(d) for d in devices],
                "n_actors": n_actors,
                "grad_steps": grad_steps,
            },
            indent=2,
        )
    )
    recent = [r for _, _, r in episodes[-10:]] or [0.0]
    print(
        f"episodes: {len(episodes)} | grad_steps: {grad_steps} | final mean reward (last 10): {np.mean(recent):.1f}",
        flush=True,
    )
    print(
        "saved model_final.pt (end of training) and model_best.pt (best trailing episode mean) | "
        f"if the final policy degraded, evaluate with --model {out / 'model_best.pt'}",
        flush=True,
    )
    return model_path
