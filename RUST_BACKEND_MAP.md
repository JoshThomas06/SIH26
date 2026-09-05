# FastAPI → Rust (Axum) conversion map

`origin/main` replaced `backend/app/**/*.py` with a **behaviour-compatible** Axum service (`aegis-backend`). The live **josh-prototype** demo still uses FastAPI on port **8010**. The Rust tree is copied here as **`backend-rust/`** so this branch can compile and test the port **without deleting** the Python backend.

JSON contracts (`/api/v1/*`, `/ws/telemetry`) are intended to stay interchangeable with `frontend/src/lib/auth.ts` and `useTelemetrySocket.ts`.

The conversion is a **line-of-business port**, not a rewrite of the scheduler science. Dual-agent Eager + Revisit, HIGH bands **3 / 7 / 12**, AoI **850 ms**, ε = **0.10**, FoM reset + emulator scramble on Initiate — all of that exists in both trees.

---

## Stack

| Concern | josh-prototype (Python) | main / `backend-rust` |
|---|---|---|
| HTTP | FastAPI `APIRouter` | Axum 0.7 `Router` |
| Async runtime | uvicorn + asyncio loop | Tokio |
| WebSocket | `app/api/websocket.py` | `src/api/websocket.rs` |
| CORS | FastAPI CORS middleware (localhost:5173) | `tower-http` CorsLayer (`Any` origin + methods) |
| Auth | HMAC-SHA256 hex + urlsafe b64 in `auth.py` | `hmac` + `sha2` + `URL_SAFE_NO_PAD` in `api/auth.rs` |
| Config | Pydantic `Settings` + env | `src/config.rs` + `dotenv` |
| State | process-global `runtime` / `archive` | `Arc<RwLock<SimulationRuntime>>` (archive **inside** runtime) |
| Bind | 127.0.0.1:**8010** | **0.0.0.0:10000** (deploy / Kaggle-style) |
| Logs | print / uvicorn | `tracing` + 5 s simulation heartbeat |
| Users | module-level `_users` dict | `AuthState.users` HashMap (same seed user) |

Crate: `aegis-backend` (`Cargo.toml`). Extra deps vs Python: `uuid`, `rand`, `hex`, `futures`.

---

## File-for-file

| Python | Rust | Notes |
|---|---|---|
| `backend/main.py` (`lifespan` + `runtime.run_loop`) | `src/main.rs` | Spawns the tick loop; registers routes; `GET /` JSON `{name, problem}` |
| `app/api/router.py` | `src/api/routes.rs` | Same paths (see below) |
| `app/api/auth.py` | `src/api/auth.rs` | Bearer decode; register/login JSON |
| `app/api/websocket.py` | `src/api/websocket.rs` | `/ws/telemetry` |
| `app/core/config.py` | `src/config.rs` | `num_bands`, AoI, sweep, spawn, noise, sim_speed, epsilon |
| `app/core/runtime.py` | `src/core/runtime.rs` | Tick, FoM, start/pause/reset, configure, typed `TelemetryPayload` |
| `app/core/scheduler_engine.py` | `src/core/scheduler.rs` | MANUAL / OPEN_LOOP / SMART_SCAN_MARL, Eager, Revisit, ε-greedy, ignore set |
| `app/core/archive.py` | `src/core/archive.rs` | Run cards, flags, heuristic summaries |
| `app/data/emulator.py` | `src/data/emulator.rs` | Sticky occupancy + PDWs; HIGH bands 3, 7, 12; `scramble()` |
| (no crate root) | `src/lib.rs`, `src/api/mod.rs`, `src/core/mod.rs`, `src/data/mod.rs` | `AppState` |

---

## Function-for-function (scheduler + runtime)

These are the methods that must stay aligned when you experiment on **this** branch.

### `SmartScanMoEScheduler`

| Python | Rust | Behaviour |
|---|---|---|
| `__init__` | `new(settings)` | 16 bands, eager 0.7 / revisit 0.3, AoI decay 1.5, min dwell 6, ε from settings |
| `configure(...)` | `configure(...)` | mode, weights, AoI floor 200 ms, ignore/unignore, ε clamp [0, 0.4] |
| `mark_fresh` | `mark_fresh` | zero AoI, reset dwell hold (used on Initiate) |
| `reset` | `reset` | full scheduler reset including ignore set |
| `_eligible` | `_eligible` | not in ignored |
| `_next_linear` | `_next_linear` | next non-ignored band |
| `evaluate_step(occupancy, now)` | `evaluate_step(&[bool], Option<f64>)` | returns selected_band, agent, rationale, aoi_states, priority, hop_penalty, ignored |

Decision order in SMART_SCAN_MARL (identical):

1. Revisit if max AoI ≥ threshold.
2. Else ε-greedy uniform among eligible.
3. Else Eager on occupied (HIGH-threat subset preferred), score = occupancy + priority × AoI^1.5 / 1000.
4. Else sequential hop.
5. Min-dwell HOLD so the operator can read the scope.

### `SimulationRuntime`

| Python | Rust |
|---|---|
| `__init__` | `new(settings)` |
| `_empty_payload` | `empty_payload_static` |
| `reset` / `_reset_fom` | `reset` / `_reset_fom` |
| `start` (FoM reset + scramble + mark_fresh + archive.start) | same |
| `pause` (archive.close) | same + tracing |
| `configure` | `configure` (positional Options; logs changed fields) |
| `_window_rates` (last 32 ticks) | `_window_rates` |
| `_metrics` (`pd`, `pfa`, `pd_window`, `pfa_window`, Δt, reward, hits, misses) | `Metrics` struct, same keys via serde |
| `tick` | `tick` → `TelemetryPayload` |

### `RFEmulator`

| Python | Rust |
|---|---|
| `HIGH_THREAT_BANDS = {3,7,12}` | `HIGH_THREAT_BANDS: &[usize] = &[3, 7, 12]` |
| `scramble` | `scramble` |
| `step` → truths, PDWs, onsets | same tuple |

### Auth

| Python | Rust |
|---|---|
| `_sign` / `issue_token` / `decode_token` | `sign` / `issue_token` / `decode_token` |
| `register` / `login` | same, seed user `operator@aegis.local` / `aegis` |

---

## HTTP / WS routes

| Method | Path | Python | Rust |
|---|---|---|---|
| GET | `/` | (none on FastAPI app root) | `root` → `{name, problem: SIH 26055}` |
| POST | `/api/v1/auth/register` | `auth.register` | `routes::register` |
| POST | `/api/v1/auth/login` | `auth.login` | `routes::login` |
| POST | `/api/v1/scheduler/config` | `update_config` | `update_config` |
| POST | `/api/v1/simulation/{action}` | `simulation_command` | `simulation_command` (`start`/`pause`/`reset`) |
| GET | `/api/v1/sessions` | `list_sessions` | `list_sessions` |
| GET | `/api/v1/sessions/current` | dedicated route | `get_session` when `session_id == "current"` |
| GET | `/api/v1/sessions/{id}` | `get_session` | `get_session` |
| GET | `/api/v1/health` | `health` | `health` (`aegis-ew-scheduler`) |
| GET | `/api/v1/telemetry` | **unauthenticated** | **unauthenticated** |
| WS | `/ws/telemetry` | `telemetry_socket` | `telemetry_socket` |

---

## Behaviour that must stay aligned

- **16 bands**, HIGH threat indices **3, 7, 12**, AoI latch **850 ms**, default **ε = 0.10**.
- Scheduler decision record consumed by Zustand `ingestPayload`.
- `GET /api/v1/telemetry` remains unauthenticated (WS fallback). Mutating routes still require Bearer.
- Initiate: `_reset_fom` + `emulator.scramble` + `scheduler.mark_fresh`.

---

## Deltas to know before A/B testing

These are **not** SIH-logic changes; they bite if you point the existing Vite app at :10000.

1. **Tokens are not interchangeable.** Python signs `json.dumps(..., separators=(",", ":"))` and encodes with **padded** urlsafe b64. Rust uses `serde_json::json!(...).to_string()` (may include spaces) and **`URL_SAFE_NO_PAD`**. Log in again after switching backends.
2. **CORS.** Python allow-list is localhost:5173. Rust on main allows **any origin** and also lists `https://sih.innosolve.in` in `Settings` defaults (the CorsLayer itself is `Any`, so the list is unused).
3. **`min_dwell_ticks`.** Python: `max(2, int(280 / sweep_ms))`. Rust: `(280.0 / sweep_ms) as i32` with **no floor of 2**. At large `sweep_ms` dwell can become 0.
4. **HOLD hop_penalty.** Python zeroes `hop_penalty` when min-dwell forces HOLD. Rust keeps the pre-HOLD value. Reward can differ by `0.4 * hop`.
5. **Archive ownership.** Python: module-global `archive`. Rust: `runtime.archive`. Same JSON shape.
6. **Tick loop when paused.** Rust still wakes, sets `running=false` and refreshes `timestamp_us`. Python `run_loop` skips `tick` work similarly.

None of these should be “fixed” by overwriting FastAPI. If you A/B test, patch **`backend-rust/`** on this branch.

---

## How to run Rust beside Python (josh-prototype)

```bash
cd backend-rust
cargo run --release
# listens on 0.0.0.0:10000
```

Point Vite proxy at 10000 **only in a local experiment** — do not change the default 8010 proxy on this branch unless you are A/B testing. Python remains:

```bash
cd backend
python -m uvicorn main:app --reload --port 8010 --host 127.0.0.1
```

---

## What was *not* ported into the request path

The **DQN / TSRD pipeline** stays Python (`ml-pipeline/`). Rust is the **operator sim + API**, not the trainer. That split is intentional: Gym + PyTorch on Kaggle GPUs; Axum for a single-binary deploy of the C2 backend.

Main’s **landing-page frontend** (large video/assets, `sih.innosolve.in`) was **not** copied onto josh-prototype. The tactical Scan UI on this branch is ahead of that landing page for the SIH demo.
