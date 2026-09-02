from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
from torch import nn

from ewscan.config import EnvConfig, TrainConfig
from ewscan.env.rf_env import RFScanEnv

N_BAND_FEATURES = 4
N_SCALARS = 3


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

    def add(self, obs, action, reward, next_obs) -> None:
        i = self.pos
        self.obs[i] = obs
        self.next_obs[i] = next_obs
        self.actions[i] = action
        self.rewards[i] = reward
        self.pos = (self.pos + 1) % self.capacity
        self.size = min(self.size + 1, self.capacity)

    def sample(self, batch: int):
        idx = self.rng.integers(0, self.size, size=batch)
        return (
            self.obs[idx],
            self.actions[idx],
            self.rewards[idx],
            self.next_obs[idx],
        )


def _device(device: str) -> torch.device:
    if device == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return torch.device(device)


def train_dqn(config: EnvConfig, tc: TrainConfig) -> Path:
    out = Path(tc.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    dev = _device(tc.device)
    env = RFScanEnv(config, split=tc.train_split, shuffle=True, seed=tc.seed)
    obs_dim = env.observation_space.shape[0]
    rng = np.random.default_rng(tc.seed)
    net = BandQNet(config.spectrum.n_bands).to(dev)
    target = BandQNet(config.spectrum.n_bands).to(dev)
    target.load_state_dict(net.state_dict())
    opt = torch.optim.Adam(net.parameters(), lr=tc.learning_rate)
    buffer = ReplayBuffer(tc.buffer_size, obs_dim, rng)

    eps_start, eps_end = 1.0, 0.05
    explore_steps = max(tc.exploration_fraction * tc.total_timesteps, 1)
    grad_steps = 0
    episode_reward = 0.0
    episodes: list[tuple[int, float]] = []
    obs, _ = env.reset()
    monitor_rows: list[str] = ["r,l"]

    for step in range(1, tc.total_timesteps + 1):
        eps = max(eps_end, eps_start - (eps_start - eps_end) * step / explore_steps)
        if rng.random() < eps:
            action = int(rng.integers(config.spectrum.n_bands))
        else:
            with torch.no_grad():
                q = net(torch.as_tensor(obs[None], device=dev))
            action = int(q.argmax(dim=1).item())
        next_obs, reward, term, trunc, info = env.step(action)
        buffer.add(obs, action, reward, next_obs)
        episode_reward += reward
        obs = next_obs

        if buffer.size >= tc.learning_starts and step % tc.train_freq == 0:
            s_obs, s_act, s_rew, s_next = buffer.sample(tc.batch_size)
            t_obs = torch.as_tensor(s_obs, device=dev)
            t_next = torch.as_tensor(s_next, device=dev)
            with torch.no_grad():
                max_next = target(t_next).max(dim=1).values
                target_q = torch.as_tensor(s_rew, device=dev) + tc.gamma * max_next
            q_all = net(t_obs)
            q_sel = q_all.gather(1, torch.as_tensor(s_act, device=dev).view(-1, 1)).squeeze(1)
            loss = nn.functional.smooth_l1_loss(q_sel, target_q)
            opt.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(net.parameters(), 10.0)
            opt.step()
            grad_steps += 1
            if grad_steps % tc.target_update_interval == 0:
                target.load_state_dict(net.state_dict())

        if trunc or term:
            episodes.append((step, episode_reward))
            monitor_rows.append(f"{episode_reward},{step}")
            obs, _ = env.reset()
            episode_reward = 0.0

        if step % 50_000 == 0:
            recent = [r for _, r in episodes[-10:]] or [0.0]
            print(f"step {step}: eps={eps:.3f} mean_ep_reward(last10)={np.mean(recent):.1f}", flush=True)
            torch.save(
                {
                    "state_dict": net.state_dict(),
                    "n_bands": config.spectrum.n_bands,
                    "hidden": 64,
                    "config": json.loads(config.model_dump_json()),
                },
                out / "model_latest.pt",
            )

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
    (out / "monitor.csv").write_text("\n".join(monitor_rows))
    (out / "train_config.json").write_text(
        json.dumps(
            {
                "env": json.loads(config.model_dump_json()),
                "train": json.loads(tc.model_dump_json()),
            },
            indent=2,
        )
    )
    print(
        f"episodes: {len(episodes)} | final mean reward (last 10): {np.mean([r for _, r in episodes[-10:]]):.1f}"
    )
    return model_path
