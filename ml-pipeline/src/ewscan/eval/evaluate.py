from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from ewscan.config import EnvConfig
from ewscan.data.cache import load_split
from ewscan.data.occupancy import EpisodeGrid
from ewscan.env.rf_env import RFScanEnv
from ewscan.metrics.metrics import (
    EpisodeLog,
    episode_metrics,
    metrics_table,
)
from ewscan.scheduler import ScheduleContext, make_scheduler


def run_episode(env: RFScanEnv, scheduler) -> EpisodeLog:
    obs, info = env.reset()
    emitters_present = int(info["n_emitters"])
    train_id = str(info["train_id"])
    ctx = ScheduleContext(
        n_bands=env.n_bands,
        n_slots=env.n_slots,
        n_emitters=emitters_present,
        train_id=train_id,
    )
    scheduler.reset(ctx)
    scheduler.bind(env)
    T = env.n_slots
    band = np.zeros(T, dtype=np.int16)
    hit = np.zeros(T, dtype=bool)
    false_alarm = np.zeros(T, dtype=bool)
    truth_active = np.zeros(T, dtype=bool)
    detecting = np.zeros(T, dtype=bool)
    reward = np.zeros(T, dtype=np.float32)
    labels_acc: list[int] = []
    offsets = [0]
    first_intercept: dict[int, int] = {}
    opportunity = 0
    detected = 0
    amp_min: float | None = None
    sens = env.config.receiver.sensitivity_db
    t = 0
    while True:
        action = scheduler.act(obs, info)
        obs, r, terminated, truncated, info = env.step(action)
        scheduler.observe(info)
        slot = info["slot"]
        band[slot] = info["band"]
        hit[slot] = info["hit"]
        false_alarm[slot] = info["false_alarm"]
        truth_active[slot] = info["truth_active"]
        detecting[slot] = not info["blind"]
        reward[slot] = r
        if detecting[slot]:
            amps = np.asarray(info["pulse_amps"])
            opportunity += int(amps.size)
            if amps.size:
                if sens is None:
                    dmask = np.ones(amps.size, dtype=bool)
                else:
                    dmask = amps >= sens
                detected += int(dmask.sum())
                detected_amps = amps[dmask]
                if detected_amps.size:
                    m = float(detected_amps.min())
                    amp_min = m if amp_min is None else min(amp_min, m)
        for e in info["labels_hit"]:
            eid = int(e)
            labels_acc.append(eid)
            if eid not in first_intercept:
                first_intercept[eid] = slot
        offsets.append(len(labels_acc))
        t += 1
        if terminated or truncated:
            break
    return EpisodeLog(
        train_id=train_id,
        n_slots=t,
        slot_us=env.config.time.slot_us,
        emitters_present=emitters_present,
        band=band[:t],
        hit=hit[:t],
        false_alarm=false_alarm[:t],
        truth_active=truth_active[:t],
        detecting=detecting[:t],
        reward=reward[:t],
        slot_labels_offsets=np.array(offsets, dtype=np.int64),
        slot_labels=np.array(labels_acc, dtype=np.int64),
        opportunity_pulses=opportunity,
        detected_pulses=detected,
        detected_amp_min=amp_min,
        first_intercept=first_intercept,
    )


def evaluate_strategy(
    name: str,
    grids: list[EpisodeGrid],
    config: EnvConfig,
    model=None,
    episodes: int | None = None,
    seed: int = 0,
    dwell_slots: int = 10,
) -> list[EpisodeLog]:
    n = episodes if episodes is not None else len(grids)
    n = min(n, len(grids))
    env = RFScanEnv(config, grids=grids, shuffle=False, seed=seed)
    logs = []
    for i in range(n):
        sched = make_scheduler(name, model=model, seed=seed + i, dwell_slots=dwell_slots)
        logs.append(run_episode(env, sched))
    return logs


def load_rl_model(path: str | Path):
    from ewscan.scheduler.rl import DQNPolicyScheduler

    path = Path(path)
    if path.suffix == ".pt":
        return DQNPolicyScheduler(str(path))
    from stable_baselines3 import PPO

    return PPO.load(str(path))


def compare(
    config: EnvConfig,
    split: str = "test",
    strategies: tuple[str, ...] = ("round_robin", "random", "ucb", "oracle", "rl"),
    model_path: str | Path | None = None,
    out_dir: str | Path = "outputs/eval",
    episodes: int | None = None,
    seed: int = 0,
    dwell_slots: int = 10,
    max_grids: int | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    grids = load_split(config.cache_dir, split, max_grids=max_grids)
    if not grids:
        raise FileNotFoundError(f"no grids in {config.cache_dir}/{split}")
    model = load_rl_model(model_path) if "rl" in strategies and model_path else None
    all_rows: dict[str, list[dict]] = {}
    all_logs: dict[str, list[EpisodeLog]] = {}
    for name in strategies:
        logs = evaluate_strategy(
            name, grids, config, model=model, episodes=episodes, seed=seed, dwell_slots=dwell_slots
        )
        all_rows[name] = [episode_metrics(l) for l in logs]
        all_logs[name] = logs
        for i, l in enumerate(logs):
            l.save(out_dir / "logs" / name / f"ep{i}.npz")
    rows = []
    for name, rws in all_rows.items():
        for r in rws:
            rows.append({"strategy": name, **r})
    per_episode = pd.DataFrame(rows)
    summary = metrics_table(all_rows)
    per_episode.to_csv(out_dir / "per_episode.csv", index=False)
    summary.to_csv(out_dir / "summary.csv")
    with open(out_dir / "summary.json", "w") as f:
        json.dump(
            {k: v for k, v in summary.to_dict(orient="index").items()}, f, indent=2, default=str
        )
    return summary, per_episode
