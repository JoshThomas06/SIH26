import { useState, useEffect, useRef, useCallback } from 'react';
import { BandState, SystemMetrics, ScanStrategy, LogEntry, EmitterType } from './types';

const NUM_BANDS = 32;
const BASE_FREQ = 2.0; // GHz
const SCAN_INTERVAL_MS = 100;
const ENVIRONMENT_UPDATE_INTERVAL_MS = 1500;

const generateInitialBands = (): BandState[] => {
  return Array.from({ length: NUM_BANDS }, (_, i) => ({
    id: i,
    frequency: (BASE_FREQ + i * 0.05).toFixed(2) + ' GHz',
    emitterType: 'none',
    signalStrength: 0,
    isKnownThreat: i === 7 || i === 15 || i === 24, // Mock some known hot zones
  }));
};

export const useSimulation = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [strategy, setStrategy] = useState<ScanStrategy>('linear');
  const [bands, setBands] = useState<BandState[]>(generateInitialBands());
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalScans: 0,
    interceptions: 0,
    hostileInterceptions: 0,
    misses: 0,
    interceptionRate: 0,
    avgScanCycleTimeMs: SCAN_INTERVAL_MS * NUM_BANDS,
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [chartData, setChartData] = useState<{ time: string; rate: number }[]>([]);

  // Heuristic memory for Smart Scan (mock ML Q-table)
  const threatMemory = useRef<number[]>(new Array(NUM_BANDS).fill(0.1));
  const timeSinceLastScan = useRef<number[]>(new Array(NUM_BANDS).fill(0));

  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    setLogs(prev => {
      const newLogs = [{ id: Math.random().toString(36).substring(7), timestamp: Date.now(), message, type }, ...prev].slice(0, 50);
      return newLogs;
    });
  }, []);

  // 1. Environment Simulation Loop (Emitters turning on/off)
  useEffect(() => {
    if (!isSimulating) return;

    const envInterval = setInterval(() => {
      setBands(prevBands => prevBands.map(band => {
        // Randomly turn on/off, with higher probability for 'known threats'
        const isThreatBand = band.isKnownThreat;
        const rand = Math.random();
        
        let newType: EmitterType = 'none';
        let newStrength = 0;

        if (isThreatBand && rand > 0.4) {
          newType = 'hostile';
          newStrength = 70 + Math.random() * 30;
        } else if (!isThreatBand && rand > 0.85) {
          newType = rand > 0.95 ? 'hostile' : 'friendly';
          newStrength = 30 + Math.random() * 50;
        } else if (rand > 0.7) {
          newType = 'noise';
          newStrength = 10 + Math.random() * 20;
        }

        return { ...band, emitterType: newType, signalStrength: newStrength };
      }));
    }, ENVIRONMENT_UPDATE_INTERVAL_MS);

    return () => clearInterval(envInterval);
  }, [isSimulating]);

  // 2. Receiver Scan Loop
  useEffect(() => {
    if (!isSimulating) return;

    let scanTimer = setInterval(() => {
      setBands(currentBands => {
        let nextIndex = 0;

        // Update time since last scan for all bands
        for (let i = 0; i < NUM_BANDS; i++) {
          timeSinceLastScan.current[i] += 1;
        }

        if (strategy === 'linear') {
          setCurrentScanIndex(prev => {
            nextIndex = (prev + 1) % NUM_BANDS;
            return nextIndex;
          });
        } else {
          // SMART SCAN LOGIC (Heuristic / Mock RL)
          // Score = threatProbability * timeSinceLastScan
          let maxScore = -1;
          for (let i = 0; i < NUM_BANDS; i++) {
            const score = threatMemory.current[i] * Math.pow(timeSinceLastScan.current[i], 1.5);
            if (score > maxScore) {
              maxScore = score;
              nextIndex = i;
            }
          }
          // Add some exploration randomness (epsilon-greedy)
          if (Math.random() < 0.1) {
            nextIndex = Math.floor(Math.random() * NUM_BANDS);
          }
          setCurrentScanIndex(nextIndex);
        }

        timeSinceLastScan.current[nextIndex] = 0; // Reset for the scanned band

        // Evaluate Interception
        const scannedBand = currentBands[nextIndex];
        const isHit = scannedBand.emitterType !== 'none' && scannedBand.emitterType !== 'noise';
        const isHostile = scannedBand.emitterType === 'hostile';

        // Update threat memory (Learning process)
        if (isHostile) {
          threatMemory.current[nextIndex] = Math.min(1.0, threatMemory.current[nextIndex] + 0.2);
          addLog(`Intercepted HOSTILE signal at ${scannedBand.frequency}`, 'critical');
        } else if (isHit) {
          threatMemory.current[nextIndex] = Math.min(1.0, threatMemory.current[nextIndex] + 0.05);
          addLog(`Intercepted FRIENDLY signal at ${scannedBand.frequency}`, 'success');
        } else {
          // Decay memory if nothing found
          threatMemory.current[nextIndex] = Math.max(0.01, threatMemory.current[nextIndex] - 0.02);
        }

        setMetrics(prev => {
          const total = prev.totalScans + 1;
          const hits = prev.interceptions + (isHit ? 1 : 0);
          const hostileHits = prev.hostileInterceptions + (isHostile ? 1 : 0);
          const rate = (hits / total) * 100;
          
          return {
            ...prev,
            totalScans: total,
            interceptions: hits,
            hostileInterceptions: hostileHits,
            misses: prev.misses + (isHit ? 0 : 1),
            interceptionRate: rate,
          };
        });

        return currentBands; // No change to bands state here, just evaluating
      });
    }, SCAN_INTERVAL_MS);

    return () => clearInterval(scanTimer);
  }, [isSimulating, strategy, addLog]);

  // 3. Chart data update loop (runs slower to not spam UI)
  useEffect(() => {
    if (!isSimulating) return;
    const chartInterval = setInterval(() => {
      setChartData(prev => {
        const newData = [...prev, { 
          time: new Date().toLocaleTimeString([], { hour12: false, second: '2-digit', minute: '2-digit' }), 
          rate: metrics.interceptionRate || 0 
        }].slice(-20);
        return newData;
      });
    }, 1000);
    return () => clearInterval(chartInterval);
  }, [isSimulating, metrics.interceptionRate]);

  const toggleSimulation = () => setIsSimulating(!isSimulating);
  const resetSimulation = () => {
    setIsSimulating(false);
    setBands(generateInitialBands());
    setCurrentScanIndex(0);
    setMetrics({
      totalScans: 0, interceptions: 0, hostileInterceptions: 0, misses: 0, interceptionRate: 0, avgScanCycleTimeMs: SCAN_INTERVAL_MS * NUM_BANDS
    });
    setLogs([]);
    setChartData([]);
    threatMemory.current = new Array(NUM_BANDS).fill(0.1);
    timeSinceLastScan.current = new Array(NUM_BANDS).fill(0);
  };

  return {
    isSimulating,
    toggleSimulation,
    resetSimulation,
    strategy,
    setStrategy,
    bands,
    currentScanIndex,
    metrics,
    logs,
    chartData,
    threatMemory: threatMemory.current
  };
};
