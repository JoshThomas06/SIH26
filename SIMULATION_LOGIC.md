# AEGIS EW-Scheduler: Core Logic & Mechanics

This document details the internal simulation logic, algorithms, and data structures used to drive the AEGIS Electronic Warfare Scheduler prototype.

## 1. Real-time RF Spectrum Analyzer

The RF Spectrum Analyzer is the primary visualizer representing both the "Truth Data" (what is actually happening in the RF environment) and the "Receiver" (where the system is currently looking).

### Core Mechanics
- **Band Grid**: The spectrum is divided into `32` discrete frequency bands.
- **Threat Memory**: The system maintains an array tracking the "Threat Probability" for each band, starting at 0.1.
- **Time Tracking**: An array tracks the `timeSinceLastScan` for each band. Every time the scanner moves, un-scanned bands increment their timer by 1.

### Scan Strategies (The Scheduler)
1. **Linear (Open Loop)**: The scanner increments its index sequentially (`(current + 1) % 32`). If a band is marked as "Ignored" by the user, the linear scanner will skip over it.
2. **Smart (Heuristic ML)**: This simulates a Reinforcement Learning agent. For every scan tick, the system calculates a score for every band using the formula:
   `Score = Threat Probability * (Time Since Last Scan ^ 1.5)`
   The scanner jumps to the band with the highest score. It also utilizes an *epsilon-greedy* approach, having a 10% chance to scan a completely random band to encourage exploration and discover new threats outside of known hot zones.

### Interception Logic & Learning
When the scanner lands on a band, it evaluates the truth data:
- **Hostile Hit**: Threat Probability for that band increases by `0.2` (max 1.0).
- **Friendly Hit**: Threat Probability increases slightly by `0.05`.
- **Miss (Empty/Noise)**: Threat Probability decays by `0.02` (min 0.01).

### Human-in-the-Loop Controls
- **Lock**: Forces the `nextIndex` of the scanner to remain fixed on a specific band, overriding both Linear and Smart strategies.
- **Ignore**: Marks a band to be completely bypassed by the scheduling algorithms.

---

## 2. Waterfall Spectrogram (History)

The Waterfall Spectrogram provides a 2D historical view of the RF environment over time, which is the industry standard for identifying hopping emitters and transmission patterns.

### Recording Logic
- **Decoupled Loop**: The waterfall records data in a separate loop from the fast-paced scanner. It takes a "snapshot" of the truth data at an interval proportional to the sweep speed (`Math.max(sweepSpeedMs * 4, 500)`).
- **Data Structure**: It maintains a sliding-window array of the last `30` snapshots in React state. Each snapshot contains a unique hash ID and an array of 32 cell objects mapping the `emitterType` and `signalStrength` at that exact moment.

### Visualization
- **Rendering**: The UI maps the 30 rows in a flex column, creating a downward-scrolling effect.
- **Heat Mapping**: Colors are applied using CSS `rgba()`. The opacity (alpha channel) is directly bound to the `signalStrength` (0 to 100). Hostile (Red), Friendly (Green), and Noise (Amber/Yellow) mix to create a visual heat map of RF intensity.

---

## 3. Environment Variables & Simulation Engine

The environment is a continuous loop updating every `1.5` seconds, responsible for spawning and removing signals.

### Spawning Math & Persistence (Markov Chain)
To prevent signals from appearing as 1-tick flashes, a **Signal Persistence** model is used:
- If a band currently has an active Hostile or Friendly signal, there is a **60% chance** it will stay active in the next tick.
- Given the 1.5s loop, a 60% retention rate mathematically yields an average continuous burst duration of **~3.75 seconds**, creating realistic contiguous RF transmissions.

### Dynamic Variables (Sliders)
- **Hostile Spawn Rate (0% to 100%)**: Acts as a multiplier. If bands are pre-designated as "known threat zones", their base chance to spawn a hostile signal is higher. This slider scales that baseline probability up or down globally.
- **Noise Floor (0 to 80%)**: Dictates the ambient RF interference. A higher noise floor increases the probability that empty bands will spawn 'noise' entities, and raises the minimum visual signal strength of that noise.
- **Receiver Sweep Speed (20ms to 500ms)**: Directly controls the interval time of the Receiver Scan Loop. Faster speeds allow the scanner to cover more ground, but require more processing power.

---

## 4. System Performance (Figures of Merit)

The right panel calculates real-time metrics based on the SIH problem statement requirements.

### Metrics Calculated
- **Interceptions**: Increments whenever the scanner lands on a band that contains an active signal (Hostile, Friendly, or Noise).
- **Hostile Hits**: A strict subset of interceptions where the signal was explicitly 'Hostile'.
- **Hit Rate**: `(Interceptions / Total Scans) * 100`. This metric is pushed to the area chart once per second to visualize scanner efficiency over time.
- **Average Time Error**: This tracks the scheduler's latency in finding threats.
  - *Tracking*: When a hostile signal spawns, the environment loop tags it with a `hostileStartTime` (timestamp).
  - *Calculation*: When the scanner finally intercepts that hostile signal, it calculates `Date.now() - hostileStartTime`.
  - *Averaging*: This error (in milliseconds) is pushed to a sliding window array (the last 50 interceptions). The UI displays the rolling average of this array. Linear scans typically have high time errors, whereas the Smart scan minimizes this error by prioritizing high-threat bands.
