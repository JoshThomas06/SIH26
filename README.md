# AEGIS EW-Scheduler — SIH 26055 Smart Scan

AEGIS is a dual-console prototype for **DRDO Smart India Hackathon 26055**: a **smart scan scheduler** for an electronic-support (ES) receiver that cannot stare at the whole microwave envelope at once.

This repository is a working operator demo, not a flight-cleared EW stack. The RF world is emulated. The scheduler is a **dual-agent heuristic** (Eager + Revisit) with epsilon-greedy exploration — a stand-in for later multi-agent reinforcement learning (MARL). The UI is a tactical C2 cell: briefing globe, live scan console, run archive, and operator handbook.

---

## 1. Problem statement

A typical ES receiver has a **narrow instantaneous bandwidth (IBW)** compared with the surveillance envelope **0.5–18 GHz**. Hardware therefore **hops** across sub-bands. In this prototype the envelope is sliced into **16 × 500 MHz** hops (the SIH model). An **open-loop sequential sweep** visits band 1, then 2, … then 16, forever.

That baseline fails against **agile / low-duty-cycle emitters**:

- A radar that hops or blinks can transmit **while the receiver is parked on another slice**.
- Channels that look quiet for a long time become **information-starved** (stale Age-of-Information).
- Operators need **figures of merit** (Pd, Pfa, intercept-time error) they can compare live, not a black-box “AI said so”.

**Smart Scan** is the proposed control policy: spend dwell time where energy and threat memory say it matters, but **force revisits** so no slice is abandoned, and allow a small random explore so the policy cannot tunnel-vision on known hot bands.

---

## 2. What this prototype demonstrates

| Capability | Where it lives |
| --- | --- |
| Open-loop vs Smart Scan vs manual lock | Scan console mode cards |
| Live Pd / Pfa / Δt / reward | Metrics HUD + Analytics |
| Explainable hop log (which agent won) | MoE terminal |
| Spectrum analyzer grid (lock / ignore) | Scan → Spectrum analyzer |
| CRT polar with sweep-paint and fade | Scan → CRT polar |
| Approx bearing + slant range from PDWs | Bearing panel |
| Env knobs (sweep ms, hostile spawn, noise) | Scan sliders + `.env` |
| India as ES origin on the globe | Briefing |
| Operator profile (gray light theme, type size) | Profile |
| Archived runs + PDF | Analytics |

Login (demo gate): `operator@aegis.local` / `aegis`

---

## 3. Theory of the solution

### 3.1 Instantaneous bandwidth and the hop graph

Let the surveillance band be partitioned into \(N = 16\) sub-bands with centres \(f_i = 500 + 500i\) MHz. At any tick the receiver is tuned to **exactly one** index \(k_t\). Occupancy \(o_{i,t} \in \{0,1\}\) is ground truth from the emulator (in a fielded system this would come from a channelized detector / PDW parser).

A **hit** is \(o_{k_t,t} = 1\). A **miss** is any tick where some other band is occupied and the tuner is elsewhere. **Pd** for a run is \(\mathrm{hits}/(\mathrm{hits}+\mathrm{misses})\). **Δt** is the delay from emitter onset on band \(i\) until the first dwell with \(k_t = i\).

### 3.2 Age of Information (AoI)

For every band not currently tuned,

\[
\mathrm{AoI}_i = \min\bigl(4000,\ (t - t_i^{\mathrm{last}})\cdot 1000\bigr)^{\gamma/1.5}
\]

with \(\gamma\) the AoI decay factor (default 1.5) and a **pre-emption threshold of 850 ms**. If \(\max_i \mathrm{AoI}_i \ge 850\,\mathrm{ms}\), the **Revisit agent** seizes the tuner. That is the anti-starvation constraint: even a brilliant “chase the radar” policy is not allowed to ignore a dark slice forever.

### 3.3 Mixture of experts (Eager + Revisit)

**Eager agent** (exploit):

- If the Revisit constraint is quiet and occupancy exists, pick a high-threat occupied band.
- Score mixes occupancy, threat memory (priority), and \(\mathrm{AoI}^{1.5}\) so a slightly stale hot band still wins.
- If nothing is occupied, step to the next **eligible** neighbour (linear hop).

**Revisit agent** (explore / hygiene): jump to the band with maximum AoI when the 850 ms latch trips.

**Epsilon-greedy (default 10%)**: with probability \(\varepsilon\), pick a uniform random **non-ignored** band. That is the SIMULATION_LOGIC “discover emitters outside known hot zones” term, adapted onto the existing 16-band SIH model rather than replacing Eager+Revisit.

**Ignore set**: operator-marked bands are removed from linear and smart candidate lists (human-in-the-loop, same idea as the 32-band reference sim, mapped to 16 hops).

**Lock / Manual**: `next = manual_band` until the operator leaves MANUAL mode.

### 3.4 Why this is a stand-in for MARL

A later MARL training loop would learn a policy \(\pi(a \mid s)\) over hop actions. Here the “policy” is an explicit mixture:

- exploit energy (Eager),
- constrained explore (Revisit + \(\varepsilon\)),
- operator override (Lock / Ignore).

The XAI log names the winning expert every hop so a judge can see **why** the tuner moved — something a raw neural policy usually cannot show in a three-minute demo.

### 3.5 Environment model (sticky occupancy)

Hostile activity is concentrated on demo HIGH bands **04 / 08 / 13** (0-indexed 3, 7, 12): periodic, agile, short-pulse. Occupancy uses **hold ticks** so emitters persist for many dwells (readable C2, not 1-frame flashes). `hostile_spawn` scales the probability those HIGH bands start a burst. `noise_floor` raises false occupancy on quiet slices. `sweep_ms` (20–500) is the tick period of the receiver loop.

PDWs carry ToA, centre frequency, pulse width, **AoA**, and amplitude. Compass octant is derived from AoA (0° = North). Slant-range kilometres are an **amplitude proxy** (stronger → closer), not a GPS fix — enough to brief “threat from the NW at ~12 km class” during the demo.

---

## 4. Technical architecture

```
Browser (Vite React, :5173)
  ├─ /login          mock HMAC session
  ├─ /               briefing globe + capability cards
  ├─ /scan           live C2  (alias /radar → /scan)
  ├─ /analytics      archived Initiate→Halt runs
  ├─ /learn          operator handbook
  └─ /profile        theme, type size, motion
        │  REST /api/v1/*   WS /ws/telemetry
        ▼
FastAPI (uvicorn :8010)
  ├─ RFEmulator          occupancy + PDWs
  ├─ SmartScanMoEScheduler
  ├─ SimulationRuntime   FoM accumulators, archive
  └─ Auth                demo bearer tokens
```

**Frontend:** React 19, Vite, Tailwind 4, Zustand, Recharts, d3 globe, canvas CRT/waterfall.

**Backend:** Python FastAPI. One asyncio loop sleeps `sweep_ms` (clamped 20–500 ms). Each tick: emulator step → scheduler evaluate → metrics → websocket payload.

Vite proxies `/api` and `/ws` to `127.0.0.1:8010`.

---

## 5. How the UI maps to the physics

### Scan views

1. **CRT polar (N-up)** — the rotating phosphor beam is a visual analogue of a search radar, **not** a second RF tuner. Intercepts are **painted only when the beam crosses the PDW bearing**, then **fade over ~5.5 s**. That matches “detected when the sweep actually passes it” without changing the 16-band hop logic.
2. **Spectrum analyzer** — 16-cell band grid, hop cursor on the tuned slice, click = lock, right-click = ignore. This is the viewing method from `SIMULATION_LOGIC.md`, kept on **16 bands** (not expanded to 32, which would break the SIH hop math).

Waterfall is **time downward, frequency across**. Cosmetics (cell inset, hairline, scan-line overlay, hop glow) do **not** change the occupancy colour mapping.

Pd trend plots **session Pd** (cumulative) against **recent Pd** (last telemetry delta) on a 0–100% axis so a live run is readable instead of a flat 6 px bar strip.

### Globe

India’s land-dot field is brightened; a phosphor marker sits near **20.6°N, 79.0°E** as the **ES origin**. Red pulses are **illustrative threat-frequency corridors** for the briefing, not a targeting database.

### Profile

Dark camo remains default. Light mode is a **gray tactical** theme (`#c4c4cc` surfaces, dark ink), not a white dashboard. CRT phosphor can stay dark so green/red blips stay visible. Font scale and reduce-motion persist in `localStorage`.

---

## 6. Novelty, efficiency, functionality, feasibility, scope, future

**Novelty.** Dual-agent AoI scheduling with an operator-readable expert log, plus a spectrum-analyzer view that shares the **same 16-band state** as the polar CRT. Epsilon-greedy and ignore/lock are the human-in-the-loop layer. Approximate N/S/E/W and range from PDW kinematics make the intercepts geographically intelligible without pretending to be a DF network.

**Efficiency.** One tuner, \(O(N)\) per tick (\(N=16\)). No GPU. Sweep interval is a single sleep. Frontend display is throttled (~400 ms) while the backend can hop faster; CRT animation is requestAnimationFrame and independent of hop rate.

**Functionality.** Three scheduler modes, live FoM, sticky emitters, ignore/lock, env sliders, two scan visualisers, waterfall, archive, PDF, theme/accessibility prefs.

**Feasibility.** Heuristic Smart Scan is deployable on an existing scan controller as a **policy overlay**. The emulator is synthetic; a fielded port would replace `RFEmulator` with real PDW/occupancy sockets and keep the scheduler + C2.

**Scope.** Demo envelope 0.5–18 GHz, 16 hops, three HIGH vignettes, mock auth. Not: real DF, real MARL training, classified threat libraries, or hardware-in-the-loop.

**Future.** Train MARL (or contextual bandits) against this emulator; keep Revisit as a **hard safety layer**. Replace amplitude-range with a calibrated RSL model. Ingest real PDW streams. Multi-receiver cueing. Digital twin of a specific ES aperture’s IBW and tune time.

---

## 7. Run locally

Backend (from `backend/`):

```
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8010
```

Frontend (from `frontend/`):

```
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Environment knobs (`backend/.env` or process env)

| Variable | Default | Meaning |
| --- | --- | --- |
| `AEGIS_SWEEP_MS` | 50 | Hop interval 20–500 ms |
| `AEGIS_HOSTILE_SPAWN` | 0.55 | HIGH-band start-rate scaler 0–1 |
| `AEGIS_NOISE_FLOOR` | 0.12 | Quiet-band false occupancy 0–0.8 |
| `AEGIS_EPSILON` | 0.10 | Smart Scan random explore 0–0.4 |
| `AEGIS_AOI_MS` | 850 | Revisit pre-emption threshold |
| `AEGIS_TELEMETRY_HZ` | 20 | Legacy name; loop period is `sweep_ms` |
| `AEGIS_TOKEN_SECRET` | demo secret | HMAC for mock login |

The Scan console sliders write the same knobs through `POST /api/v1/scheduler/config` without restarting the process.

---

## 8. Suggested demo path

1. Sign in → Briefing (India origin, corridor pulses).
2. Scan → **Open-Loop**, Initiate ~25 s, watch Pd / misses.
3. Switch to **Smart Scan MARL**, same window, Pd and recent-Pd should separate.
4. Toggle **Spectrum analyzer**, lock a HIGH cell, ignore a quiet cell.
5. On CRT, wait for the beam to paint green/red, then fade.
6. Halt → Analytics → download PDF.
7. Profile → Gray tactical theme; confirm CRT stays readable.

---

## 9. Repository layout

```
backend/app/core/     scheduler, runtime, archive, config
backend/app/data/     RF emulator
backend-rust/         Axum port of the same API (port 10000; optional A/B)
ml-pipeline/          TSRD / Gym DQN trainer (offline; not on the demo hot path)
frontend/src/pages/   briefing, scan, analytics, learn, profile
frontend/src/components/tactical/  CRT, spectrum, waterfall, HUD
SIMULATION_LOGIC.md   reference mechanics (32-band source; adapted to 16)
ML_PIPELINES.md       generic EW scan vs algorithms actually trained
RUST_BACKEND_MAP.md   FastAPI ↔ Rust function map
BRANCH_ANALYSIS.md    what was taken from main vs what stays on this branch
```

Default demo remains FastAPI on **8010**. Do not replace `backend/` with Rust in-place. Planning documents at the repo root are not required to run the demo.
