from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from ewscan.data.occupancy import EpisodeGrid
from ewscan.metrics.metrics import EpisodeLog


def occupancy_heatmap(grid: EpisodeGrid, path: str | Path, max_slots: int = 2000) -> Path:
    occ = grid.occupancy[:, : min(max_slots, grid.n_slots)].astype(np.float32)
    fig, ax = plt.subplots(figsize=(12, 5))
    ax.imshow(occ.T, aspect="auto", origin="lower", interpolation="nearest", cmap="viridis")
    ax.set_xlabel("time slot")
    ax.set_ylabel("band")
    ax.set_title(f"occupancy: {grid.train_id} ({grid.n_emitters} emitters)")
    fig.tight_layout()
    path = Path(path)
    fig.savefig(path, dpi=150)
    plt.close(fig)
    return path


def trajectory(log: EpisodeLog, path: str | Path) -> Path:
    fig, ax = plt.subplots(figsize=(12, 4))
    t = np.arange(log.n_slots)
    ax.scatter(t, log.band, s=1.5, c="0.6", label="tuned band")
    hits = log.hit
    ax.scatter(t[hits], log.band[hits], s=8, c="tab:red", label="intercept")
    fas = log.false_alarm
    if fas.any():
        ax.scatter(t[fas], log.band[fas], s=8, c="tab:orange", marker="x", label="false alarm")
    ax.set_xlabel("time slot")
    ax.set_ylabel("band")
    ax.set_title(f"scan trajectory: {log.train_id}")
    ax.legend(loc="upper right", markerscale=3)
    fig.tight_layout()
    path = Path(path)
    fig.savefig(path, dpi=150)
    plt.close(fig)
    return path


def metric_bars(summary: pd.DataFrame, path: str | Path) -> Path:
    metrics = [
        "interception_ratio",
        "avg_intercept_time_slots",
        "pd",
        "pct_correct_predictions",
        "avg_reward",
        "pfa",
    ]
    metrics = [m for m in metrics if m in summary.columns]
    fig, axes = plt.subplots(1, len(metrics), figsize=(3.2 * len(metrics), 3.6))
    if len(metrics) == 1:
        axes = [axes]
    for ax, m in zip(axes, metrics):
        vals = summary[m].astype(float)
        ax.bar(range(len(vals)), vals.values)
        ax.set_xticks(range(len(vals)))
        ax.set_xticklabels(summary.index, rotation=45, ha="right", fontsize=8)
        ax.set_title(m, fontsize=10)
    fig.tight_layout()
    path = Path(path)
    fig.savefig(path, dpi=150)
    plt.close(fig)
    return path


def intercept_hist(all_logs: dict[str, list[EpisodeLog]], path: str | Path) -> Path:
    fig, ax = plt.subplots(figsize=(8, 4.5))
    for name, logs in all_logs.items():
        times = [v for log in logs for v in log.first_intercept.values()]
        if times:
            ax.hist(times, bins=40, alpha=0.5, label=name, density=True)
    ax.set_xlabel("first intercept slot")
    ax.set_ylabel("density")
    ax.set_title("time to first intercept per emitter")
    ax.legend()
    fig.tight_layout()
    path = Path(path)
    fig.savefig(path, dpi=150)
    plt.close(fig)
    return path


def surrogate_scatter(y: np.ndarray, pred: np.ndarray, path: str | Path, title: str) -> Path:
    fig, ax = plt.subplots(figsize=(5.5, 5.5))
    ax.scatter(y, pred, s=14, alpha=0.6)
    lims = [min(y.min(), pred.min()), max(y.max(), pred.max())]
    ax.plot(lims, lims, "k--", lw=1)
    ax.set_xlabel("actual first-intercept slot")
    ax.set_ylabel("predicted")
    ax.set_title(f"intercept-time surrogate: {title}")
    fig.tight_layout()
    path = Path(path)
    fig.savefig(path, dpi=150)
    plt.close(fig)
    return path


def learning_curve(monitor_files: list[str | Path], path: str | Path, window: int = 20) -> Path:
    fig, ax = plt.subplots(figsize=(8, 4.5))
    for mf in monitor_files:
        df = pd.read_csv(mf, comment="#")
        r = df["r"].rolling(window, min_periods=1).mean()
        ax.plot(df["l"], r, label=Path(mf).name)
    ax.set_xlabel("timesteps")
    ax.set_ylabel("episode reward (rolling mean)")
    ax.set_title("learning curve")
    ax.legend()
    fig.tight_layout()
    path = Path(path)
    fig.savefig(path, dpi=150)
    plt.close(fig)
    return path
