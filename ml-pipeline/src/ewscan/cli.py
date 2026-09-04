from __future__ import annotations

import json
from pathlib import Path

import typer

from ewscan.config import EnvConfig, ReceiverConfig, SpectrumConfig, TimeConfig, TrainConfig

app = typer.Typer(no_args_is_help=True, add_completion=False)


def _env_config(
    n_bands: int,
    slot_us: float,
    f_min: float,
    f_max: float,
    tuning_time_slots: int,
    sensitivity_db: float | None,
    p_false_alarm: float,
    cache_dir: str,
    split: str,
) -> EnvConfig:
    return EnvConfig(
        spectrum=SpectrumConfig(f_min_mhz=f_min, f_max_mhz=f_max, n_bands=n_bands),
        time=TimeConfig(slot_us=slot_us),
        receiver=ReceiverConfig(
            tuning_time_slots=tuning_time_slots,
            sensitivity_db=sensitivity_db,
            p_false_alarm_per_slot=p_false_alarm,
        ),
        cache_dir=cache_dir,
        split=split,
    )


def _plot_eval_outputs(eval_dir: Path, cache_dir: Path, split: str) -> None:
    import pandas as pd

    from ewscan.data.cache import load_split
    from ewscan.metrics.metrics import EpisodeLog
    from ewscan.viz.plots import intercept_hist, metric_bars, occupancy_heatmap, trajectory

    summary = pd.read_csv(eval_dir / "summary.csv", index_col=0)
    metric_bars(summary, eval_dir / "metrics_comparison.png")
    all_logs = {}
    for strat_dir in sorted(p for p in (eval_dir / "logs").glob("*") if p.is_dir()):
        logs = [EpisodeLog.load(p) for p in sorted(strat_dir.glob("ep*.npz"))]
        all_logs[strat_dir.name] = logs
        if logs:
            trajectory(logs[0], strat_dir.parent.parent / f"trajectory_{strat_dir.name}.png")
    if all_logs:
        intercept_hist(all_logs, eval_dir / "intercept_time_hist.png")
    grids = load_split(cache_dir, split, max_grids=1)
    if grids:
        occupancy_heatmap(grids[0], eval_dir / "occupancy_example.png")


@app.command()
def download(
    mode: str = typer.Option("scan", help="receiver mode: scan or stare"),
    splits: str = typer.Option("validation,test", help="comma-separated splits to download"),
    train_files: int = typer.Option(0, help="if >0, download only first N train files"),
    data_dir: Path = typer.Option(Path("data/raw")),
    max_workers: int = typer.Option(4),
) -> None:
    """Download the gated TSRD dataset from Hugging Face (requires HF_TOKEN)."""
    from ewscan.data.download import download_subset

    split_tuple = tuple(s.strip() for s in splits.split(",") if s.strip())
    download_subset(
        data_dir=data_dir,
        mode=mode,
        splits=split_tuple,
        train_files=train_files,
        max_workers=max_workers,
    )
    typer.echo(f"done: {data_dir}")


@app.command()
def build_grids(
    data_dir: Path = typer.Option(Path("data/raw")),
    cache_dir: Path = typer.Option(Path("data/cache")),
    mode: str = typer.Option("scan"),
    splits: str = typer.Option("train,validation,test"),
    n_bands: int = typer.Option(100),
    slot_us: float = typer.Option(1000.0),
    f_min: float = typer.Option(0.0),
    f_max: float = typer.Option(18000.0),
    force: bool = typer.Option(False),
) -> None:
    """Build band x slot occupancy grids from downloaded h5 pulse trains."""
    from ewscan.data.cache import build_cache

    split_tuple = tuple(s.strip() for s in splits.split(",") if s.strip())
    spectrum = SpectrumConfig(f_min_mhz=f_min, f_max_mhz=f_max, n_bands=n_bands)
    time = TimeConfig(slot_us=slot_us)
    paths = build_cache(
        data_dir, cache_dir, spectrum, time, mode=mode, splits=split_tuple, force=force
    )
    for split, ps in paths.items():
        typer.echo(f"{split}: {len(ps)} grids")


@app.command()
def synthetic_grids(
    cache_dir: Path = typer.Option(Path("data/cache-synth")),
    n_train: int = typer.Option(16),
    n_val: int = typer.Option(4),
    n_test: int = typer.Option(4),
    n_bands: int = typer.Option(100),
    slot_us: float = typer.Option(1000.0),
    n_emitters: int = typer.Option(8),
    seed: int = typer.Option(0),
) -> None:
    """Build synthetic occupancy grids (no dataset needed; smoke tests / demos)."""
    from ewscan.data.synthetic import make_synthetic_grid

    counts = {"train": n_train, "validation": n_val, "test": n_test}
    offset = 0
    for split, n in counts.items():
        for i in range(n):
            grid = make_synthetic_grid(
                seed=seed + offset,
                n_bands=n_bands,
                n_slots=int(round(10.0 * 1e6 / slot_us)),
                slot_us=slot_us,
                n_emitters=n_emitters,
                train_id=f"{split}_synth_{i}",
            )
            grid.save(Path(cache_dir) / split / f"{split}_synth_{i}.npz")
            offset += 1
    typer.echo(f"synthetic grids written to {cache_dir}")


@app.command()
def train(
    cache_dir: Path = typer.Option(Path("data/cache")),
    train_split: str = typer.Option("train"),
    eval_split: str = typer.Option("validation"),
    algo: str = typer.Option("dqn"),
    timesteps: int = typer.Option(300_000),
    n_envs: int = typer.Option(4),
    n_bands: int = typer.Option(100),
    slot_us: float = typer.Option(1000.0),
    tuning_time_slots: int = typer.Option(1),
    sensitivity_db: float | None = typer.Option(None),
    p_false_alarm: float = typer.Option(0.0),
    new_emitter_bonus: float = typer.Option(3.0),
    cost_tune: float = typer.Option(0.02),
    shaping_weight: float = typer.Option(0.3),
    n_actors: int = typer.Option(0, help="parallel collector threads; 0 = one per GPU (max 4)"),
    device: str = typer.Option("auto", help="auto | cuda | cuda:0 | cpu"),
    seed: int = typer.Option(0),
    out_dir: Path = typer.Option(Path("outputs/rl")),
) -> None:
    """Train the RL scan scheduler (DQN/PPO) on occupancy grids."""
    from ewscan.train import train_rl

    config = _env_config(
        n_bands,
        slot_us,
        0.0,
        18000.0,
        tuning_time_slots,
        sensitivity_db,
        p_false_alarm,
        str(cache_dir),
        train_split,
    )
    config.reward.new_emitter_bonus = new_emitter_bonus
    config.reward.cost_tune = cost_tune
    config.reward.shaping_weight = shaping_weight
    tc = TrainConfig(
        algo=algo,
        total_timesteps=timesteps,
        n_envs=n_envs,
        n_actors=n_actors,
        device=device,
        seed=seed,
        train_split=train_split,
        eval_split=eval_split,
        out_dir=str(out_dir),
    )
    path = train_rl(config, tc)
    typer.echo(f"model saved: {path}")


@app.command()
def evaluate(
    model: Path = typer.Option(Path("outputs/rl/model_final.pt")),
    cache_dir: Path = typer.Option(Path("data/cache")),
    split: str = typer.Option("test"),
    strategies: str = typer.Option("round_robin,random,ucb,oracle,rl"),
    episodes: int = typer.Option(25),
    n_bands: int = typer.Option(100),
    slot_us: float = typer.Option(1000.0),
    tuning_time_slots: int = typer.Option(1),
    sensitivity_db: float | None = typer.Option(None),
    p_false_alarm: float = typer.Option(0.0),
    new_emitter_bonus: float = typer.Option(3.0),
    cost_tune: float = typer.Option(0.02),
    shaping_weight: float = typer.Option(0.3),
    dwell_slots: int = typer.Option(10),
    seed: int = typer.Option(0),
    out_dir: Path = typer.Option(Path("outputs/eval")),
) -> None:
    """Compare scan strategies on the chosen split; writes CSV/JSON/PNG outputs."""
    from ewscan.eval.evaluate import compare

    strategy_tuple = tuple(s.strip() for s in strategies.split(",") if s.strip())
    config = _env_config(
        n_bands,
        slot_us,
        0.0,
        18000.0,
        tuning_time_slots,
        sensitivity_db,
        p_false_alarm,
        str(cache_dir),
        split,
    )
    config.reward.new_emitter_bonus = new_emitter_bonus
    config.reward.cost_tune = cost_tune
    config.reward.shaping_weight = shaping_weight
    summary, per_episode = compare(
        config,
        split=split,
        strategies=strategy_tuple,
        model_path=model if (model.exists() and "rl" in strategy_tuple) else None,
        out_dir=out_dir,
        episodes=episodes,
        seed=seed,
        dwell_slots=dwell_slots,
    )
    _plot_eval_outputs(Path(out_dir), Path(cache_dir), split)
    typer.echo(summary.to_string())


@app.command()
def periodic(
    cache_dir: Path = typer.Option(Path("data/cache")),
    split: str = typer.Option("test"),
    episodes: int = typer.Option(10),
    n_bands: int = typer.Option(100),
    slot_us: float = typer.Option(1000.0),
    dwell_slots: int = typer.Option(10),
    target_intercept_slots: float = typer.Option(500.0),
    out_dir: Path = typer.Option(Path("outputs/periodic")),
) -> None:
    """Analyze + optimally schedule against periodic emitters (EDF strategy)."""
    from ewscan.data.cache import load_split
    from ewscan.eval.evaluate import evaluate_strategy
    from ewscan.metrics.metrics import episode_metrics
    from ewscan.viz.plots import trajectory

    grids = load_split(cache_dir, split)
    config = _env_config(n_bands, slot_us, 0.0, 18000.0, 1, None, 0.0, str(cache_dir), split)
    out_dir.mkdir(parents=True, exist_ok=True)
    env_grids = grids[: max(episodes, 1)]
    logs = evaluate_strategy(
        "edf_periodic",
        env_grids,
        config,
        episodes=episodes,
        dwell_slots=dwell_slots,
    )
    rows = []
    for i, log in enumerate(logs):
        row = episode_metrics(log)
        grid = env_grids[i]
        row["periodic_emitters"] = len(
            __import__("ewscan.eval.periodic", fromlist=["periodic_emitters"]).periodic_emitters(
                grid
            )
        )
        rows.append(row)
        trajectory(log, out_dir / f"trajectory_edf_ep{i}.png")
    import pandas as pd

    df = pd.DataFrame(rows)
    df.to_csv(out_dir / "periodic_eval.csv", index=False)
    typer.echo(df.mean(numeric_only=True).to_string())


@app.command()
def surrogate(
    cache_dir: Path = typer.Option(Path("data/cache")),
    eval_dir: Path = typer.Option(Path("outputs/eval")),
    out_dir: Path = typer.Option(Path("outputs/surrogate")),
) -> None:
    """Fit intercept-time surrogate models from evaluation logs (avg intercept-time error)."""
    from ewscan.eval.surrogate import run_surrogate

    results = run_surrogate(cache_dir, eval_dir, out_dir)
    typer.echo(
        json.dumps(
            {k: {kk: vv for kk, vv in v.items() if kk != "model"} for k, v in results.items()},
            indent=2,
        )
    )


@app.command()
def report(
    out_dir: Path = typer.Option(Path("outputs/rl")),
) -> None:
    """Plot learning curves from a training run."""
    from ewscan.viz.plots import learning_curve

    monitors = sorted(Path(out_dir).glob("monitor*.csv"))
    if not monitors:
        typer.echo("no monitor files found")
        raise typer.Exit(1)
    learning_curve(monitors, Path(out_dir) / "learning_curve.png")
    typer.echo(f"saved {Path(out_dir) / 'learning_curve.png'}")


def main() -> None:
    app()


if __name__ == "__main__":
    main()
