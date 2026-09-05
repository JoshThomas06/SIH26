from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from ewscan.config import SpectrumConfig, TimeConfig
from ewscan.data.loader import PDW

EMITTER_STAT_NAMES = (
    "n_pulses",
    "cf_mean_mhz",
    "cf_std_mhz",
    "cf_min_mhz",
    "cf_max_mhz",
    "pw_mean_us",
    "amp_mean_db",
    "pri_median_us",
    "pri_cv",
    "aoa_range_deg",
    "first_toa_us",
    "last_toa_us",
    "n_bands_used",
)


@dataclass
class EpisodeGrid:
    train_id: str
    n_bands: int
    n_slots: int
    band_width_mhz: float
    f_min_mhz: float
    slot_us: float
    occupancy: np.ndarray
    amp_max: np.ndarray
    pulse_counts: np.ndarray
    keys: np.ndarray
    labels: np.ndarray
    amps: np.ndarray
    emitter_ids: np.ndarray
    stats: np.ndarray

    def __post_init__(self) -> None:
        self._priority_cache: dict[str, np.ndarray] = {}

    @property
    def n_emitters(self) -> int:
        return int(len(self.emitter_ids))

    @property
    def n_pulses(self) -> int:
        return int(len(self.keys))

    def band_of(self, cf_mhz: float | np.ndarray) -> float | np.ndarray:
        return (cf_mhz - self.f_min_mhz) / self.band_width_mhz

    def active(self, band: int, slot: int) -> bool:
        return bool(self.occupancy[band, slot])

    def emitters_in(self, band: int, slot: int) -> tuple[np.ndarray, np.ndarray]:
        key = band * self.n_slots + slot
        lo = int(np.searchsorted(self.keys, key, side="left"))
        hi = int(np.searchsorted(self.keys, key, side="right"))
        return (
            np.atleast_1d(self.labels[lo:hi]),
            np.atleast_1d(self.amps[lo:hi]),
        )

    def emitter_stats(self, emitter_id: int) -> dict[str, float]:
        i = int(np.searchsorted(self.emitter_ids, emitter_id))
        return {name: float(self.stats[i, j]) for j, name in enumerate(EMITTER_STAT_NAMES)}

    def emitter_bands(self) -> dict[int, np.ndarray]:
        out: dict[int, np.ndarray] = {}
        for i, eid in enumerate(self.emitter_ids):
            mask = self.labels == eid
            out[int(eid)] = np.unique(self.keys[mask] // self.n_slots)
        return out

    def emitter_duty(self) -> np.ndarray:
        duty = np.zeros(len(self.emitter_ids), dtype=np.float64)
        for i, eid in enumerate(self.emitter_ids):
            mask = self.labels == eid
            duty[i] = np.unique(self.keys[mask]).size / self.n_slots
        return duty

    def priority_weights(self, mode: str) -> np.ndarray:
        if mode in self._priority_cache:
            return self._priority_cache[mode]
        n = len(self.emitter_ids)
        if mode == "uniform" or n == 0:
            w = np.ones(n, dtype=np.float64)
        else:
            stat = "cf_std_mhz" if mode == "agility" else "amp_mean_db"
            col = EMITTER_STAT_NAMES.index(stat)
            vals = self.stats[:, col].astype(np.float64)
            lo, hi = np.nanmin(vals), np.nanmax(vals)
            w = np.ones(n) if hi - lo < 1e-9 else 0.5 + 1.0 * (vals - lo) / (hi - lo)
        self._priority_cache[mode] = w
        return w

    def save(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        meta = json.dumps(
            {
                "train_id": self.train_id,
                "n_bands": self.n_bands,
                "n_slots": self.n_slots,
                "band_width_mhz": self.band_width_mhz,
                "f_min_mhz": self.f_min_mhz,
                "slot_us": self.slot_us,
            }
        )
        np.savez_compressed(
            path,
            occupancy=self.occupancy,
            amp_max=self.amp_max,
            pulse_counts=self.pulse_counts,
            keys=self.keys,
            labels=self.labels,
            amps=self.amps,
            emitter_ids=self.emitter_ids,
            stats=self.stats,
            meta_json=meta,
        )

    @staticmethod
    def load(path: str | Path) -> EpisodeGrid:
        with np.load(Path(path), allow_pickle=False) as z:
            meta = json.loads(str(z["meta_json"]))
            return EpisodeGrid(
                train_id=meta["train_id"],
                n_bands=int(meta["n_bands"]),
                n_slots=int(meta["n_slots"]),
                band_width_mhz=float(meta["band_width_mhz"]),
                f_min_mhz=float(meta["f_min_mhz"]),
                slot_us=float(meta["slot_us"]),
                occupancy=z["occupancy"],
                amp_max=z["amp_max"],
                pulse_counts=z["pulse_counts"],
                keys=z["keys"],
                labels=z["labels"],
                amps=z["amps"],
                emitter_ids=z["emitter_ids"],
                stats=z["stats"],
            )


def build_grid(pdw: PDW, spectrum: SpectrumConfig, time: TimeConfig) -> EpisodeGrid:
    n_bands = spectrum.n_bands
    n_slots = time.n_slots
    occupancy = np.zeros((n_bands, n_slots), dtype=bool)
    amp_max = np.full((n_bands, n_slots), -np.inf, dtype=np.float32)
    pulse_counts = np.zeros((n_bands, n_slots), dtype=np.int32)

    band = np.floor((pdw.cf_mhz - spectrum.f_min_mhz) / spectrum.band_width_mhz).astype(np.int64)
    slot = np.floor(pdw.toa_us / time.slot_us).astype(np.int64)
    valid = (band >= 0) & (band < n_bands) & (slot >= 0) & (slot < n_slots)
    band_v, slot_v = band[valid], slot[valid]
    amp_v = pdw.amp_db[valid].astype(np.float32)
    labels_v = pdw.labels[valid].astype(np.int64)
    toa_v = pdw.toa_us[valid]
    cf_v = pdw.cf_mhz[valid]
    pw_v = pdw.pw_us[valid]
    aoa_v = pdw.aoa_deg[valid]

    if band_v.size:
        occupancy[band_v, slot_v] = True
        np.maximum.at(amp_max, (band_v, slot_v), amp_v)
        np.add.at(pulse_counts, (band_v, slot_v), 1)
        keys = band_v * n_slots + slot_v
        order = np.argsort(keys, kind="stable")
        keys_sorted = keys[order]
        labels_sorted = labels_v[order]
        amps_sorted = amp_v[order]
    else:
        keys_sorted = np.zeros(0, dtype=np.int64)
        labels_sorted = np.zeros(0, dtype=np.int64)
        amps_sorted = np.zeros(0, dtype=np.float32)

    unique_ids = np.unique(labels_v) if labels_v.size else np.zeros(0, dtype=np.int64)
    stats = np.full((len(unique_ids), len(EMITTER_STAT_NAMES)), np.nan, dtype=np.float64)
    for i, eid in enumerate(unique_ids):
        m = labels_v == eid
        n = int(m.sum())
        toa_e = np.sort(toa_v[m])
        cf_e, pw_e, amp_e, aoa_e = cf_v[m], pw_v[m], amp_v[m], aoa_v[m]
        diffs = np.diff(toa_e)
        pri = float(np.median(diffs)) if diffs.size else np.nan
        if diffs.size > 1 and pri and pri > 0:
            pri_cv = float(np.std(diffs) / np.mean(diffs))
        else:
            pri_cv = np.nan
        stats[i] = (
            n,
            float(np.mean(cf_e)),
            float(np.std(cf_e)),
            float(np.min(cf_e)),
            float(np.max(cf_e)),
            float(np.mean(pw_e)),
            float(np.mean(amp_e)),
            pri,
            pri_cv,
            float(np.max(aoa_e) - np.min(aoa_e)),
            float(toa_e[0]),
            float(toa_e[-1]),
            int(np.unique(band_v[m]).size),
        )

    return EpisodeGrid(
        train_id=pdw.train_id,
        n_bands=n_bands,
        n_slots=n_slots,
        band_width_mhz=spectrum.band_width_mhz,
        f_min_mhz=spectrum.f_min_mhz,
        slot_us=time.slot_us,
        occupancy=occupancy,
        amp_max=amp_max,
        pulse_counts=pulse_counts,
        keys=keys_sorted,
        labels=labels_sorted,
        amps=amps_sorted,
        emitter_ids=unique_ids.astype(np.int64),
        stats=stats,
    )
