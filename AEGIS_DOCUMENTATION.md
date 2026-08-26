# AEGIS EW-Scheduler: Prototype Documentation

This document explains the visual design system and the underlying technical architecture of the AEGIS EW-Scheduler prototype. It is intended to serve as a blueprint for replicating this interface and simulation logic in future iterations or production environments (e.g., integrating with a Python/PyTorch backend).

## 1. Visual Design & Theme ("Sleek Interface")

The application utilizes a "futuristic military terminal" aesthetic, characterized by high-contrast neon accents against deep, dark backgrounds, strict geometric constraints (no rounded corners), and terminal-like typography.

### Color Palette
- **Primary Background:** `#050B10` (Deep space blue/black)
- **Secondary Panels (Cards):** `#0A141A`
- **Tertiary Elements (Metrics Cards, Log Entries):** `#132029`
- **Borders & Dividers:** `#1A2E35`
- **Primary Text & Accents (Cyan):** `#00F2FF` (Used for headers, nominal statuses, standard text, and the active scanner overlay)
- **Hostile/Critical (Red):** `#FF4B2B` (Used for enemy emitters, hostile hits, and active simulation warnings)
- **Friendly/Success (Green):** `#00FF41` (Used for allied emitters and successful standard intercepts)
- **Noise/Unknown (Amber):** `#FFB800` (Used for background RF noise)

### Typography & Structure
- **Font Family:** Monospace (`font-mono`) is used globally to reinforce the command-line/terminal feel.
- **Headers & Labels:** Heavy use of `uppercase`, reduced font sizes (`text-[10px]`, `text-xs`), and wide letter spacing (`tracking-widest`) for data labels and panel titles.
- **Borders:** Strict 1px solid borders using `#1A2E35`. **No border-radius** is applied anywhere in the UI to maintain a rigid, hardware-like display appearance.
- **Glow Effects (Bloom):** Simulated using CSS `shadow-[0_0_15px_rgba(...)]` on critical elements like active hostile signals or the current scanner position.

## 2. Technical Architecture & Simulation Logic

The prototype is a client-side Single Page Application (SPA) built with **React**, styled via **Tailwind CSS**, and uses **Recharts** for data visualization.

### State Management (`useSimulation.ts`)
The core logic resides in a custom React hook that manages two decoupled, real-time loops:

#### A. The Environment Loop (Truth Data)
- **Interval:** Runs every 1.5 seconds.
- **Logic:** Represents the actual RF spectrum (32 frequency bands). It randomly spawns `hostile`, `friendly`, or `noise` signals across the spectrum.
- **Hot Zones:** Certain bands are hardcoded as "known threats" and have a statistically higher probability of spawning a hostile signal, mimicking intelligence/pre-mission data.

#### B. The Scanner Loop (Receiver)
- **Interval:** Runs every 100 milliseconds (fast sweep).
- **Logic:** Dictates which frequency band the receiver is currently looking at. It has two modes:
  1. **Linear (Open Loop):** The baseline standard. Sweeps bands sequentially from 0 to 31. It is slow to return to known hot zones, often missing transient threats.
  2. **Smart (Mock ML / Heuristic):** A prototype for the final Q-Learning model. It calculates a dynamic "score" for each band using the formula: `Threat Probability * (Time Since Last Scan ^ 1.5)`. The receiver jumps to the band with the highest score, ensuring high-probability threat zones are checked frequently while not entirely neglecting quiet bands.

#### C. Memory & Metrics
- **Threat Memory:** When the receiver intercepts a hostile signal, it increases the internal "Threat Probability" for that specific frequency band. If a band is scanned and found empty, its threat probability decays.
- **Metrics Tracking:** Logs total scans, hits, misses, and calculates a rolling **Hit Rate (Interception Rate)**, which is then fed into the Recharts area graph.

## 3. UI Component Breakdown (`App.tsx`)

- **Header Bar:** Contains global system statuses, simulated mission time, and the primary control buttons (Initiate/Halt, Reset).
- **Spectrum Grid (Main View):** A flexbox grid of 32 individual cells representing the RF bands. 
  - *Background Data:* Shows the signal strength and type (Truth Data) natively. 
  - *Scanner Overlay:* A bright `#00F2FF` border highlights the band the scanner is actively investigating in the current tick.
- **Metrics Panel:** Displays calculated Figures of Merit (Interceptions, Hostile Hits, Hit Rate) and a real-time Area Chart tracking interception efficiency over time.
- **Event Log:** A reverse-chronological feed of intercepted signals, color-coded by threat level, complete with timestamp generation.

## 4. Replicating / Expanding for Production
To upgrade this to the final SIH project:
1. Extract the `useSimulation.ts` logic into a **Python backend**.
2. Replace the heuristic "Smart Scan" algorithm with a true **Deep Q-Network (DQN)** using PyTorch/TensorFlow.
3. Connect this React frontend to the Python backend via **WebSockets (Socket.io or FastAPI WebSockets)** to stream the live predictions, spectrum data, and real-time logs directly into these UI components.
