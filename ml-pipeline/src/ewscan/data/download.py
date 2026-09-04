from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from huggingface_hub import HfApi, snapshot_download

from ewscan.data.cache import DATASET_ID, h5_pattern


def resolve_hf_token() -> str | None:
    load_dotenv()
    return os.getenv("HF_TOKEN") or os.getenv("HUGGING_FACE_TOKEN")


def list_split_files(
    mode: str = "scan", split: str = "train", token: str | None = None
) -> list[str]:
    api = HfApi(token=token)
    prefix = h5_pattern(mode, split).removesuffix("*.h5")
    files = [
        f for f in api.list_repo_files(DATASET_ID, repo_type="dataset") if f.startswith(prefix)
    ]
    return sorted(files)


def download_subset(
    data_dir: str | Path,
    mode: str = "scan",
    splits: tuple[str, ...] = ("validation", "test"),
    train_files: int = 0,
    token: str | None = None,
    max_workers: int = 4,
) -> Path:
    token = token or resolve_hf_token()
    data_dir = Path(data_dir)
    patterns: list[str] = []
    for split in splits:
        if split == "train":
            if train_files > 0:
                names = list_split_files(mode, "train", token=token)[:train_files]
                patterns.extend(names)
            else:
                patterns.append(h5_pattern(mode, "train"))
        else:
            patterns.append(h5_pattern(mode, split))
    snapshot_download(
        repo_id=DATASET_ID,
        repo_type="dataset",
        local_dir=data_dir,
        allow_patterns=patterns,
        token=token,
        max_workers=max_workers,
    )
    return data_dir
