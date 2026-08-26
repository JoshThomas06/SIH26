# SIH 2025 idea presentation — copy into the official 6-slide deck

Use this file to fill `SIH2025-IDEA-Presentation-Format (1).pptx`. Keep every slide as bullets only. Do not paste long paragraphs.

**Problem ID:** SIH 26055 (DRDO)  
**Team repo:** AEGIS EW-Scheduler (`josh-prototype`)  
**Demo login:** `operator@aegis.local` / `aegis`

---

## SLIDE 1: Title & Metadata

- **Project / Idea Title:** AEGIS — Dual-Agent Smart Scan for Narrowband Electronic Support
- **Problem statement (one line):** An ES receiver with 500 MHz IBW must hop 16 slices across 0.5–18 GHz without missing agile emitters.
- **Primary Tech Category:** Software
- **Organisation / theme:** DRDO · Smart India Hackathon · Electronic Warfare / C2 prototype
- **What judges will see:** Live scan console + archived-run analytics (emulated RF, not field hardware)

---

## SLIDE 2: Idea Title & Proposed Solution

### Core Concept
- AEGIS is a dual-console C2 demo: briefing globe, live scan, run archive, operator handbook.
- Hardware constraint: receiver stares at **one** of **16 × 500 MHz** hops at a time (0.5–18 GHz SIH model).
- Open-loop sequential sweep misses hopping / low-duty emitters; Smart Scan spends dwell where it matters and still revisits quiet bands.

### How It Solves the Problem
- **Catch more real emitters (Pd):** Eager agent parks on occupied / HIGH-threat slices instead of walking 1→16 forever.
- **No channel starvation (AoI):** Revisit agent seizes the tuner when any band is older than **850 ms**.
- **Operator-in-the-loop:** Ignore / lock / env knobs + MoE hop log so the watch floor sees *why* the scheduler moved.

### Innovation & Uniqueness
- **Mixture of experts (heuristic MARL stand-in):** Eager + Revisit share one tuner; XAI log names the winning agent.
- **Epsilon-greedy (10%)** on eligible (non-ignored) bands so the policy cannot tunnel-vision on known hot zones.
- **Same 16-band physics on every view:** CRT polar, spectrum grid, waterfall, threat matrix, and PDFs all share one telemetry model (HIGH demo bands 04 / 08 / 13).

---

## SLIDE 3: Technical Approach

### Tech Stack
- **Languages:** TypeScript (frontend), Python 3 (backend)
- **Frontend:** React 19, Vite, Tailwind CSS 4, Zustand, Framer Motion, Recharts, D3, Three.js, jsPDF
- **Backend:** FastAPI, Uvicorn, Pydantic, NumPy
- **Realtime:** WebSocket `/ws` + HTTP `GET /api/v1/telemetry` fallback
- **Database:** None (in-memory run archive for the demo)
- **ML / AI:** No trained weights in-repo. Dual-agent heuristic + epsilon-greedy is the MARL *placeholder*; summaries are rule-based, not an LLM
- **Auth:** Mock operator gate (SIH demo), not a live defence IdP

### Methodology & Workflow
1. **Emulator** ticks occupancy / PDWs (spawn, noise floor, HIGH-band cadence) as ground truth.
2. **Scheduler** picks the next hop: MANUAL lock, OPEN_LOOP neighbour, or SMART_SCAN_MARL (Revisit if AoI ≥ 850 ms, else explore, else Eager).
3. **Runtime** scores hits / misses / Pd / Pfa / Δt / reward and streams telemetry (~20 Hz).
4. **Scan UI** paints CRT (sweep-paint fade), 16-band spectrum, waterfall, matrix, bearing/range; env sliders patch live knobs.
5. **Initiate → Halt** closes a run into the archive; Analytics charts FoM; **Summary / Full report PDF** + waterfall **CSV** export.

---

## SLIDE 4: Feasibility & Viability

### Technical Feasibility
- Stack is standard web + FastAPI: easy to demo on a laptop, no GPU, no classified data.
- Hop graph is 16 discrete actions — small enough for later MARL training without changing the UI contract.
- Env knobs (`sweep_ms`, spawn, noise, `sim_speed`, epsilon) let judges stress the same policy live.

### Potential Challenges & Risks
- **Sim-to-real gap:** Emulated occupancy ≠ real PDW / detector statistics.
- **Single-process archive:** Runs live in RAM; restart loses sessions; not multi-operator C2.
- **Telemetry load:** Fast hop + 20 Hz WS can starve the UI; display is throttled (~400 ms) and HTTP poll is the fallback.

### Mitigation Strategies
- Keep SIH 16-band contract; swap emulator for a PDW ingest adapter later without rewriting the scheduler API.
- Export CSV / PDF at Halt; treat in-memory archive as demo-only (Postgres later if needed).
- WS + HTTP telemetry; CRT/waterfall decouple paint rate from sweep_ms; `sim_speed` scales tick period without breaking AoI logic.

---

## SLIDE 5: Impact & Benefits

### Target Audience Impact
- **ES / EW operators and C2 watch floors** training on IBW-limited scan policy.
- **DRDO / SIH evaluators** comparing open-loop vs Smart Scan on the same FoM (Pd, Pfa, Δt).
- **Researchers** who need an explainable hop policy before investing in full MARL.

### Primary Benefits
- **Operational:** Higher intercept probability vs round-robin on agile emitters; anti-starvation via 850 ms AoI latch.
- **Training / accessibility:** Mock SSO, How-to-use handbook, grey light theme + font scale; mobile stacked scan layout.
- **Accountability:** MoE rationale log + flagged events + downloadable ASCII PDFs (no black-box “AI said so”).
- **Economic (demo):** Laptop-only prototype — no extra RF hardware required for the hackathon pitch.

---

## SLIDE 6: Research & References

### Key Libraries & SDKs
- **Frontend (`package.json`):** react, react-dom, react-router-dom, zustand, framer-motion, recharts, d3, three, jspdf, lucide-react, tailwindcss, vite
- **Backend (`requirements.txt`):** fastapi, uvicorn, pydantic, numpy, python-multipart

### Reference Benchmarks & Standards (as used in this prototype)
- **SIH 26055 model:** 16 hops × 500 MHz covering **0.5–18.0 GHz** (do not expand to 32 bands)
- **Age of Information (AoI)** revisit threshold **850 ms** (anti-starvation constraint)
- **FoM:** Probability of detection (Pd), probability of false alarm (Pfa), intercept-time error (Δt / dt)
- **PDW fields:** ToA, centre frequency, pulse width, AoA, amplitude (demo geolocation: compass + slant-range from amplitude)
- **Policy class:** Mixture-of-experts + ε-greedy (ε = 0.10) as a transparent stand-in for multi-agent RL
- **HIGH-threat demo emitters:** 0-indexed bands 3, 7, 12 (UI IDs 04 / 08 / 13)

### Integration note (for judges who ask “why not the 32-band guide?”)
- `AEGIS_INTEGRATION_GUIDE.md` is a 32-band reference sim. AEGIS **keeps 16 bands** and Eager + Revisit.
- Adopted from the guide without breaking SIH physics: waterfall CSV, overall threat posture, enemy-chatter trend.
- Not adopted: 32-band rewrite, `Score = Threat²×200 + timeSinceLastScan` replacing MoE, 5% epsilon, new friendly-emitter class.
