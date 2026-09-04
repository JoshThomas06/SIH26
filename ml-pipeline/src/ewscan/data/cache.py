from __future__ import annotations

from pathlib import Path

from tqdm import tqdm

from ewscan.config import SpectrumConfig, TimeConfig
from ewscan.data.loader import load_pdw
from ewscan.data.occupancy import EpisodeGrid, build_grid

DATASET_ID = "alan-turing-institute/turing-synthetic-radar-dataset"
SPLITS = ("train", "validation", "test")
MODES = ("stare", "scan")


def repo_split_name(split: str) -> str:
    return "val" if split == "validation" else split


def h5_pattern(mode: str, split: str) -> str:
    return f"{mode}/{repo_split_name(split)}_{mode}/*.h5"


def discover_h5(data_dir: str | Path, mode: str = "scan", split: str = "train") -> list[Path]:
    return sorted(Path(data_dir).glob(h5_pattern(mode, split)))


def build_cache(
    data_dir: str | Path,
    cache_dir: str | Path,
    spectrum: SpectrumConfig,
    time: TimeConfig,
    mode: str = "scan",
    splits: tuple[str, ...] = SPLITS,
    force: bool = False,
) -> dict[str, list[Path]]:
    cache_dir = Path(cache_dir)
    out: dict[str, list[Path]] = {}
    for split in splits:
        files = discover_h5(data_dir, mode=mode, split=split)
        out[split] = []
        for path in tqdm(files, desc=f"grids:{split}"):
            dest = cache_dir / split / f"{path.stem}.npz"
            out[split].append(dest)
            if dest.exists() and not force:
                continue
            grid = build_grid(load_pdw(path), spectrum, time)
            grid.save(dest)
    return out


def load_split(
    cache_dir: str | Path, split: str, max_grids: int | None = None
) -> list[EpisodeGrid]:
    paths = sorted(Path(cache_dir).glob(f"{split}/*.npz"))
    if max_grids is not None:
        paths = paths[:max_grids]
    return [EpisodeGrid.load(p) for p in tqdm(paths, desc=f"load:{split}")]
