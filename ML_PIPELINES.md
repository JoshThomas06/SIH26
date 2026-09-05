# AEGIS ML pipelines — generic approach vs what was actually tried

This is the research companion to the **josh-prototype** operator console. The live Scan UI still runs a **16-band dual-agent heuristic** (Eager + Revisit) inside FastAPI. On `origin/main` the same *control problem* was formulated as a Gymnasium **POMDP** and trained against **Turing Synthetic Radar Dataset (TSRD)** pulse trains. That stack now lives on this branch as `ml-pipeline/` so it can be run and extended **without replacing** the Python demo backend.

**Kaggle inspection notebook (team reference):** [RadarDataset inspection](https://www.kaggle.com/code/aarymilindkinge/radardataset-inspection) (Aary Milind Kinge, v2). Official dataset paper: Gunn et al., *The Turing Synthetic Radar Dataset*, [arXiv:2602.03856](https://arxiv.org/abs/2602.03856). Hugging Face (gated): [`alan-turing-institute/turing-synthetic-radar-dataset`](https://huggingface.co/datasets/alan-turing-institute/turing-synthetic-radar-dataset).

---

## 1. The problem (generic EW scan scheduling)

An electronic-support receiver cannot stare at **0.5–18 GHz** at once. Instantaneous bandwidth (IBW) is a **slice**. Time is a sequence of **slots**. At each slot the scheduler picks **one band**. That is a 2-D search over frequency × time.

| Quantity | Generic formulation | josh-prototype demo | `ml-pipeline` (from main) |
|---|---|---|---|
| Spectrum | \(N\) hops covering the envelope | **16 × 500 MHz** (SIH 26055) | Default **100 × 180 MHz** (TSRD-scale; configurable) |
| Time | discrete dwells | `sweep_ms` ticks (20–500 ms) | 1 ms slots over 10 s pulse trains (10 000 slots) |
| Truth | occupancy \(o_{b,t}\) | sticky Markov emulator | PDW → band/slot grid from `.h5` (or synthetic grids) |
| Observation | usually partial | full emulator occupancy leaked into Eager | **POMDP**: visit/hit ages, EMA hit-rate, recent hits, current band, time |
| Action | next band | MANUAL / OPEN_LOOP / SMART_SCAN_MARL | discrete \(N\) |
| Objective | Pd ↑, Pfa ↓, intercept lag ↓ | FoM in HUD + archive | same names + interception ratio, intercept rate, % correct, reward |

**Generic approaches people reach for first**

1. **Open-loop / round-robin** — walk bands \(1 \ldots N\). Maximum coverage, worst intercept time against agile / low-duty emitters.
2. **Random explore** — sanity baseline; almost never competitive.
3. **Index policies / bandits (UCB, ε-greedy)** — treat each band as an arm with unknown hit probability. Cheap, myopic, no long-horizon intercept planning.
4. **Analytic revisit (EDF / AoI)** — if PRI is known and stable, set a revisit period so P(intercept) meets a deadline.
5. **RL (DQN, PPO, MARL)** — learn \(\pi(a \mid s)\) from hits/misses when the world is jittered, hopping, or only partially observed.
6. **Oracle / lookahead** — cheat with future occupancy; upper bound, not deployable.

AEGIS tried **all six** in software. The operator demo uses (1) + (3-lite) + (4-lite) as a **readable mixture of experts**. The ML package uses (1)–(6) with numbers on TSRD.

---

## 2. Data: from PDWs to occupancy grids

### 2.1 What a PDW is

Each pulse is a **Pulse Descriptor Word**. TSRD stores a five-dimensional vector plus an emitter label (train-time only):

| Field | Unit | Role in this pipeline |
|---|---|---|
| Time of Arrival | µs | slot index, PRI / `pri_cv` |
| Centre Frequency | MHz | band index |
| Pulse Width | µs | emitter fingerprint (stats, not used by the Q-net) |
| Angle of Arrival | deg | spatial-scan characterisation (`aoa_range_deg`) |
| Amplitude | dB | sensitivity gate, priority mode `amplitude` |

TSRD provides **scan** and **stare** receiver modes. Scan mode is the honest analogue of the hardware constraint: the *dataset itself* was collected by a 500 MHz IBW sweep, so unmarked (band, slot) cells are **not** guaranteed idle — they are a **lower bound** on activity. Stare mode sees the full envelope (oracle-ish grids). `ewscan download --mode scan|stare` selects which.

Scale (from the paper / HF card): ~6 000 pulse trains, up to ~90 emitters per train, ~4 billion pulses, gated HF access.

### 2.2 What the Kaggle notebook actually does

The live notebook is a Kaggle SPA; cell source is not downloadable without a Kaggle session. Version 2 (Python, ~6 min runtime) was inspected in-browser. The table of contents and the first cells are:

1. **Hugging Face login** via `kaggle_secrets.UserSecretsClient` → secret `HF_TOKEN` → `huggingface_hub.login`. Same token the CLI reads from `.env` / `HF_TOKEN` / `HUGGING_FACE_TOKEN`.
2. **Dataset configuration probe** — `datasets.get_dataset_config_names` and `load_dataset_builder` to list scan/stare splits before downloading blobs.
3. **Extraction of nested ground-truth** — unpack transmitter / emitter metadata from the nested TSRD structure (the paper’s per-train labels).
4. **Separate the numerical pulse array** — isolate the \((N, 5)\) PDW matrix (ToA, CF, PW, AoA, Amp) from labels. This is exactly `ewscan.data.loader.load_pdw`: read `data`, optional `labels`, map `metadata/feature_names` (or the default column order).
5. **TSRD processing** — per-emitter statistics and occupancy construction. Implemented in `occupancy.build_grid` / `EMITTER_STAT_NAMES`.
6. **Visualize spectrum occupancy** — the heatmap of band × slot activity. The pipeline’s equivalent is `ewscan.viz.plots.occupancy_heatmap` written during `ewscan evaluate`.

Those statistics feed:

- **periodic / EDF** (`pri_cv < 0.3` ⇒ treat as clock-like)
- **surrogate intercept-time regression** (PRI, agility, duty, visit share, …)
- **reward priority** modes: uniform / amplitude / agility (`cf_std_mhz`)

If the notebook (or `pri_cv` on scan-mode grids) shows **high PRI jitter**, agile hops, and overlapping CF, you should **not** expect analytic EDF to beat RL. That is the measured TSRD result: strict periodicity is rare in scan-mode captures (< 0.5 periodic emitters per episode).

### 2.3 Grid construction (`data/occupancy.py`)

```
band  = floor((cf_mhz - f_min) / band_width)
slot  = floor(toa_us / slot_us)
occupancy[band, slot] = True
```

Plus sparse pulse lists (sorted keys `band * n_slots + slot`), per-cell max amplitude, pulse counts, and per-emitter stats. Cached as compressed `.npz` (`ewscan build-grids`). Synthetic grids (`ewscan synthetic-grids`) skip Hugging Face for smoke tests.

**Per-emitter stats** (`EMITTER_STAT_NAMES`), computed in `build_grid`:

| Column | How it is computed |
|---|---|
| `n_pulses` | count |
| `cf_mean/std/min/max_mhz` | over that emitter’s pulses |
| `pw_mean_us`, `amp_mean_db` | means |
| `pri_median_us` | median of sorted ToA diffs |
| `pri_cv` | \(\sigma(\Delta t)/\mu(\Delta t)\) when ≥ 2 diffs |
| `aoa_range_deg` | max − min AoA |
| `first_toa_us`, `last_toa_us` | span |
| `n_bands_used` | unique band indices |

**Download:** gated HF snapshot via `huggingface_hub.snapshot_download` with `allow_patterns`. Scan-mode subset used for the reported run: `--splits validation,test --train-files 60` (560 pulse trains, ~1.1 GB).

**Synthetic emitters** (`data/synthetic.py`) mix three kinds — `fixed`, `hopping` (2–4 bands), `spatial_scan` (sinusoidal AoA) — with PRI 100–5000 µs. That is the smoke-test world, not TSRD.

---

## 3. Environment (`env/rf_env.py`) — Gymnasium POMDP

`RFScanEnv` is a `gymnasium.Env`. It is **not** the FastAPI emulator. The emulator is a 16-band Markov occupancy toy for the C2 UI. The Gym env is the scientific receiver model.

| Piece | Implementation |
|---|---|
| Action | `spaces.Discrete(n_bands)` |
| Observation | per band: hit age, visit age, EMA hit-rate, recent-hit count (all normalised); then 3 scalars: current band / (N−1), blind flag, episode progress. Dim = `n_bands × 4 + 3` |
| Tuning | switching bands sets `blind = tuning_time_slots` (receiver deaf during retune) |
| Detection | if truth-active and amplitude ≥ optional `sensitivity_db`, accept a hit with `p_detect`. Quiet slots can FA with `p_false_alarm_per_slot` |
| Reward | `cost_step` + hit (`reward_hit`) + **first-intercept bonus** (`new_emitter_bonus × priority weight`) − `cost_tune` + EMA shaping (`shaping_weight × ema[band]`) |
| Episode | truncated when `t >= n_slots` (never `terminated`) |

Priority weights (`EpisodeGrid.priority_weights`): `uniform`, `amplitude` (`amp_mean_db` min-max scaled to [0.5, 1.5]), or `agility` (`cf_std_mhz`).

**Default train knobs** (CLI `ewscan train`, matching the published TSRD run): `new_emitter_bonus=3.0`, `cost_tune=0.02`, `shaping_weight=0.3`.

This is “trained on hits and misses,” not on a black-box LLM.

---

## 4. Algorithms tried (and when each is the right tool)

All schedulers implement `scheduler/base.py`: `reset(ctx)`, optional `bind(env)`, `act(obs, info) → band`, optional `observe(info)`. Factory: `make_scheduler(name, ...)`.

### 4.1 Round-robin (`RoundRobinScheduler`) — generic open-loop

Dwell `dwell_slots` (default 10) then `(band + 1) % N`. **Maximises coverage**. On TSRD scan-mode test (25 episodes, ~33 emitters): interception ratio **0.288**, mean intercept time **7603** slots, % correct **0.006**. That is the SIH “baseline failure mode” the briefing cards describe.

**Maps to demo:** `OPEN_LOOP` in `backend/app/core/scheduler_engine.py` / `backend-rust/src/core/scheduler.rs`.

### 4.2 Random (`RandomScheduler`)

Uniform band. Ratio **0.020**, reward **−196**. Exists to prove the env is not accidentally solved by noise.

### 4.3 UCB1 bandit (`UCBScheduler`)

Per-band empirical hit rate + \(c \sqrt{\ln t / n_b}\) with \(c = 0.5\). Unplayed arms first. Updates only on non-blind slots. Myopic: no explicit AoI, no first-intercept planning.

TSRD: ratio **0.165**, % correct **0.008**, reward **88** — better than random, **worse coverage than round-robin**, better reward than round-robin because it parks on productive arms.

**Maps to demo:** ε-greedy explore (10%) is the *cheap* cousin; the demo does **not** run UCB.

### 4.4 Greedy oracle (`GreedyOracleScheduler`)

Looks ahead `horizon` slots (default 50) on the **truth grid** and picks \(\arg\max_b \sum occupancy[b, t:t+H]\). Upper bound. TSRD ratio **0.916**, % correct **0.277**, reward **3578**. Deployable systems never have this.

### 4.5 Earliest-deadline-first periodic (`EDFScheduler` in `eval/periodic.py`)

**Analytic, not learned.**

For PRI \(T\) and dwell \(d\) slots of length \(\Delta t\):

\[
\mathbb{P}(\text{intercept} \mid \text{visit}) \approx 1 - \exp\!\left(-\frac{d\,\Delta t}{T}\right)
\]

\[
\mathbb{E}[\text{intercept time}] \approx \frac{R}{p} + \frac{d}{2}
\]

Solve for revisit \(R\) to hit a target intercept time (default 500 slots); then EDF always serves the band with the nearest deadline. Non-periodic bands get `default_revisit_slots=200` so the spectrum is not abandoned. An emitter is “periodic” iff `pri_cv < 0.3`.

**Finding on TSRD scan-mode:** strict PRI periodicity is rare → EDF **collapses toward sweep**. Tests still validate the formulae on synthetic clock-like emitters.

**Maps to demo:** Revisit agent at **AoI ≥ 850 ms** is the same *idea* (anti-starvation) without needing PRI. AoI is the model-free version of EDF.

### 4.6 PPO (`train/train.py` + Stable-Baselines3)

`TrainConfig.algo = "ppo"`: `MlpPolicy` on a `DummyVecEnv` of `RFScanEnv`, optional `EvalCallback`. **Tried as the generic deep-RL default.** A flat MLP over 100-band observations does not share structure across bands, so PPO is the **fallback**, not the reported TSRD winner. Checkpoint is `model_final.zip` (SB3). Evaluation loads `.zip` via `PPO.load`.

### 4.7 Custom DQN (`train/dqn_torch.py`) — the algorithm that actually scaled

**Why not a flat Q-head?** `obs → n_actions` on 100 bands fails to generalise: each transition only trains one action’s Q.

**BandQNet (parameter-shared per-band Q):**

- Same MLP scores **each** band from its 4 local features → scalar score (`Linear(4,64) → ReLU → Linear(64,64) → ReLU → Linear(64,1)`).
- Context MLP on the 3 scalars (`Linear(3,64) → ReLU → Linear(64,64) → ReLU`).
- Head concatenates (score, context) → \(Q(s,b)\) for every \(b\) in one forward pass (`Linear(65,64) → ReLU → Linear(64,1)`).
- **One transition trains all bands.**

**Distributed actor/learner** (Kaggle 2× T4, multi-GPU; commit `d67a5e8` on main):

| Role | Where | What |
|---|---|---|
| Learner | main thread, `cuda:0` | sample replay, Smooth-L1 TD loss, Adam \(3 \times 10^{-4}\), grad clip 10, target net every 1000 grad steps, publish weights, checkpoints |
| Actors | ≤ 4 threads, one per GPU by default | ε-greedy (1.0 → 0.05 over `exploration_fraction=0.15` of steps), locked shared replay |

**Paced replay:** one gradient step per `train_freq` (default 4) env steps — an unpaced learner on Kaggle collapsed into a degenerate periodic sweep that intercepted nothing. `grad_steps` in `train_config.json` should read \((T - \texttt{learning_starts}) / \texttt{train_freq}\) regardless of actor count.

Saves `model_final.pt`, `model_best.pt` (best trailing-10 episode mean — commit `95b37c0`), `model_latest.pt`, `train_config.json`, `monitor.csv`. Evaluate with `--model outputs/rl/model_best.pt` if the final policy degraded.

**TD target:** \(r + \gamma \max_{a'} Q_{\text{target}}(s', a')\) with \(\gamma = 0.99\). Buffer 100k, batch 256, `learning_starts=5000`.

**TSRD scan-mode (800k steps, 60 train files, 25 test episodes):**

| strategy | interception ratio | avg intercept time (slots) | intercept rate / s | % correct | avg reward |
|---|---|---|---|---|---|
| random | 0.020 | 5528 | 0.08 | 0.006 | −196 |
| UCB | 0.165 | 5646 | 0.56 | 0.008 | 88 |
| round-robin | 0.288 | 7603 | 0.99 | 0.006 | 70 |
| **DQN (ours)** | **0.296** | **5851** | **1.09** | **0.037** | **410** |
| oracle | 0.916 | 4416 | 3.02 | 0.277 | 3578 |

DQN beats open-loop on ratio, rate, correctness, reward, and cuts mean intercept time by ~**23%** vs round-robin. Oracle shows remaining headroom (coverage scheduling).

**Synthetic smoke (8 emitters):** DQN reward **8223** vs UCB **7779** vs round-robin **271** (RR still wins *coverage* 1.00 — the classic EW trade-off).

Inference wrapper: `DQNPolicyScheduler` in `scheduler/rl.py` (`torch.load` `.pt` → `BandQNet` argmax).

### 4.8 Ridge surrogate (`eval/surrogate.py`) — not a scheduler

After evaluation, fit **standardised ridge** (\(\lambda=1\), intercept unregularised) from emitter + visit features → first-intercept slot. Features: PRI median, PRI CV, CF std, bands used, duty, amp mean, mean revisit, visit share. 5-fold MAE:

- Round-robin intercept time is **highly predictable** (MAE ≈ 732 slots) — it is a function of PRI and the sweep.
- Adaptive policies (UCB/RL) MAE ≈ 2000 slots — intercept time depends on the *policy’s own* priorities.

This is the problem-statement “average intercept-time error” **model**, not the live HUD `Δt`.

---

## 5. Figures of merit (`metrics/metrics.py`)

Computed from `EpisodeLog` (per-slot band, hit, FA, truth, detecting, first-intercept map):

| Metric | Definition in the ML package |
|---|---|
| **Pd** | detected pulses / opportunity pulses in the tuned band while detecting |
| **Pfa** | false alarms / quiet detecting slots |
| **Sensitivity floor** | min detected amplitude (dB) |
| **Interception ratio** | emitters with a first intercept / emitters present |
| **Avg intercept time** | mean first-intercept slot (and ms) |
| **Intercept rate** | intercepts / episode duration (s⁻¹) |
| **% correct predictions** | detecting slots whose tuned band was actually active |
| **Reward** | sum of env rewards |

**Demo vs science:** josh-prototype Pd is `hits / (hits + misses)` on the 16-band emulator (windowed over the last 32 ticks as `pd_window`); Pfa is noise-driven idle false alarms. Same *names*, different denominators. Do not paste TSRD table numbers onto the Scan HUD.

---

## 6. File-by-file map (`ml-pipeline/src/ewscan/`)

| File | Responsibility |
|---|---|
| `config.py` | Pydantic: spectrum, time, receiver, reward, obs, train (algo dqn\|ppo) |
| `cli.py` / `__main__.py` | Typer: `download`, `build-grids`, `synthetic-grids`, `train`, `evaluate`, `periodic`, `surrogate`, `report` |
| `data/download.py` | Gated HF snapshot; `HF_TOKEN` from `.env` or process env (Kaggle-friendly, commit `26cf12a`) |
| `data/loader.py` | `load_pdw` / `save_pdw` from `.h5` (`data`, `labels`, `metadata/feature_names`) |
| `data/occupancy.py` | `EpisodeGrid`, `build_grid`, emitter stats, priority weights |
| `data/cache.py` | Walk raw trees → `.npz` cache; `load_split` |
| `data/synthetic.py` | Fixed / hopping / spatial-scan PDWs without HF |
| `env/rf_env.py` | Gymnasium POMDP |
| `scheduler/base.py` | `Scheduler` ABC + `ScheduleContext` |
| `scheduler/baselines.py` | RR, random, UCB, oracle |
| `scheduler/rl.py` | SB3 predict wrapper + `DQNPolicyScheduler` |
| `train/dqn_torch.py` | BandQNet, ReplayBuffer, actor/learner loop |
| `train/train.py` | Dispatch dqn vs PPO |
| `eval/evaluate.py` | `run_episode`, `compare` → CSV/JSON/npz |
| `eval/periodic.py` | Poisson intercept maths + EDF |
| `eval/surrogate.py` | Ridge intercept-time model |
| `metrics/metrics.py` | `EpisodeLog` + FoM table |
| `viz/plots.py` | Heatmaps, trajectories, learning curves (Kaggle-robust, commit `b6ae12d`) |

Tests under `ml-pipeline/tests/`: occupancy, env, baselines, metrics, periodic, surrogate, DQN smoke (`test_train_dqn.py`). Run: `cd ml-pipeline && uv run pytest`.

---

## 7. How this relates to josh-prototype (do not collapse the two)

| Live demo (`backend/app`, 16 bands) | ML package (`ml-pipeline`, typically 100 bands) |
|---|---|
| FastAPI + in-process emulator | Offline Gym + TSRD / synthetic grids |
| Eager + Revisit MoE + ε-greedy | Learned DQN (or PPO) vs UCB / RR / EDF / oracle |
| Explainable string log per hop | `EpisodeLog` `.npz` + CSV summaries |
| Operator knobs: spawn, noise, sweep | Receiver `p_detect`, FA rate, tuning delay, reward weights |
| SIH pitch: readable C2 | SIH pitch: “we actually trained against PDW truth” |

**Intended next experiments on this branch (not main):**

1. Train DQN with `n_bands=16`, `band_width=500` MHz to match SIH physics, then **compare** Eager+Revisit vs the checkpoint on synthetic 16-band grids.
2. Distil the BandQNet into a lookup / priority table the FastAPI scheduler can call without PyTorch in the request path.
3. Keep Rust (`backend-rust/`) as a drop-in API twin for deploy, still talking JSON `/api/v1/*` and `/ws/telemetry`.

### 16-band recipe (test on josh-prototype)

```bash
cd ml-pipeline
uv run ewscan synthetic-grids --cache-dir data/cache-16 --n-bands 16 --n-emitters 8
uv run ewscan train --cache-dir data/cache-16 --n-bands 16 --timesteps 300000
uv run ewscan evaluate --cache-dir data/cache-16 --n-bands 16 --episodes 8
```

Do **not** put the PyTorch forward pass on the FastAPI hot path until a distilled table exists. The demo must stay explainable for the SIH pitch.

---

## 8. How to run the pipeline on josh-prototype

```bash
cd ml-pipeline
uv sync
cp .env.example .env   # HF_TOKEN=... if using TSRD

# no dataset
uv run ewscan synthetic-grids --cache-dir data/cache-synth
uv run ewscan train --cache-dir data/cache-synth --timesteps 300000
uv run ewscan evaluate --cache-dir data/cache-synth --episodes 4

# real TSRD (gated)
uv run ewscan download --splits validation,test --train-files 60
uv run ewscan build-grids
uv run ewscan train --timesteps 800000
uv run ewscan evaluate --episodes 25
uv run ewscan periodic
uv run ewscan surrogate
uv run ewscan report
```

If the final policy degraded: `uv run ewscan evaluate --model outputs/rl/model_best.pt`.

Kaggle / Colab: `ewscan train` auto-detects CUDA devices. Force ` --n-actors 2 --device cuda` on 2× T4. The `wrapt` sitecustomize error on Kaggle is benign.

---

## 9. Branch map (what lives where)

| Branch | Role |
|---|---|
| **josh-prototype** (this working copy) | Tactical UI, FastAPI 16-band demo, PDFs, threat/chatter widget. **Only branch we push.** |
| **origin/main** | Axum/Rust backend on **:10000**, landing-page frontend, **ml-pipeline** + Kaggle actor/learner |
| **origin/prototype** | Early HTML/CSS snapshot |
| **origin/Prototype2** | Separate Vite UI overhaul (waterfall, env knobs) |
| **origin/akr-landingpage** | Marketing / Vite landing |

Python FastAPI on josh-prototype remains the default `uvicorn` app on **8010**. Rust is vendored beside it as `backend-rust/` — see `RUST_BACKEND_MAP.md`. Cross-branch file comparison: `BRANCH_ANALYSIS.md`.
