# ml-pipeline — Smart Scan Strategy for Electronic Warfare

ML-based Electronic Support (ES) receiver scheduler (SIH26). A scanning receiver with a narrow
instantaneous bandwidth must decide **which frequency band to tune to at every time slot**
(a 2-D search over frequency × time) to minimise intercept time and maximise interception
rate, compared against open-loop sweep strategies.

Trained and evaluated on the [Turing Synthetic Radar Dataset (TSRD)](https://huggingface.co/datasets/alan-turing-institute/turing-synthetic-radar-dataset)
(PDW pulse trains: ToA, CF, PW, AoA, Amplitude, with ground-truth emitter labels).

## Architecture

```
src/ewscan/
├── config.py            # pydantic configs (spectrum, time, receiver, reward, obs, train)
├── data/
│   ├── download.py      # gated HF download (scan-mode subset via allow_patterns)
│   ├── loader.py        # PDW loading from TSRD .h5 files
│   ├── occupancy.py     # band × time-slot occupancy grids + per-emitter statistics
│   ├── cache.py         # grid cache builder / loader
│   └── synthetic.py     # synthetic RF environments (no dataset needed)
├── env/
│   └── rf_env.py        # Gymnasium POMDP: receiver model + RF environment
├── scheduler/
│   ├── baselines.py     # round-robin (open loop), random, UCB bandit, greedy oracle
│   └── rl.py            # SB3 policy wrapper
├── train/
│   ├── dqn_torch.py     # custom DQN with parameter-shared per-band Q network (default)
│   └── train.py         # training dispatch (dqn | ppo via SB3)
├── eval/
│   ├── evaluate.py      # strategy runner + comparison tables
│   ├── periodic.py      # periodic-emitter analysis + optimal EDF revisit scheduling
│   └── surrogate.py     # intercept-time surrogate regression (avg intercept-time error)
├── metrics/metrics.py   # Pd, Pfa, interception ratio, intercept times, reward, ...
├── viz/plots.py         # heatmaps, trajectories, learning curves, comparisons
└── cli.py               # `ewscan` command line interface
```

## Problem formulation

- **Environment**: the spectrum (0–18 GHz) is split into `n_bands` channels (default 100 × 180 MHz);
  time is discretised into slots (default 1 ms over the 10 s pulse train → 10 000 slots).
  From labelled PDWs we build the **truth grid** `occupancy[band, slot]` (transmission /
  non-transmission per band per slot) plus per-pulse amplitude records.
- **Receiver**: tunes to one band per slot. Switching bands costs `tuning_time_slots` of
  blindness; detection per slot is governed by a sensitivity threshold (amplitude dB) and
  detection/false-alarm probabilities. This models the "sensitivity high, instantaneous
  bandwidth an order lower than system bandwidth" constraint.
- **Agent (scheduler)**: observes only *its own* history (per-band hit ages, visit ages,
  EMA hit-rate, recent-hit counts, current band, remaining time) — a POMDP. Action = next
  band. Reward = hit (+ emitter-priority weighting and a first-intercept bonus per emitter),
  minus tuning/step costs. This is literally "trained on hits and misses".
- **DQN architecture**: a standard flat Q-head (obs → n_actions) fails to generalise across
  100 bands. The default agent (`train/dqn_torch.py`) uses a parameter-shared per-band Q
  network — the same sub-network scores each band from its own 4 features plus episode
  context — so every transition trains the Q-values of *all* bands simultaneously. This is
  what makes the DQN converge on the 100-band action space.

## Figures of merit (per problem statement)

| Metric | Definition |
|---|---|
| Probability of detection (Pd) | truth pulses detected / truth pulses in the tuned band during detecting slots |
| Probability of false alarm (Pfa) | false alarms / quiet detecting slots |
| Sensitivity | minimum detected-pulse amplitude (dB) |
| Avg intercept rate | emitters intercepted / episode duration (s⁻¹) |
| Interception ratio | emitters intercepted / emitters present |
| Avg intercept time | mean slot of first intercept per intercepted emitter (slots & ms) |
| % correct predictions | detecting slots where the tuned band was actually active |
| Avg reward / cost | accumulated environment reward per episode |
| Avg intercept-time error | MAE of the surrogate intercept-time regressor (`surrogate` command) |

## Setup (uv)

```bash
# install uv (https://docs.astral.sh/uv/) then:
uv sync                 # creates .venv with Python 3.12
cp .env.example .env    # put your HF token in HF_TOKEN=...
```

The dataset is **gated**: accept the conditions on the HF dataset page and use a token with
read access. `HF_TOKEN` (or `HUGGING_FACE_TOKEN`) is read from `.env`.

## Pipeline (real data)

```bash
uv run ewscan download --splits validation,test --train-files 60   # scan-mode subset
uv run ewscan build-grids                                          # band×slot truth grids
uv run ewscan train --timesteps 500000                             # DQN on train split
uv run ewscan evaluate --episodes 25                               # RL vs baselines on test
uv run ewscan periodic                                             # periodic-emitter EDF analysis
uv run ewscan surrogate                                            # intercept-time model + error
uv run ewscan report                                               # learning curve
```

## Pipeline (no dataset — synthetic smoke run)

```bash
uv run ewscan synthetic-grids --cache-dir data/cache-synth
uv run ewscan train    --cache-dir data/cache-synth --timesteps 300000   # ~8 min on RTX 3080 Ti
uv run ewscan evaluate --cache-dir data/cache-synth --episodes 4
```

Verified smoke-run results (synthetic grids, 8 emitters/episode):

| strategy | reward | interception ratio | Pd | % correct predictions |
|---|---|---|---|---|
| round_robin | 271 | **1.00** | 1.0 | 0.03 |
| random | −490 | 0.28 | 1.0 | 0.02 |
| ucb | 7779 | 0.47 | 1.0 | 0.66 |
| **rl (DQN)** | **8223** | 0.34 | 1.0 | 0.73 |
| oracle (upper bound) | 9729 | 0.50 | 1.0 | 0.82 |

RL learns to sit on productive bands (reward-oriented objective, beating UCB); round-robin
maximises emitter coverage at the cost of intercept time — the classic EW trade-off the
scheduler is meant to manage. More training data/steps shifts RL toward the oracle bound.

All outputs (CSV tables, JSON summaries, PNG plots, per-episode logs) go to `outputs/`.

## Colab / Kaggle GPU training

The repo is self-contained; on Colab:

```python
!git clone <your-repo> && cd ml-pipeline
!pip install uv && uv sync
!uv run ewscan synthetic-grids ...   # or upload the cached grids
!uv run ewscan train --timesteps 1000000
```

Copy `data/cache` (a few GB) and `outputs/rl/model_final.zip` back, or train fully on synthetic
grids for the demo.

## Design notes & caveats

- **Scan-mode truth bias**: TSRD scan-mode pulses are what the TSRD sweep receiver captured —
  every marked (band, slot) is a true transmission, but missed transmissions are invisible.
  Truth grids are therefore a lower bound on activity. The pipeline is mode-agnostic: pass
  `--mode stare` to `download`/`build-grids` to build oracle grids instead (stare covers the
  full spectrum and shares the same transmitter configurations).
- **Emitter identity**: TSRD emitter labels are per-pulse-train only, which is fine here —
  every episode is an independent environment.
- **Periodic-emitter interception**: for an emitter with pulse interval PRI and a receiver
  dwelling `d` slots per visit every `R` slots, P(intercept | visit) ≈ 1 − exp(−d·slot/PRI)
  and E[intercept time] ≈ R/p + d/2. `periodic.py` solves for the required revisit per
  emitter to meet a target intercept time and runs an earliest-deadline-first (EDF)
  revisit scheduler; `--strategies edf_periodic` also plugs it into `evaluate`.
- **Spatially scanning emitters** (AoA modulation) are characterised in the per-emitter
  statistics (`aoa_range_deg`) and included in the surrogate features; frequency scheduling
  is unaffected since the receiver's frequency dimension is what we schedule.

## Citation

TSRD: Gunn et al., "The Turing Synthetic Radar Dataset: A dataset for pulse deinterleaving",
arXiv:2602.03856, 2026.
