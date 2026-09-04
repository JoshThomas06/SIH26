from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import h5py
import numpy as np

DEFAULT_FEATURE_ORDER = ("toa_us", "cf_mhz", "pw_us", "aoa_deg", "amp_db")


@dataclass
class PDW:
    toa_us: np.ndarray
    cf_mhz: np.ndarray
    pw_us: np.ndarray
    aoa_deg: np.ndarray
    amp_db: np.ndarray
    labels: np.ndarray
    train_id: str

    @property
    def n_pulses(self) -> int:
        return int(len(self.toa_us))


def _find_feature_names(group: h5py.Group) -> list[str] | None:
    if "feature_names" in group.attrs:
        values = np.atleast_1d(group.attrs["feature_names"])
        return [v.decode() if isinstance(v, bytes) else str(v) for v in values]
    if "feature_names" in group and isinstance(group["feature_names"], h5py.Dataset):
        values = np.atleast_1d(group["feature_names"][()])
        return [v.decode() if isinstance(v, bytes) else str(v) for v in values]
    for key in group:
        item = group[key]
        if isinstance(item, h5py.Group):
            found = _find_feature_names(item)
            if found:
                return found
    return None


def _match_columns(names: list[str]) -> dict[str, int] | None:
    mapping: dict[str, int] = {}
    for i, raw in enumerate(names):
        n = raw.lower()
        if "toa" in n or "time" in n:
            mapping.setdefault("toa_us", i)
        elif "freq" in n or n == "cf":
            mapping.setdefault("cf_mhz", i)
        elif "width" in n or n == "pw":
            mapping.setdefault("pw_us", i)
        elif "aoa" in n or "angle" in n:
            mapping.setdefault("aoa_deg", i)
        elif "amp" in n or "power" in n:
            mapping.setdefault("amp_db", i)
    if len(mapping) < 5:
        return None
    return mapping


def load_pdw(path: str | Path, train_id: str | None = None) -> PDW:
    path = Path(path)
    train_id = train_id or path.stem
    with h5py.File(path, "r") as f:
        data = np.asarray(f["data"][:], dtype=np.float64)
        if "labels" in f:
            labels = np.asarray(f["labels"][:]).reshape(-1).astype(np.int64)
        else:
            labels = None
        names = _find_feature_names(f["metadata"]) if "metadata" in f else None
    if data.ndim != 2 or data.shape[1] < 5:
        raise ValueError(f"{path}: expected data shaped (N, >=5), got {data.shape}")
    if labels is None:
        labels = np.zeros(len(data), dtype=np.int64)
    cols: dict[str, int] | None = _match_columns(names) if names else None
    if cols is None:
        idx = {name: i for i, name in enumerate(DEFAULT_FEATURE_ORDER)}
    else:
        idx = cols
    return PDW(
        toa_us=data[:, idx["toa_us"]],
        cf_mhz=data[:, idx["cf_mhz"]],
        pw_us=data[:, idx["pw_us"]],
        aoa_deg=data[:, idx["aoa_deg"]],
        amp_db=data[:, idx["amp_db"]],
        labels=labels,
        train_id=train_id,
    )


def save_pdw(pdw: PDW, path: str | Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    data = np.stack([pdw.toa_us, pdw.cf_mhz, pdw.pw_us, pdw.aoa_deg, pdw.amp_db], axis=1)
    with h5py.File(path, "w") as f:
        f.create_dataset("data", data=data.astype(np.float32), compression="gzip")
        f.create_dataset("labels", data=pdw.labels.astype(np.int8), compression="gzip")
        meta = f.create_group("metadata")
        meta.attrs["feature_names"] = np.array(list(DEFAULT_FEATURE_ORDER), dtype="S")
