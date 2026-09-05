from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from ewscan.data.occupancy import EpisodeGrid
from ewscan.metrics.metrics import EpisodeLog

FEATURE_NAMES = (
    "pri_median_us",
    "pri_cv",
    "cf_std_mhz",
    "n_bands_used",
    "duty_frac",
    "amp_mean_db",
    "revisit_mean_slots",
    "visit_share",
)


def _revisit_stats(log: EpisodeLog, grid: EpisodeGrid, bands: np.ndarray) -> tuple[float, float]:
    visits = np.where(np.isin(log.band, bands) & log.detecting)[0]
    share = float(visits.size / max(log.n_slots, 1))
    if visits.size < 2:
        return float(log.n_slots), share
    return float(np.mean(np.diff(visits))), share


def build_dataset(
    pairs: list[tuple[EpisodeLog, EpisodeGrid]],
) -> tuple[np.ndarray, np.ndarray, list[int]]:
    X, y, eids = [], [], []
    for log, grid in pairs:
        bands_map = grid.emitter_bands()
        duty = grid.emitter_duty()
        id_to_idx = {int(e): i for i, e in enumerate(grid.emitter_ids)}
        for eid, slot in sorted(log.first_intercept.items()):
            if eid not in id_to_idx:
                continue
            i = id_to_idx[eid]
            st = grid.stats[i]
            pri = st[7] if np.isfinite(st[7]) else grid.n_slots * grid.slot_us
            pri_cv = st[8] if np.isfinite(st[8]) else 1.0
            revisit, share = _revisit_stats(log, grid, bands_map[eid])
            X.append([pri, pri_cv, st[3], st[12], duty[i], st[6], revisit, share])
            y.append(float(slot))
            eids.append(eid)
    return np.asarray(X, dtype=np.float64), np.asarray(y, dtype=np.float64), eids


def fit_ridge(X: np.ndarray, y: np.ndarray, lam: float = 1.0) -> dict:
    mu, sd = X.mean(axis=0), X.std(axis=0)
    sd[sd == 0] = 1.0
    Z = (X - mu) / sd
    A = np.hstack([Z, np.ones((len(Z), 1))])
    reg = np.eye(A.shape[1]) * lam
    reg[-1, -1] = 0.0
    w = np.linalg.solve(A.T @ A + reg, A.T @ y)
    return {
        "coef": w[:-1].tolist(),
        "intercept": float(w[-1]),
        "mean": mu.tolist(),
        "std": sd.tolist(),
    }


def predict_ridge(model: dict, X: np.ndarray) -> np.ndarray:
    Z = (X - np.asarray(model["mean"])) / np.asarray(model["std"])
    return Z @ np.asarray(model["coef"]) + model["intercept"]


def kfold_mae(X: np.ndarray, y: np.ndarray, k: int = 5, lam: float = 1.0, seed: int = 0) -> float:
    if len(y) < k:
        return float("nan")
    rng = np.random.default_rng(seed)
    perm = rng.permutation(len(y))
    folds = np.array_split(perm, k)
    maes = []
    for fold in folds:
        if len(fold) == 0:
            continue
        test = perm[fold]
        train = np.setdiff1d(perm, test)
        m = fit_ridge(X[train], y[train], lam=lam)
        pred = predict_ridge(m, X[test])
        maes.append(float(np.mean(np.abs(pred - y[test]))))
    return float(np.mean(maes)) if maes else float("nan")


def run_surrogate(
    cache_dir: str | Path,
    eval_dir: str | Path,
    out_dir: str | Path,
    lam: float = 1.0,
) -> dict:
    from ewscan.data.cache import load_split
    from ewscan.viz.plots import surrogate_scatter

    eval_dir = Path(eval_dir)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    grids_by_id = {}
    for split in ("train", "validation", "test"):
        for g in load_split(cache_dir, split):
            grids_by_id[g.train_id] = g
    results = {}
    for strategy_dir in sorted(p for p in eval_dir.glob("logs/*") if p.is_dir()):
        name = strategy_dir.name
        pairs = []
        for log_path in sorted(strategy_dir.glob("ep*.npz")):
            log = EpisodeLog.load(log_path)
            grid = grids_by_id.get(log.train_id)
            if grid is not None:
                pairs.append((log, grid))
        if not pairs:
            continue
        X, y, _ = build_dataset(pairs)
        if len(y) < 8:
            results[name] = {"n_samples": len(y), "mae_slots": None}
            continue
        model = fit_ridge(X, y, lam=lam)
        pred = predict_ridge(model, X)
        mae = kfold_mae(X, y, lam=lam)
        results[name] = {"n_samples": len(y), "mae_slots": mae, "model": model}
        surrogate_scatter(y, pred, out_dir / f"surrogate_{name}.png", name)
    with open(out_dir / "surrogate.json", "w") as f:
        json.dump(results, f, indent=2)
    return results
