# Branch analysis — what to take onto `josh-prototype`

Working copy: **`josh-prototype`**. Push **only** this branch. FastAPI on **:8010** stays the default demo. This note is the cross-branch inventory so new work can be tested here without merging `main`.

---

## Branch roles

| Branch | Tip (at analysis) | What it actually is |
|---|---|---|
| **josh-prototype** | `a258c9c` | Tactical C2: 16-band Eager+Revisit, ScanBoard, threat/chatter HUD, PDFs, FastAPI |
| **origin/main** | `95b37c0` | **Rust Axum backend :10000** + **ml-pipeline** + marketing-style frontend |
| **origin/prototype** | `f515e03` | Early static/CSS prototype (`bun`, `Styles.css`) — historical |
| **origin/Prototype2** | `3d192a4` | Separate Vite UI overhaul (waterfall, env knobs) that evolved into this demo |
| **origin/akr-landingpage** | `a753e16` | Marketing landing (hero video, avatars, animations) |

`origin/prototype` and `origin/akr-landingpage` do not contain the ML trainer or the Axum port. Do not merge them blindly; they would clobber the Scan UI.

---

## What was copied onto this branch (from `origin/main`)

| Tree | Destination | Why |
|---|---|---|
| `ml-pipeline/` | `ml-pipeline/` | Train/eval DQN vs RR/UCB/EDF/oracle on TSRD |
| `backend/` (Rust crate) | **`backend-rust/`** | Compile/test Axum **beside** FastAPI, not instead of it |

Python `backend/app/**/*.py` was **not** replaced. `git checkout origin/main -- backend` would have deleted the demo.

Landing-page frontend, `public/` videos, and `sih.innosolve.in` CORS-only deploy bits were **not** ported.

---

## FastAPI (`josh-prototype`) vs Rust (`main` → `backend-rust`)

Scheduler, emulator, telemetry JSON, auth seed user, Initiate FoM reset, windowed Pd/Pfa, HIGH bands 3/7/12: **same algorithm**. See `RUST_BACKEND_MAP.md` for the function table and the small interop deltas (token encoding, CORS, min-dwell floor).

**Frontend on this branch is the one to keep.** Main’s `frontend/` is a different product (landing). Prototype2 was an earlier UI overhaul; useful ideas from it (waterfall, env knobs) already live in `frontend/src/components/tactical/*` here.

---

## ML vs live demo (do not wire together yet)

| | FastAPI / Rust sim | `ml-pipeline` |
|---|---|---|
| Bands | 16 × 500 MHz | default 100 × 180 MHz |
| Truth | Markov emulator | TSRD PDW grids |
| Policy | Eager + Revisit + ε | BandQNet DQN (PPO fallback) |
| Hot path | no PyTorch | offline `ewscan train/evaluate` |

Safe experiments **on this branch**:

1. `ewscan synthetic-grids --n-bands 16` then train/evaluate vs the heuristic (see `ML_PIPELINES.md` §7).
2. `cargo run` in `backend-rust` with a **temporary** Vite proxy to :10000; log in again (tokens do not cross backends).
3. Distil Q-values to a priority table **later**; keep the explainable MoE string log for the pitch.

Unsafe: replacing `backend/` with Rust in-place, expanding to 32 bands, or merging main’s frontend.

---

## Main commits that matter (already in `ml-pipeline/` / `backend-rust/`)

| Commit | Meaning |
|---|---|
| `bb2b1b9` | ML pipeline added |
| `4595d7c` | Full pipeline results written into `ml-pipeline/README.md` |
| `b00b2e6` | Backend bind **10000**, CORS domain |
| `26cf12a` | `HF_TOKEN` from process env if `.env` missing (Kaggle) |
| `c1323d4` | Data files gitignore fix |
| `b6ae12d` | Plotting that does not crash on Kaggle |
| `d67a5e8` | Dual-GPU actor/learner |
| `95b37c0` | `model_best.pt` on trailing-10 reward; `train_config.json` sanity |

---

## josh-prototype files that have no twin on main

These are **ahead** of main and must not be lost in any future sync:

- `frontend/src/components/tactical/ScanBoard.tsx`
- `frontend/src/components/tactical/TacticalIntel.tsx`
- `frontend/src/lib/rfIntel.ts`, `frontend/src/store/useScanLayout.ts`
- Analytics / PDF / Learn / Profile pages and the threat/chatter HUD work in `a258c9c` / `a711fac`

If you pull from main, take **only** `ml-pipeline` and the Rust crate (as `backend-rust/`), never `frontend/` or `backend/` as a wholesale checkout.

---

## How to add a feature on this branch

1. Implement against **FastAPI** (`backend/app/...`) and the tactical UI.
2. If the same behaviour should exist in Axum, port the function into `backend-rust/src/...` using the tables in `RUST_BACKEND_MAP.md`, then `cargo run` on :10000.
3. If it is a **learned** policy, add it under `ml-pipeline/` and evaluate offline first.
4. Commit and `git push origin josh-prototype` only.
