/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, Radio, AlertTriangle, Shield, Play, Square, RotateCcw, Crosshair, Lock, Ban } from 'lucide-react';
import { useSimulation } from './useSimulation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BandState, EmitterType } from './types';

const EmitterIcon = ({ type, className }: { type: EmitterType, className?: string }) => {
  switch (type) {
    case 'hostile': return <AlertTriangle className={`w-4 h-4 text-[#FF4B2B] ${className}`} />;
    case 'friendly': return <Shield className={`w-4 h-4 text-[#00FF41] ${className}`} />;
    case 'noise': return <Activity className={`w-4 h-4 text-[#FFB800] opacity-50 ${className}`} />;
    default: return <div className={`w-4 h-4 ${className}`} />;
  }
};

export default function App() {
  const {
    isSimulating, toggleSimulation, resetSimulation,
    strategy, setStrategy,
    config, setConfig,
    lockedBandIndex, toggleLockBand, toggleIgnoreBand,
    bands, currentScanIndex,
    metrics, logs, chartData, waterfallData,
    threatMemory
  } = useSimulation();

  return (
    <div className="h-screen overflow-hidden bg-[#050B10] text-[#00F2FF] font-mono p-4 flex flex-col selection:bg-[#1A2E35]">
      
      {/* HEADER */}
      <header className="border-b border-[#1A2E35] pb-4 mb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Crosshair className="w-8 h-8 text-[#00F2FF] animate-pulse" />
          <div>
            <h1 className="text-xl font-bold tracking-widest uppercase text-[#00F2FF] shadow-[#00F2FF]/20 drop-shadow-md">AEGIS EW-SCHEDULER</h1>
            <p className="text-xs opacity-70 tracking-widest uppercase">Smart Scan Strategy Prototype v2.1.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-[#0A141A] p-2 border border-[#1A2E35]">
          <div className="flex items-center gap-2 mr-4">
            <div className={`w-3 h-3 ${isSimulating ? 'bg-[#FF4B2B] animate-pulse shadow-[0_0_8px_rgba(255,75,43,0.8)]' : 'bg-[#1A2E35]'}`} />
            <span className="text-xs uppercase tracking-wider">{isSimulating ? 'SYS ACTIVE' : 'SYS STANDBY'}</span>
          </div>

          <button onClick={toggleSimulation} className={`px-4 py-1 border flex items-center gap-2 text-xs uppercase transition-colors ${isSimulating ? 'border-[#FF4B2B] text-[#FF4B2B] hover:bg-[#1A2E35]/50' : 'border-[#1A2E35] text-[#00F2FF] hover:bg-[#1A2E35]/50'}`}>
            {isSimulating ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isSimulating ? 'HALT' : 'INITIATE'}
          </button>
          
          <button onClick={resetSimulation} className="px-4 py-1 border border-[#1A2E35] text-[#00F2FF]/70 hover:bg-[#1A2E35]/50 flex items-center gap-2 text-xs uppercase transition-colors">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        
        {/* LEFT PANEL: SPECTRUM & WATERFALL */}
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-4 h-full min-h-0">
          
          {/* CONTROL STRIP */}
          <div className="bg-[#0A141A] border border-[#1A2E35] p-3 flex justify-between items-center shrink-0">
            <div className="flex gap-4 items-center">
              <span className="text-xs uppercase text-[#00F2FF]/70">Scan Mode:</span>
              <div className="flex bg-[#050B10] border border-[#1A2E35] p-1">
                <button 
                  onClick={() => setStrategy('linear')}
                  className={`px-4 py-1 text-xs uppercase transition-colors ${strategy === 'linear' ? 'bg-[#132029] text-[#00F2FF]' : 'text-[#00F2FF]/50 hover:text-[#00F2FF]'}`}
                >
                  Linear (Open Loop)
                </button>
                <button 
                  onClick={() => setStrategy('smart')}
                  className={`px-4 py-1 text-xs uppercase transition-colors ${strategy === 'smart' ? 'bg-[#132029] text-[#00F2FF]' : 'text-[#00F2FF]/50 hover:text-[#00F2FF]'}`}
                >
                  Smart (Heuristic ML)
                </button>
              </div>
            </div>
            {lockedBandIndex !== null && (
               <div className="text-[10px] text-[#FF4B2B] animate-pulse uppercase flex items-center gap-1 border border-[#FF4B2B]/50 px-2 py-1 bg-[#FF4B2B]/10">
                 <Lock className="w-3 h-3" /> Manual Override Active
               </div>
            )}
          </div>

          {/* SPECTRUM GRID */}
          <div className="bg-[#0A141A] border border-[#1A2E35] p-3 flex flex-col shrink-0">
            <h2 className="text-xs uppercase font-bold text-[#00F2FF] mb-2 pb-1 border-b border-[#1A2E35] flex justify-between items-center">
              <span>Real-time RF Spectrum Analyzer</span>
              <span className="flex gap-4 font-normal text-[10px]">
                <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-[#FF4B2B]" /> Hostile</span>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-[#00FF41]" /> Friendly</span>
                <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-[#FFB800] opacity-50" /> Noise</span>
              </span>
            </h2>

            <div className="grid grid-cols-4 md:grid-cols-8 gap-1 flex-1 content-start">
              {bands.map((band, i) => {
                const isScanning = i === currentScanIndex;
                const threatProb = threatMemory[i];
                const isKnownThreat = band.isKnownThreat;
                const isIgnored = band.isIgnored;
                const isLocked = lockedBandIndex === i;
                
                return (
                  <div 
                    key={band.id} 
                    className={`relative border p-1 flex flex-col justify-between overflow-hidden transition-all duration-75 h-16 group
                      ${isScanning ? 'border-[#00F2FF] bg-[#00F2FF]/10 shadow-[inset_0_0_10px_rgba(0,242,255,0.2)]' : 'border-[#1A2E35] bg-[#050B10]'}
                      ${isIgnored ? 'opacity-30 grayscale' : ''}
                      ${isLocked ? 'border-[#FF4B2B]' : ''}
                    `}
                    style={{
                      backgroundColor: !isScanning && !isIgnored && strategy === 'smart' ? `rgba(0, 242, 255, ${threatProb * 0.15})` : undefined
                    }}
                  >
                    <div className="flex justify-between items-start z-20 relative">
                      <span className={`text-[9px] ${isKnownThreat ? 'text-[#FF4B2B]/70' : 'text-[#00F2FF]/70'}`}>{band.frequency}</span>
                      <EmitterIcon type={band.emitterType} className={`w-3 h-3 ${band.emitterType !== 'none' ? 'animate-pulse' : ''}`} />
                    </div>

                    {/* HIT-L human-in-loop controls (appear on hover) */}
                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-30 bg-[#050B10]/80">
                      <button onClick={() => toggleLockBand(i)} className={`p-1 ${isLocked ? 'text-[#FF4B2B]' : 'text-[#00F2FF]/50 hover:text-[#00F2FF]'}`}>
                        <Lock className="w-3 h-3" />
                      </button>
                      <button onClick={() => toggleIgnoreBand(i)} className={`p-1 ${isIgnored ? 'text-[#FFB800]' : 'text-[#00F2FF]/50 hover:text-[#00F2FF]'}`}>
                        <Ban className="w-3 h-3" />
                      </button>
                    </div>
                    
                    {/* Signal visualizer bar */}
                    <div className="mt-auto w-full z-20 relative">
                       <div className="h-1 bg-[#1A2E35] w-full overflow-hidden relative">
                        <div 
                          className={`absolute bottom-0 left-0 h-full transition-all duration-300 ${
                            band.emitterType === 'hostile' ? 'bg-[#FF4B2B] shadow-[0_0_5px_rgba(255,75,43,1)]' : 
                            band.emitterType === 'friendly' ? 'bg-[#00FF41] shadow-[0_0_5px_rgba(0,255,65,1)]' : 
                            band.emitterType === 'noise' ? 'bg-[#FFB800]/50' : 'bg-transparent'
                          }`}
                          style={{ width: `${band.signalStrength}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WATERFALL SPECTROGRAM */}
          <div className="bg-[#0A141A] border border-[#1A2E35] p-3 flex flex-col flex-1 min-h-0 overflow-hidden">
            <h2 className="text-xs uppercase font-bold text-[#00F2FF] mb-2 pb-1 border-b border-[#1A2E35]">Waterfall Spectrogram (History)</h2>
            <div className="flex-1 overflow-hidden relative bg-[#050B10] border border-[#1A2E35]">
              <div className="absolute inset-0 flex flex-col">
                 {waterfallData.map((row, rIdx) => (
                    <div key={row.id} className="flex flex-1 w-full border-b border-[#1A2E35]/30">
                      {row.cells.map((cell, cIdx) => (
                        <div key={cIdx} className="flex-1 border-r border-[#1A2E35]/30" style={{
                          backgroundColor: cell.type === 'hostile' ? `rgba(255,75,43, ${cell.strength / 100})` :
                                           cell.type === 'friendly' ? `rgba(0,255,65, ${cell.strength / 100})` :
                                           cell.type === 'noise' ? `rgba(255,184,0, ${(cell.strength / 100) * 0.5})` : 'transparent'
                        }} />
                      ))}
                    </div>
                 ))}
                 {/* Fill remaining empty rows if data is still accumulating */}
                 {Array.from({ length: Math.max(0, 30 - waterfallData.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex flex-1 w-full border-b border-[#1A2E35]/30">
                      {Array.from({ length: 32 }).map((_, c) => <div key={c} className="flex-1 border-r border-[#1A2E35]/30" />)}
                    </div>
                 ))}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: METRICS & LOGS & CONTROLS */}
        <div className="col-span-1 flex flex-col gap-4 h-full min-h-0">
          
          {/* ENVIRONMENT CONFIG (Sliders) */}
          <div className="bg-[#0A141A] border border-[#1A2E35] p-3 shrink-0">
            <h2 className="text-xs font-bold uppercase text-[#00F2FF] mb-3 pb-1 border-b border-[#1A2E35] flex justify-between items-center">
              <span>Environment Variables</span>
              <button 
                onClick={() => setConfig({ sweepSpeedMs: 100, hostileSpawnRate: 0.5, noiseFloor: 20 })} 
                className="text-[#00F2FF]/50 hover:text-[#00F2FF] transition-colors"
                title="Reset Variables"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </h2>
            <div className="space-y-3">
              <div>
                 <div className="flex justify-between text-[10px] text-[#00F2FF]/70 mb-1">
                   <span>Hostile Spawn Rate</span>
                   <span>{(config.hostileSpawnRate * 100).toFixed(0)}%</span>
                 </div>
                 <input type="range" min="0" max="1" step="0.1" value={config.hostileSpawnRate} 
                    onChange={e => setConfig({...config, hostileSpawnRate: parseFloat(e.target.value)})}
                    className="w-full h-1 bg-[#1A2E35] appearance-none cursor-pointer accent-[#FF4B2B]" />
              </div>
              <div>
                 <div className="flex justify-between text-[10px] text-[#00F2FF]/70 mb-1">
                   <span>Noise Floor</span>
                   <span>{config.noiseFloor}%</span>
                 </div>
                 <input type="range" min="0" max="80" step="5" value={config.noiseFloor} 
                    onChange={e => setConfig({...config, noiseFloor: parseInt(e.target.value)})}
                    className="w-full h-1 bg-[#1A2E35] appearance-none cursor-pointer accent-[#FFB800]" />
              </div>
              <div>
                 <div className="flex justify-between text-[10px] text-[#00F2FF]/70 mb-1">
                   <span>Receiver Sweep Speed</span>
                   <span>{config.sweepSpeedMs}ms</span>
                 </div>
                 <input type="range" min="20" max="500" step="20" value={config.sweepSpeedMs} 
                    onChange={e => setConfig({...config, sweepSpeedMs: parseInt(e.target.value)})}
                    className="w-full h-1 bg-[#1A2E35] appearance-none cursor-pointer accent-[#00F2FF]" />
              </div>
            </div>
          </div>

          {/* METRICS */}
          <div className="bg-[#0A141A] border border-[#1A2E35] p-3 shrink-0">
            <h2 className="text-xs font-bold uppercase text-[#00F2FF] mb-3 pb-1 border-b border-[#1A2E35]">System Performance</h2>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-[#132029] p-2 flex flex-col justify-center">
                <div className="text-[9px] text-[#00F2FF]/60 uppercase">Interceptions</div>
                <div className="text-lg text-[#00FF41] leading-none mt-1">{metrics.interceptions}</div>
              </div>
              <div className="bg-[#132029] p-2 flex flex-col justify-center">
                <div className="text-[9px] text-[#FF4B2B]/80 uppercase">Hostile Hits</div>
                <div className="text-lg text-[#FF4B2B] leading-none mt-1">{metrics.hostileInterceptions}</div>
              </div>
              <div className="bg-[#132029] p-2 flex flex-col justify-center">
                <div className="text-[9px] text-[#00F2FF]/60 uppercase">Hit Rate</div>
                <div className="text-lg text-[#00F2FF] leading-none mt-1">{metrics.interceptionRate.toFixed(1)}%</div>
              </div>
              <div className="bg-[#132029] p-2 flex flex-col justify-center border border-[#FF4B2B]/30">
                <div className="text-[9px] text-[#FF4B2B]/80 uppercase">Avg Time Error</div>
                <div className="text-lg text-[#FF4B2B] leading-none mt-1">
                   {metrics.avgInterceptTimeErrorMs > 0 ? `${metrics.avgInterceptTimeErrorMs.toFixed(0)}ms` : '--'}
                </div>
              </div>
            </div>

            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00F2FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00F2FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2E35" vertical={false} />
                  <XAxis dataKey="time" stroke="#1A2E35" tick={{ fill: '#00F2FF', fontSize: 9, opacity: 0.7 }} />
                  <YAxis stroke="#1A2E35" tick={{ fill: '#00F2FF', fontSize: 9, opacity: 0.7 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#050B10', border: '1px solid #1A2E35', borderRadius: '0' }}
                    itemStyle={{ color: '#00F2FF', fontSize: 10 }}
                    labelStyle={{ fontSize: 10, color: '#00F2FF', opacity: 0.5 }}
                  />
                  <Area type="monotone" dataKey="rate" stroke="#00F2FF" fillOpacity={1} fill="url(#colorRate)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* EVENT LOG */}
          <div className="bg-[#0A141A] border border-[#1A2E35] p-3 flex-1 flex flex-col min-h-0">
            <h2 className="text-xs font-bold uppercase text-[#00F2FF] mb-3 pb-1 border-b border-[#1A2E35] flex justify-between">
              <span>Event Log</span>
              <Radio className="w-4 h-4 text-[#00F2FF]" />
            </h2>
            
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar flex flex-col">
              {logs.length === 0 && (
                <div className="text-[10px] text-[#00F2FF]/40 text-center mt-4 uppercase animate-pulse">Awaiting signal intercepts...</div>
              )}
              {logs.map(log => (
                <div key={log.id} className="bg-[#132029] p-1.5 text-[9px] leading-tight border-l-2 flex justify-between" style={{
                  borderColor: log.type === 'critical' ? '#FF4B2B' : log.type === 'success' ? '#00FF41' : '#00F2FF'
                }}>
                  <span className={log.type === 'critical' ? 'text-[#FF4B2B] font-bold' : 'text-[#00F2FF]'}>{log.message}</span>
                  <span className="text-[#00F2FF]/40 ml-2 text-right min-w-[50px]">[{new Date(log.timestamp).toISOString().substring(11, 23)}]</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #050B10; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1A2E35; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px;
          width: 8px;
          background: currentColor;
          cursor: pointer;
        }
      `}} />
    </div>
  );
}
