/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, Radio, AlertTriangle, Shield, Play, Square, RotateCcw, Crosshair } from 'lucide-react';
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
    threatMemory
  } = useSimulation();

  return (
    <div className="min-h-screen bg-[#050B10] text-[#00F2FF] font-mono p-4 flex flex-col selection:bg-[#1A2E35]">
      
      {/* HEADER */}
      <header className="border-b border-[#1A2E35] pb-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crosshair className="w-8 h-8 text-[#00F2FF] animate-pulse" />
          <div>
            <h1 className="text-xl font-bold tracking-widest uppercase text-[#00F2FF] shadow-[#00F2FF]/20 drop-shadow-md">AEGIS EW-SCHEDULER</h1>
            <p className="text-xs opacity-70 tracking-widest uppercase">Smart Scan Strategy Prototype v1.0.4</p>
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
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* LEFT PANEL: SPECTRUM VISUALIZER */}
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-6 h-full">
          
          {/* CONTROL STRIP */}
          <div className="bg-[#0A141A] border border-[#1A2E35] p-4 flex justify-between items-center relative overflow-hidden">
            
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
                  Smart (Heuristic)
                </button>
              </div>
            </div>

            <div className="text-[10px] text-[#00F2FF]/60 text-right max-w-md hidden sm:block">
              {strategy === 'linear' 
                ? "Linear sweep covers all bands sequentially. Misses transient threats while scanning empty bands."
                : "Smart sweep prioritizes high-threat probability bands based on learned environment metrics."}
            </div>
          </div>

          {/* SPECTRUM GRID */}
          <div className="flex-1 bg-[#0A141A] border border-[#1A2E35] p-4 flex flex-col">
            <h2 className="text-xs uppercase font-bold text-[#00F2FF] mb-4 pb-2 border-b border-[#1A2E35] flex justify-between items-center flex-wrap gap-2">
              <span>RF Spectrum Analyzer (Truth Data Overlay)</span>
              <span className="flex gap-4 font-normal">
                <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-[#FF4B2B]" /> Hostile</span>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-[#00FF41]" /> Friendly</span>
                <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-[#FFB800] opacity-50" /> Noise</span>
                <span className="flex items-center gap-1"><div className="w-3 h-[2px] bg-[#00F2FF] shadow-[0_0_5px_rgba(0,242,255,0.8)]" /> Receiver</span>
              </span>
            </h2>

            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 flex-1">
              {bands.map((band, i) => {
                const isScanning = i === currentScanIndex;
                const threatProb = threatMemory[i];
                const isKnownThreat = band.isKnownThreat;
                
                return (
                  <div 
                    key={band.id} 
                    className={`relative border p-2 flex flex-col justify-between overflow-hidden transition-all duration-75 min-h-[80px]
                      ${isScanning ? 'border-[#00F2FF] bg-[#00F2FF]/10' : 'border-[#1A2E35] bg-[#050B10]'}
                      ${isKnownThreat && !isScanning ? 'border-[#FF4B2B]/30' : ''}
                    `}
                    style={{
                      backgroundColor: !isScanning && strategy === 'smart' ? `rgba(0, 242, 255, ${threatProb * 0.15})` : undefined
                    }}
                  >
                    {/* Scanning indicator */}
                    {isScanning && (
                      <div className="absolute inset-0 bg-[#00F2FF]/10 border-t-2 border-[#00F2FF] shadow-[0_0_15px_rgba(0,242,255,0.5)] z-10" />
                    )}

                    <div className="flex justify-between items-start z-20 relative">
                      <span className={`text-[10px] ${isKnownThreat ? 'text-[#FF4B2B]/70' : 'text-[#00F2FF]/70'}`}>{band.frequency}</span>
                      <EmitterIcon type={band.emitterType} className={band.emitterType !== 'none' ? 'animate-pulse' : ''} />
                    </div>
                    
                    {/* Signal visualizer bar */}
                    <div className="mt-auto pt-4 w-full z-20 relative">
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
                    
                    {/* Smart scan probability indicator */}
                    {strategy === 'smart' && (
                      <div className="absolute bottom-1 right-1 text-[8px] text-[#00F2FF]/70 font-mono z-20 bg-[#050B10]/80 px-1">
                        P: {threatProb.toFixed(2)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: METRICS & LOGS */}
        <div className="col-span-1 flex flex-col gap-6 h-full">
          
          {/* METRICS */}
          <div className="bg-[#0A141A] border border-[#1A2E35] p-4">
            <h2 className="text-xs font-bold uppercase text-[#00F2FF] mb-4 pb-2 border-b border-[#1A2E35]">System Performance</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#132029] p-2">
                <div className="text-[10px] text-[#00F2FF]/60 uppercase">Total Scans</div>
                <div className="text-xl text-[#00F2FF]">{metrics.totalScans}</div>
              </div>
              <div className="bg-[#132029] p-2">
                <div className="text-[10px] text-[#00F2FF]/60 uppercase">Interceptions</div>
                <div className="text-xl text-[#00FF41]">{metrics.interceptions}</div>
              </div>
              <div className="bg-[#132029] p-2">
                <div className="text-[10px] text-[#FF4B2B]/80 uppercase">Hostile Hits</div>
                <div className="text-xl text-[#FF4B2B]">{metrics.hostileInterceptions}</div>
              </div>
              <div className="bg-[#132029] p-2">
                <div className="text-[10px] text-[#00F2FF]/60 uppercase">Hit Rate</div>
                <div className="text-xl text-[#00F2FF]">{metrics.interceptionRate.toFixed(1)}%</div>
              </div>
            </div>

            <div className="h-32 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00F2FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00F2FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2E35" vertical={false} />
                  <XAxis dataKey="time" stroke="#1A2E35" tick={{ fill: '#00F2FF', fontSize: 10, opacity: 0.7 }} />
                  <YAxis stroke="#1A2E35" tick={{ fill: '#00F2FF', fontSize: 10, opacity: 0.7 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#050B10', border: '1px solid #1A2E35', borderRadius: '0' }}
                    itemStyle={{ color: '#00F2FF' }}
                  />
                  <Area type="monotone" dataKey="rate" stroke="#00F2FF" fillOpacity={1} fill="url(#colorRate)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* EVENT LOG */}
          <div className="bg-[#0A141A] border border-[#1A2E35] p-4 flex-1 flex flex-col min-h-[250px]">
            <h2 className="text-xs font-bold uppercase text-[#00F2FF] mb-4 pb-2 border-b border-[#1A2E35] flex justify-between">
              <span>Event Log</span>
              <Radio className="w-4 h-4 text-[#00F2FF]" />
            </h2>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar flex flex-col">
              {logs.length === 0 && (
                <div className="text-[10px] text-[#00F2FF]/40 text-center mt-4 uppercase animate-pulse">Awaiting signal intercepts...</div>
              )}
              {logs.map(log => (
                <div key={log.id} className="bg-[#132029] p-2 text-[10px] leading-tight border-l-2 flex justify-between" style={{
                  borderColor: log.type === 'critical' ? '#FF4B2B' : log.type === 'success' ? '#00FF41' : '#00F2FF'
                }}>
                  <span className={log.type === 'critical' ? 'text-[#FF4B2B] font-bold' : 'text-[#00F2FF]'}>{log.message}</span>
                  <span className="text-[#00F2FF]/40 ml-2">[{new Date(log.timestamp).toISOString().substring(11, 23)}]</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #050B10;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1A2E35;
        }
      `}} />
    </div>
  );
}
