# AEGIS EW-Scheduler: Complete Logic & Integration Guide

**⚠️ CRITICAL INTEGRATION INSTRUCTION FOR AI / DEVELOPERS ⚠️**
> When migrating or injecting this logic into an existing application, **DO NOT overwrite or destroy the target application's existing UI/UX.** 
> You must preserve the target app's current user interface, Tailwind styling, and DOM structure. Your task is strictly to **wire this underlying logic, state management, and algorithmic engine** into the existing visual shell, adding any missing features (like the CSV export button or tactical intelligence readouts) organically into the existing layout without breaking the established design language.

---

## 1. Core State & Data Structures

The application relies on a central custom hook (e.g., `useSimulation`) that maintains the "Truth Data" and the "Known Data".

### The Environment (Truth Data)
- **Bands Array**: An array of 32 objects representing the RF spectrum. 
  - `frequency`: String (e.g., "300MHz")
  - `emitterType`: `'none' | 'noise' | 'friendly' | 'hostile'`
  - `signalStrength`: Number (0 to 100)
  - `isIgnored`: Boolean (Human-in-the-loop override)
  - `hasBeenIntercepted`: Boolean (Tracks if the scanner has discovered it)

### The Memory (AI Data)
- **Threat Memory (`threatMemory`)**: A `useRef` array of 32 floats (0.01 to 1.0). Tracks the probability of a threat existing in each band.
- **Time Since Last Scan (`timeSinceLastScan`)**: A `useRef` array of 32 integers. Increments every scanner tick for un-scanned bands.
- **Waterfall Buffer (`waterfallData`)**: An array of the last 150 spectrum snapshots used for historical rendering and Tactical Intelligence trend analysis.

---

## 2. The Simulation Engine (Signal Spawning)

The environment updates every `1.5` seconds, completely decoupled from the scanner. It uses a **Markov Chain (Signal Persistence)** model to generate realistic contiguous transmissions.

### Spawning Algorithm
For each of the 32 bands, a random roll evaluates what spawns based on the config sliders (`hostileSpawnRate`, `noiseFloor`):
```javascript
// Base probabilities modulated by UI sliders
let hostileProb = isThreatBand ? (0.85 * config.hostileSpawnRate) : (0.2 * config.hostileSpawnRate);
let friendlyProb = isThreatBand ? 0.02 : 0.15;
const noiseProb = config.noiseFloor / 100;

// Signal Persistence (Prevents 1-tick blinking)
if (band.emitterType === 'hostile') {
  hostileProb = 0.60; // 60% chance to stay hostile (~3.75s continuous burst)
  friendlyProb = 0.0;
} else if (band.emitterType === 'friendly') {
  friendlyProb = 0.60; 
  hostileProb = 0.0;
}

// Roll logic
const roll = Math.random();
if (roll < hostileProb) { /* Spawn/Maintain Hostile */ }
else if (roll < hostileProb + friendlyProb) { /* Spawn/Maintain Friendly */ }
else if (roll < hostileProb + friendlyProb + noiseProb) { /* Spawn Noise */ }
```

---

## 3. Scanner Strategies & Machine Learning

The scanner runs on an interval defined by `config.sweepSpeedMs` (e.g., 50ms to 500ms).

### Linear Scan (Baseline)
Simply increments the index `(currentIndex + 1) % 32`. It skips any band where `isIgnored === true`.

### SMART Scan (Heuristic Algorithm)
Evaluates every single band and jumps to the one with the highest score.
- **The Heuristic Formula**: `Score = (Threat Memory² * 200) + Time Since Last Scan`
- **Why it works**: Squaring the threat memory (Quadratic weighting) forces the AI to aggressively latch onto known hot zones, minimizing the "Average Time Error". The `Time Since Last Scan` acts as a tie-breaker or forces eventual exploration of neglected bands.
- **Exploration**: A 5% chance (`Math.random() < 0.05`) to scan a completely random band, ensuring the AI eventually discovers new hot zones outside its memory.

### Memory Updates (Learning)
When the scanner lands on a band, it updates `threatMemory` for that band:
- **Found Hostile**: `+0.25` (Max 1.0)
- **Found Friendly**: `-0.05` (Confirmed non-combatant, reduce threat)
- **Found Empty/Noise**: `-0.15` (Steep decay to clear ghost tracks)

---

## 4. Tactical Intelligence & Metrics

### Hit Rate Charting
A decoupled `setInterval` runs every 1 second, grabbing the current `metrics.interceptionRate` via a React `useRef` and pushing it to a 20-length array for the Recharts `<AreaChart>`.

### Overall Threat Level
Evaluates the number of bands where `threatMemory >= 0.5` (Active Hot Zones).
- **CRITICAL (Red)**: `config.hostileSpawnRate >= 0.7` OR `Hot Zones >= 6`
- **MODERATE (Amber)**: `config.hostileSpawnRate >= 0.3` OR `Hot Zones >= 2`
- **NOMINAL (Green)**: Everything else.

### Enemy Chatter Trend
Analyzes the most recent 20 sweeps from the `waterfallData` history buffer.
```javascript
const recentRows = waterfallData.slice(0, 10);
const olderRows = waterfallData.slice(10, 20);

// Calculate averages
const recentHostiles = recentRows.reduce((sum, row) => sum + row.cells.filter(c => c.type === 'hostile').length, 0) / 10;
const olderHostiles = olderRows.reduce((sum, row) => sum + row.cells.filter(c => c.type === 'hostile').length, 0) / 10;

// Evaluate Trend
if (recentHostiles > olderHostiles + 0.5) return 'INCREASING ▲';
if (recentHostiles < olderHostiles - 0.5) return 'DECREASING ▼';
return 'STABLE ▬';
```

---

## 5. CSV Export Feature

Transforms the 150-length `waterfallData` array into a downloadable CSV file.
```javascript
const exportToCSV = () => {
  if (waterfallData.length === 0) return;
  
  const headers = ['Timestamp'];
  for (let i = 0; i < 32; i++) {
    headers.push(`Band_${i}_Type`);
    headers.push(`Band_${i}_Strength`);
  }
  
  const rows = waterfallData.map(row => {
    // Extract timestamp from row ID (e.g. "1719283921-xyz")
    const ms = parseInt(row.id.split('-')[0]);
    const timestamp = isNaN(ms) ? row.id : new Date(ms).toISOString();
    
    const rowData = [timestamp];
    row.cells.forEach(cell => {
      rowData.push(cell.type);
      rowData.push(cell.strength.toFixed(2));
    });
    return rowData.join(',');
  });
  
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `aegis_rf_history_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```
