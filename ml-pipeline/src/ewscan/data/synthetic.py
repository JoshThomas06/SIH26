from __future__ import annotations

import numpy as np

from ewscan.config import SpectrumConfig, TimeConfig
from ewscan.data.loader import PDW


def make_synthetic_pdw(
    seed: int = 0,
    n_bands: int = 100,
    n_slots: int = 10000,
    slot_us: float = 1000.0,
    n_emitters: int = 8,
    train_id: str = "synthetic",
) -> PDW:
    rng = np.random.default_rng(seed)
    duration_us = n_slots * slot_us
    toa_all, cf_all, pw_all, aoa_all, amp_all, label_all = [], [], [], [], [], []
    for eid in range(n_emitters):
        kind = rng.choice(["fixed", "hopping", "spatial_scan"])
        pri_us = float(rng.uniform(100.0, 5000.0))
        duty = float(rng.uniform(0.2, 1.0))
        start_us = float(rng.uniform(0.0, duration_us * (1.0 - duty)))
        span_us = duty * duration_us
        n_pulses = max(int(span_us / pri_us), 1)
        toa = start_us + np.arange(n_pulses) * pri_us + rng.uniform(0, pri_us * 0.1, n_pulses)
        toa = toa[toa < duration_us]
        if kind == "fixed":
            band = int(rng.integers(n_bands))
            cf = np.full(len(toa), (band + 0.5) * 18000.0 / n_bands)
        elif kind == "hopping":
            hops = rng.integers(2, 5)
            bands = rng.choice(n_bands, size=hops, replace=False)
            cf = np.array([(bands[i % hops] + 0.5) * 18000.0 / n_bands for i in range(len(toa))])
        else:
            band = int(rng.integers(n_bands))
            cf = np.full(len(toa), (band + 0.5) * 18000.0 / n_bands)
        aoa = (
            180.0 * np.sin(2 * np.pi * toa / max(span_us, 1.0) + rng.uniform(0, 2 * np.pi))
            if kind == "spatial_scan"
            else np.full(len(toa), rng.uniform(0, 360))
        )
        toa_all.append(toa)
        cf_all.append(cf)
        pw_all.append(rng.uniform(0.5, 50.0, len(toa)))
        aoa_all.append(aoa)
        amp_all.append(rng.uniform(-20.0, 10.0, len(toa)) + rng.normal(0, 1.0, len(toa)))
        label_all.append(np.full(len(toa), eid, dtype=np.int64))
    if toa_all:
        toa = np.concatenate(toa_all)
        cf = np.concatenate(cf_all)
        pw = np.concatenate(pw_all)
        aoa = np.concatenate(aoa_all)
        amp = np.concatenate(amp_all)
        labels = np.concatenate(label_all)
    else:
        empty = np.zeros(0)
        toa = cf = pw = aoa = amp = empty
        labels = np.zeros(0, dtype=np.int64)
    order = np.argsort(toa, kind="stable")
    return PDW(
        toa_us=toa[order],
        cf_mhz=cf[order],
        pw_us=pw[order],
        aoa_deg=aoa[order],
        amp_db=amp[order],
        labels=labels[order],
        train_id=train_id,
    )


def make_synthetic_grid(
    seed: int = 0,
    n_bands: int = 100,
    n_slots: int = 10000,
    slot_us: float = 1000.0,
    n_emitters: int = 8,
    train_id: str | None = None,
):
    from ewscan.data.occupancy import build_grid

    pdw = make_synthetic_pdw(
        seed=seed,
        n_bands=n_bands,
        n_slots=n_slots,
        slot_us=slot_us,
        n_emitters=n_emitters,
        train_id=train_id or f"synthetic_{seed}",
    )
    spectrum = SpectrumConfig(f_min_mhz=0.0, f_max_mhz=18000.0, n_bands=n_bands)
    time = TimeConfig(episode_duration_s=n_slots * slot_us / 1e6, slot_us=slot_us)
    return build_grid(pdw, spectrum, time)
