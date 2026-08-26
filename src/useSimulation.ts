import { useState, useEffect, useRef, useCallback } from 'react';
import { BandState, SystemMetrics, ScanStrategy, LogEntry, EmitterType, WaterfallRow, SimConfig } from './types';

const NUM_BANDS = 32;
const BASE_FREQ = 2.0; // GHz
const ENVIRONMENT_UPDATE_INTERVAL_MS = 1500;

const generateInitialBands = (): BandState[] => {
  return Array.from({ length: NUM_BANDS }, (_, i) => ({
    id: i,
    frequency: (BASE_FREQ + i * 0.05).toFixed(2) + ' GHz',
    emitterType: 'none',
    signalStrength: 0,
    isKnownThreat: i === 7 || i === 15 || i === 24,
    isIgnored: false,
    hostileStartTime: null,
    hasBeenIntercepted: false,
  }));
};

export const useSimulation = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [strategy, setStrategy] = useState<ScanStrategy>('linear');
  const [bands, setBands] = useState<BandState[]>(generateInitialBands());
  
  // Need currentScanIndex in state for UI, and ref for synchronous loops
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const scanIndexRef = useRef(0);
  
  const [config, setConfig] = useState<SimConfig>({
    sweepSpeedMs: 100,
    hostileSpawnRate: 0.5, // 0 to 1
    noiseFloor: 20 // 0 to 100
  });

  const [lockedBandIndex, setLockedBandIndex] = useState<number | null>(null);
  const [waterfallData, setWaterfallData] = useState<WaterfallRow[]>([]);

  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalScans: 0,
    interceptions: 0,
    hostileInterceptions: 0,
    misses: 0,
    interceptionRate: 0,
    avgScanCycleTimeMs: 100 * NUM_BANDS,
    avgInterceptTimeErrorMs: 0,
  });

  const interceptErrors = useRef<number[]>([]);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [chartData, setChartData] = useState<{ time: string; rate: number }[]>([]);

  const threatMemory = useRef<number[]>(new Array(NUM_BANDS).fill(0.1));
  const timeSinceLastScan = useRef<number[]>(new Array(NUM_BANDS).fill(0));

  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    setLogs(prev => {
      const newLogs = [{ id: Math.random().toString(36).substring(7), timestamp: Date.now(), message, type }, ...prev].slice(0, 50);
      return newLogs;
    });
  }, []);

  // 1. Environment Simulation Loop
  useEffect(() => {
    if (!isSimulating) return;

    const envInterval = setInterval(() => {
      setBands(prevBands => prevBands.map(band => {
        const isThreatBand = band.isKnownThreat;
        
        let newType: EmitterType = 'none';
        let newStrength = 0;

        // Modulate probabilities based on config sliders
        let hostileProb = isThreatBand ? (0.85 * config.hostileSpawnRate) : (0.2 * config.hostileSpawnRate);
        let friendlyProb = isThreatBand ? 0.02 : 0.15;
        const noiseProb = config.noiseFloor / 100;

        // Introduce Signal Persistence (Continuous Transmissions)
        // If an emitter is already transmitting, it has a high chance to stay on
        if (band.emitterType === 'hostile') {
          hostileProb = 0.60; // 60% chance to stay hostile (~3.75s average duration)
          friendlyProb = 0.0;
        } else if (band.emitterType === 'friendly') {
          friendlyProb = 0.60; // 60% chance to stay friendly (~3.75s average duration)
          hostileProb = 0.0;
        }

        const roll = Math.random();

        if (roll < hostileProb) {
          newType = 'hostile';
          // Jitter the strength slightly if maintaining transmission
          newStrength = band.emitterType === 'hostile' 
            ? Math.min(100, Math.max(60, band.signalStrength + (Math.random() * 20 - 10))) 
            : 70 + Math.random() * 30;
        } else if (roll < hostileProb + friendlyProb) {
          newType = 'friendly';
          newStrength = band.emitterType === 'friendly'
            ? Math.min(90, Math.max(40, band.signalStrength + (Math.random() * 20 - 10)))
            : 40 + Math.random() * 40;
        } else if (roll < hostileProb + friendlyProb + noiseProb) {
          newType = 'noise';
          newStrength = config.noiseFloor + Math.random() * 20;
        }

        let hostileStartTime = band.hostileStartTime;
        let hasBeenIntercepted = band.hasBeenIntercepted;

        if (newType === 'hostile' && band.emitterType !== 'hostile') {
          hostileStartTime = Date.now();
          hasBeenIntercepted = false;
        } else if (newType !== 'hostile') {
          hostileStartTime = null;
          hasBeenIntercepted = false;
        }

        return { ...band, emitterType: newType, signalStrength: newStrength, hostileStartTime, hasBeenIntercepted };
      }));
    }, ENVIRONMENT_UPDATE_INTERVAL_MS);

    return () => clearInterval(envInterval);
  }, [isSimulating, config.hostileSpawnRate, config.noiseFloor]);

  // Waterfall Recording Loop
  useEffect(() => {
    if (!isSimulating) return;
    const waterfallInterval = setInterval(() => {
      setBands(currentBands => {
        setWaterfallData(prev => {
          const newRow: WaterfallRow = {
            id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
            cells: currentBands.map(b => ({ type: b.emitterType, strength: b.signalStrength }))
          };
          return [newRow, ...prev].slice(0, 150);
        });
        return currentBands;
      });
    }, Math.max(config.sweepSpeedMs * 4, 500));
    return () => clearInterval(waterfallInterval);
  }, [isSimulating, config.sweepSpeedMs]);

  // 2. Receiver Scan Loop
  useEffect(() => {
    if (!isSimulating) return;

    let scanTimer = setInterval(() => {
      setBands(currentBands => {
        let nextIndex = 0;

        for (let i = 0; i < NUM_BANDS; i++) {
          timeSinceLastScan.current[i] += 1;
        }

        if (lockedBandIndex !== null) {
          nextIndex = lockedBandIndex;
        } else if (strategy === 'linear') {
          nextIndex = (scanIndexRef.current + 1) % NUM_BANDS;
          let loops = 0;
          while (currentBands[nextIndex].isIgnored && loops < NUM_BANDS) {
            nextIndex = (nextIndex + 1) % NUM_BANDS;
            loops++;
          }
        } else {
          // SMART SCAN LOGIC
          // Heuristic: Heavily prioritize known threats (quadratic weight) over time since last scan
          let maxScore = -1;
          for (let i = 0; i < NUM_BANDS; i++) {
            if (currentBands[i].isIgnored) continue;
            const score = (threatMemory.current[i] * threatMemory.current[i] * 200) + timeSinceLastScan.current[i];
            if (score > maxScore) {
              maxScore = score;
              nextIndex = i;
            }
          }
          // Reduce exploration when we have known hot zones to keep time error extremely low
          if (Math.random() < 0.05) {
            let randNext = Math.floor(Math.random() * NUM_BANDS);
            if (!currentBands[randNext].isIgnored) nextIndex = randNext;
          }
        }

        scanIndexRef.current = nextIndex;
        setCurrentScanIndex(nextIndex);
        timeSinceLastScan.current[nextIndex] = 0;

        const scannedBand = currentBands[nextIndex];
        const isHit = scannedBand.emitterType !== 'none' && scannedBand.emitterType !== 'noise';
        const isHostile = scannedBand.emitterType === 'hostile';
        
        let newBands = [...currentBands];
        let errorMs = 0;

        if (isHostile) {
          threatMemory.current[nextIndex] = Math.min(1.0, threatMemory.current[nextIndex] + 0.25);
          if (!scannedBand.hasBeenIntercepted) {
             addLog(`Intercepted HOSTILE signal at ${scannedBand.frequency}`, 'critical');
             if (scannedBand.hostileStartTime) {
               errorMs = Date.now() - scannedBand.hostileStartTime;
               interceptErrors.current.push(errorMs);
               if (interceptErrors.current.length > 20) interceptErrors.current.shift();
             }
             newBands[nextIndex] = { ...scannedBand, hasBeenIntercepted: true };
          }
        } else if (isHit) {
          // It is a friendly, which means it is NOT a threat
          threatMemory.current[nextIndex] = Math.max(0.01, threatMemory.current[nextIndex] - 0.05);
          if (!scannedBand.hasBeenIntercepted) {
             addLog(`Intercepted FRIENDLY signal at ${scannedBand.frequency}`, 'success');
             newBands[nextIndex] = { ...scannedBand, hasBeenIntercepted: true };
          }
        } else {
          // Empty or noise, steep decay
          threatMemory.current[nextIndex] = Math.max(0.01, threatMemory.current[nextIndex] - 0.15);
        }

        setMetrics(prev => {
          const total = prev.totalScans + 1;
          const hits = prev.interceptions + (isHit ? 1 : 0);
          const hostileHits = prev.hostileInterceptions + (isHostile ? 1 : 0);
          const rate = (hits / total) * 100;
          
          let avgErr = prev.avgInterceptTimeErrorMs;
          if (interceptErrors.current.length > 0) {
            avgErr = interceptErrors.current.reduce((a, b) => a + b, 0) / interceptErrors.current.length;
          }

          return {
            ...prev,
            totalScans: total,
            interceptions: hits,
            hostileInterceptions: hostileHits,
            misses: prev.misses + (isHit ? 0 : 1),
            interceptionRate: rate,
            avgInterceptTimeErrorMs: avgErr,
            avgScanCycleTimeMs: config.sweepSpeedMs * NUM_BANDS
          };
        });

        return newBands;
      });
    }, config.sweepSpeedMs);

    return () => clearInterval(scanTimer);
  }, [isSimulating, strategy, addLog, config.sweepSpeedMs, lockedBandIndex]);

  // Clear running averages when strategy changes so user sees immediate results
  useEffect(() => {
    interceptErrors.current = [];
    setMetrics(prev => ({ ...prev, avgInterceptTimeErrorMs: 0 }));
  }, [strategy]);

  const rateRef = useRef(metrics.interceptionRate);
  rateRef.current = metrics.interceptionRate;

  // 3. Chart loop
  useEffect(() => {
    if (!isSimulating) return;
    const chartInterval = setInterval(() => {
      setChartData(prev => {
        const newData = [...prev, { 
          time: new Date().toLocaleTimeString([], { hour12: false, second: '2-digit', minute: '2-digit' }), 
          rate: rateRef.current || 0 
        }].slice(-20);
        return newData;
      });
    }, 1000);
    return () => clearInterval(chartInterval);
  }, [isSimulating]);

  const toggleSimulation = () => setIsSimulating(!isSimulating);
  const resetSimulation = () => {
    setIsSimulating(false);
    setBands(generateInitialBands());
    setCurrentScanIndex(0);
    scanIndexRef.current = 0;
    setLockedBandIndex(null);
    setMetrics({
      totalScans: 0, interceptions: 0, hostileInterceptions: 0, misses: 0, interceptionRate: 0, avgScanCycleTimeMs: config.sweepSpeedMs * NUM_BANDS, avgInterceptTimeErrorMs: 0
    });
    setLogs([]);
    setChartData([]);
    setWaterfallData([]);
    interceptErrors.current = [];
    threatMemory.current = new Array(NUM_BANDS).fill(0.1);
    timeSinceLastScan.current = new Array(NUM_BANDS).fill(0);
  };

  const toggleIgnoreBand = (index: number) => {
    setBands(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isIgnored: !copy[index].isIgnored };
      if (copy[index].isIgnored && lockedBandIndex === index) {
        setLockedBandIndex(null);
      }
      return copy;
    });
  };

  const toggleLockBand = (index: number) => {
    if (lockedBandIndex === index) {
      setLockedBandIndex(null);
    } else {
      setLockedBandIndex(index);
      setBands(prev => {
        const copy = [...prev];
        copy[index] = { ...copy[index], isIgnored: false };
        return copy;
      });
    }
  };

  return {
    isSimulating, toggleSimulation, resetSimulation,
    strategy, setStrategy,
    config, setConfig,
    lockedBandIndex, toggleLockBand, toggleIgnoreBand,
    bands, currentScanIndex,
    metrics, logs, chartData, waterfallData,
    threatMemory: threatMemory.current
  };
};
