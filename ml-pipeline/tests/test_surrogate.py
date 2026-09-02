from __future__ import annotations

import numpy as np

from ewscan.config import EnvConfig, ReceiverConfig, SpectrumConfig, TimeConfig
from ewscan.data.loader import PDW
from ewscan.data.occupancy import build_grid
from ewscan.eval.surrogate import build_dataset, fit_ridge, kfold_mae, predict_ridge


def _two_emitter_grid():
    toa = np.arange(0, 50000, 1000, dtype=float)
    pdw = PDW(
        toa_us=np.concatenate([toa, toa]),
        cf_mhz=np.concatenate([np.full(len(toa), 2700.0), np.full(len(toa), 6300.0)]),
        pw_us=np.full(2 * len(toa), 10.0),
        aoa_deg=np.zeros(2 * len(toa)),
        amp_db=np.concatenate([np.full(len(toa), -10.0), np.full(len(toa), -5.0)]),
        labels=np.concatenate(
            [np.zeros(len(toa), dtype=np.int64), np.ones(len(toa), dtype=np.int64)]
        ),
        train_id="surr",
    )
    return build_grid(
        pdw, SpectrumConfig(n_bands=10), TimeConfig(episode_duration_s=0.05, slot_us=1000.0)
    )


def test_surrogate_pipeline():
    from ewscan.eval.evaluate import evaluate_strategy

    grid = _two_emitter_grid()
    config = EnvConfig(
        spectrum=SpectrumConfig(n_bands=10),
        time=TimeConfig(episode_duration_s=0.05, slot_us=1000.0),
        receiver=ReceiverConfig(tuning_time_slots=0),
    )
    logs = evaluate_strategy("round_robin", [grid], config, episodes=1, dwell_slots=10)
    X, y, eids = build_dataset([(logs[0], grid)])
    assert len(y) == 2
    model = fit_ridge(X, y)
    pred = predict_ridge(model, X)
    assert np.all(np.isfinite(pred))
    mae = kfold_mae(X, y, k=2)
    assert np.isfinite(mae)
