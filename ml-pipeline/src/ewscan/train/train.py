from __future__ import annotations

import json
from pathlib import Path

from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import EvalCallback
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv

from ewscan.config import EnvConfig, TrainConfig
from ewscan.env.rf_env import RFScanEnv
from ewscan.train.dqn_torch import train_dqn


def train_rl(config: EnvConfig, tc: TrainConfig) -> Path:
    if tc.algo == "dqn":
        return train_dqn(config, tc)
    return _train_sb3_ppo(config, tc)


def _make_env(config: EnvConfig, split: str, seed: int, rank: int, monitor_dir: Path | None = None):
    def _init():
        env = RFScanEnv(config, split=split, shuffle=True, seed=seed + rank)
        monitor_path = str(monitor_dir / f"monitor_{rank}.csv") if monitor_dir else None
        return Monitor(env, filename=monitor_path)

    return _init


def _train_sb3_ppo(config: EnvConfig, tc: TrainConfig) -> Path:
    out = Path(tc.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    vec = DummyVecEnv(
        [_make_env(config, tc.train_split, tc.seed, r, monitor_dir=out) for r in range(tc.n_envs)]
    )
    model = PPO(
        "MlpPolicy",
        vec,
        learning_rate=tc.learning_rate,
        batch_size=tc.batch_size,
        gamma=tc.gamma,
        seed=tc.seed,
        verbose=1,
        device=tc.device,
    )
    callbacks = []
    eval_split_dir = Path(config.cache_dir) / tc.eval_split
    if tc.eval_split and eval_split_dir.exists():
        eval_vec = DummyVecEnv([_make_env(config, tc.eval_split, tc.seed + 1000, 0)])
        callbacks.append(
            EvalCallback(
                eval_vec,
                eval_freq=max(tc.eval_freq // tc.n_envs, 1),
                n_eval_episodes=tc.n_eval_episodes,
                best_model_save_path=str(out / "best"),
                deterministic=True,
            )
        )
    model.learn(total_timesteps=tc.total_timesteps, callback=callbacks or None)
    model.save(out / "model_final")
    (out / "train_config.json").write_text(
        json.dumps(
            {
                "env": json.loads(config.model_dump_json()),
                "train": json.loads(tc.model_dump_json()),
            },
            indent=2,
        )
    )
    vec.close()
    return out / "model_final.zip"
