/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, Radio, AlertTriangle, Shield, Play, Square, RotateCcw, Crosshair, Lock, Ban, Brain, Download } from 'lucide-react';
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
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'history'>('dashboard');
  
  const {
    isSimulating, toggleSimulation, resetSimulation,
    strategy, setStrategy,
    config, setConfig,
    lockedBandIndex, toggleLockBand, toggleIgnoreBand,
    bands, currentScanIndex,
    metrics, logs, chartData, waterfallData,
    threatMemory
  } = useSimulation();

  // Derived Intelligence
  const highestThreatIndex = threatMemory.indexOf(Math.max(...threatMemory));
  const highestThreatFreq = bands[highestThreatIndex]?.frequency || "UNKNOWN";
  const activeThreats = threatMemory.filter(p => p >= 0.5).length; // Stricter definition of a hot zone
  const isTargetLocked = lockedBandIndex !== null;
  
  let threatLevel = 'NOMINAL';
  let threatColor = '#00FF41';
  let recommendation = 'Continue standard wide-spectrum scanning.';
  
  if (config.hostileSpawnRate >= 0.7 || activeThreats >= 6) {
    threatLevel = 'CRITICAL';
    threatColor = '#FF4B2B';
    recommendation = `Multiple hostiles detected across ${activeThreats} bands. Switching to SMART heuristics recommended.`;
  } else if (config.hostileSpawnRate >= 0.3 || activeThreats >= 2) {
    threatLevel = 'MODERATE';
    threatColor = '#FFB800';
    recommendation = `Target acquired near ${highestThreatFreq}. Monitoring for signal persistence.`;
  }
  
  if (isTargetLocked) {
    recommendation = `HARD LOCK active on ${bands[lockedBandIndex]?.frequency}. Ignoring other spectrum bands.`;
  }

  // Calculate Chatter Trend from recent waterfall data (5-10 seconds window)
  let chatterTrend = 'STABLE ▬';
  let chatterColor = '#FFFFFF';
  if (waterfallData.length >= 20) {
    const recentRows = waterfallData.slice(0, 10);
    const olderRows = waterfallData.slice(10, 20);
    
    const recentHostiles = recentRows.reduce((sum, row) => sum + row.cells.filter(c => c.type === 'hostile').length, 0) / 10;
    const olderHostiles = olderRows.reduce((sum, row) => sum + row.cells.filter(c => c.type === 'hostile').length, 0) / 10;
    
    if (recentHostiles > olderHostiles + 0.5) {
      chatterTrend = 'INCREASING ▲';
      chatterColor = '#FF4B2B';
    } else if (recentHostiles < olderHostiles - 0.5) {
      chatterTrend = 'DECREASING ▼';
      chatterColor = '#00FF41';
    } else {
      chatterTrend = 'STABLE ▬';
      chatterColor = '#FFFFFF';
    }
  }

  const exportToCSV = () => {
    if (waterfallData.length === 0) return;
    
    const headers = ['Timestamp'];
    for (let i = 0; i < 32; i++) {
      headers.push(`Band_${i}_Type`);
      headers.push(`Band_${i}_Strength`);
    }
    
    const rows = waterfallData.map(row => {
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

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] font-mono p-4 flex flex-col selection:bg-[#333333]">
      
      {/* HEADER */}
      <header className="border-b border-[#333333] pb-4 mb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Crosshair className="w-8 h-8 text-[#FFFFFF] animate-pulse" />
          <div>
            <h1 className="text-xl font-bold tracking-widest uppercase text-[#FFFFFF] shadow-[#FFFFFF]/20 drop-shadow-md">AEGIS EW-SCHEDULER</h1>
            <p className="text-xs opacity-70 tracking-widest uppercase">Smart Scan Strategy Prototype v2.1.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-[#0A0A0A] p-2 border border-[#333333]">
          <div className="flex items-center gap-2 mr-4">
            <div className={`w-3 h-3 ${isSimulating ? 'bg-[#FF4B2B] animate-pulse shadow-[0_0_8px_rgba(255,75,43,0.8)]' : 'bg-[#333333]'}`} />
            <span className="text-xs uppercase tracking-wider">{isSimulating ? 'SYS ACTIVE' : 'SYS STANDBY'}</span>
          </div>

          <button onClick={toggleSimulation} className={`px-4 py-1 border flex items-center gap-2 text-xs uppercase transition-colors ${isSimulating ? 'border-[#FF4B2B] text-[#FF4B2B] hover:bg-[#333333]/50' : 'border-[#333333] text-[#FFFFFF] hover:bg-[#333333]/50'}`}>
            {isSimulating ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isSimulating ? 'HALT' : 'INITIATE'}
          </button>
          
          <button onClick={resetSimulation} className="px-4 py-1 border border-[#333333] text-[#FFFFFF]/70 hover:bg-[#333333]/50 flex items-center gap-2 text-xs uppercase transition-colors">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="flex gap-6 mb-4 border-b border-[#333333] pb-2 shrink-0">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`uppercase text-xs font-bold tracking-wider transition-colors ${activeTab === 'dashboard' ? 'text-[#FFFFFF] border-b-2 border-[#FFFFFF] pb-2 -mb-[9px]' : 'text-[#FFFFFF]/40 hover:text-[#FFFFFF]/70'}`}
        >
          Live Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={`uppercase text-xs font-bold tracking-wider transition-colors ${activeTab === 'history' ? 'text-[#FFFFFF] border-b-2 border-[#FFFFFF] pb-2 -mb-[9px]' : 'text-[#FFFFFF]/40 hover:text-[#FFFFFF]/70'}`}
        >
          Extended History
        </button>
      </div>

      {/* MAIN GRID */}
      {activeTab === 'dashboard' && (
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* LEFT PANEL: SPECTRUM & WATERFALL */}
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-4">
          
          {/* CONTROL STRIP */}
          <div className="bg-[#0A0A0A] border border-[#333333] p-3 flex justify-between items-center shrink-0">
            <div className="flex gap-4 items-center">
              <span className="text-xs uppercase text-[#FFFFFF]/70">Scan Mode:</span>
              <div className="flex bg-[#000000] border border-[#333333] p-1">
                <button 
                  onClick={() => setStrategy('linear')}
                  className={`px-4 py-1 text-xs uppercase transition-colors ${strategy === 'linear' ? 'bg-[#111111] text-[#FFFFFF]' : 'text-[#FFFFFF]/50 hover:text-[#FFFFFF]'}`}
                >
                  Linear (Open Loop)
                </button>
                <button 
                  onClick={() => setStrategy('smart')}
                  className={`px-4 py-1 text-xs uppercase transition-colors ${strategy === 'smart' ? 'bg-[#111111] text-[#FFFFFF]' : 'text-[#FFFFFF]/50 hover:text-[#FFFFFF]'}`}
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
          <div className="bg-[#0A0A0A] border border-[#333333] p-3 flex flex-col shrink-0">
            <h2 className="text-xs uppercase font-bold text-[#FFFFFF] mb-2 pb-1 border-b border-[#333333] flex justify-between items-center">
              <span>Real-time RF Spectrum Analyzer</span>
              <span className="flex gap-4 font-normal text-[10px]">
                <span className="flex items-center gap-1" title="Confirmed Enemy Emitter"><AlertTriangle className="w-3 h-3 text-[#FF4B2B]" /> Hostile</span>
                <span className="flex items-center gap-1" title="Confirmed Allied Emitter"><Shield className="w-3 h-3 text-[#00FF41]" /> Friendly</span>
                <span className="flex items-center gap-1" title="Ambient Interference"><Activity className="w-3 h-3 text-[#FFB800] opacity-50" /> Noise</span>
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
                      ${isScanning ? 'border-[#FFFFFF] bg-[#FFFFFF]/10 shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]' : 'border-[#333333] bg-[#000000]'}
                      ${isIgnored ? 'opacity-30 grayscale' : ''}
                      ${isLocked ? 'border-[#FF4B2B]' : ''}
                    `}
                    style={{
                      backgroundColor: !isScanning && !isIgnored && strategy === 'smart' ? `rgba(255,255,255, ${threatProb * 0.15})` : undefined
                    }}
                  >
                    <div className="flex justify-between items-start z-20 relative">
                      <span className={`text-[9px] ${isKnownThreat ? 'text-[#FF4B2B]/70' : 'text-[#FFFFFF]/70'}`}>{band.frequency}</span>
                      <EmitterIcon type={band.emitterType} className={`w-3 h-3 ${band.emitterType !== 'none' ? 'animate-pulse' : ''}`} />
                    </div>

                    {/* HIT-L human-in-loop controls (appear on hover) */}
                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-30 bg-[#000000]/80">
                      <button onClick={() => toggleLockBand(i)} className={`p-1 ${isLocked ? 'text-[#FF4B2B]' : 'text-[#FFFFFF]/50 hover:text-[#FFFFFF]'}`} title="Lock Scanner to this Band">
                        <Lock className="w-3 h-3" />
                      </button>
                      <button onClick={() => toggleIgnoreBand(i)} className={`p-1 ${isIgnored ? 'text-[#FFB800]' : 'text-[#FFFFFF]/50 hover:text-[#FFFFFF]'}`} title="Ignore this Band">
                        <Ban className="w-3 h-3" />
                      </button>
                    </div>
                    
                    {/* Signal visualizer bar */}
                    <div className="mt-auto w-full z-20 relative">
                       <div className="h-1 bg-[#333333] w-full overflow-hidden relative">
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
          <div className="bg-[#0A0A0A] border border-[#333333] p-3 flex flex-col h-[300px]">
            <h2 className="text-xs uppercase font-bold text-[#FFFFFF] mb-2 pb-1 border-b border-[#333333]">Waterfall Spectrogram (Recent)</h2>
            <div className="flex-1 overflow-hidden relative bg-[#000000] border border-[#333333]">
              <div className="absolute inset-0 flex flex-col">
                 {waterfallData.slice(0, 30).map((row, rIdx) => (
                    <div key={row.id} className="flex flex-1 w-full border-b border-[#333333]/30">
                      {row.cells.map((cell, cIdx) => (
                        <div key={cIdx} className="flex-1 border-r border-[#333333]/30" style={{
                          backgroundColor: cell.type === 'hostile' ? `rgba(255,75,43, ${cell.strength / 100})` :
                                           cell.type === 'friendly' ? `rgba(0,255,65, ${cell.strength / 100})` :
                                           cell.type === 'noise' ? `rgba(255,184,0, ${(cell.strength / 100) * 0.5})` : 'transparent'
                        }} />
                      ))}
                    </div>
                 ))}
                 {/* Fill remaining empty rows if data is still accumulating */}
                 {Array.from({ length: Math.max(0, 30 - waterfallData.slice(0, 30).length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex flex-1 w-full border-b border-[#333333]/30">
                      {Array.from({ length: 32 }).map((_, c) => <div key={c} className="flex-1 border-r border-[#333333]/30" />)}
                    </div>
                 ))}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: METRICS & LOGS & CONTROLS */}
        <div className="col-span-1 flex flex-col gap-4">
          
          {/* ENVIRONMENT CONFIG (Sliders) */}
          <div className="bg-[#0A0A0A] border border-[#333333] p-3 shrink-0">
            <h2 className="text-xs font-bold uppercase text-[#FFFFFF] mb-3 pb-1 border-b border-[#333333] flex justify-between items-center">
              <span>Environment Variables</span>
              <button 
                onClick={() => setConfig({ sweepSpeedMs: 100, hostileSpawnRate: 0.5, noiseFloor: 20 })} 
                className="text-[#FFFFFF]/50 hover:text-[#FFFFFF] transition-colors"
                title="Reset Variables"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </h2>
            <div className="space-y-3">
              <div>
                 <div className="flex justify-between text-[10px] text-[#FFFFFF]/70 mb-1">
                   <span>Hostile Spawn Rate</span>
                   <span>{(config.hostileSpawnRate * 100).toFixed(0)}%</span>
                 </div>
                 <input type="range" min="0" max="1" step="0.1" value={config.hostileSpawnRate} 
                    onChange={e => setConfig({...config, hostileSpawnRate: parseFloat(e.target.value)})}
                    className="w-full h-1 bg-[#333333] appearance-none cursor-pointer accent-[#FF4B2B]" />
              </div>
              <div>
                 <div className="flex justify-between text-[10px] text-[#FFFFFF]/70 mb-1">
                   <span>Noise Floor</span>
                   <span>{config.noiseFloor}%</span>
                 </div>
                 <input type="range" min="0" max="80" step="5" value={config.noiseFloor} 
                    onChange={e => setConfig({...config, noiseFloor: parseInt(e.target.value)})}
                    className="w-full h-1 bg-[#333333] appearance-none cursor-pointer accent-[#FFB800]" />
              </div>
              <div>
                 <div className="flex justify-between text-[10px] text-[#FFFFFF]/70 mb-1">
                   <span>Receiver Sweep Speed</span>
                   <span>{config.sweepSpeedMs}ms</span>
                 </div>
                 <input type="range" min="20" max="500" step="20" value={config.sweepSpeedMs} 
                    onChange={e => setConfig({...config, sweepSpeedMs: parseInt(e.target.value)})}
                    className="w-full h-1 bg-[#333333] appearance-none cursor-pointer accent-[#FFFFFF]" />
              </div>
            </div>
          </div>

          {/* METRICS */}
          <div className="bg-[#0A0A0A] border border-[#333333] p-3 shrink-0">
            <h2 className="text-xs font-bold uppercase text-[#FFFFFF] mb-3 pb-1 border-b border-[#333333]">System Performance</h2>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-[#111111] p-2 flex flex-col justify-center" title="Total number of RF signals successfully captured.">
                <div className="text-[9px] text-[#FFFFFF]/60 uppercase">Interceptions</div>
                <div className="text-lg text-[#00FF41] leading-none mt-1">{metrics.interceptions}</div>
              </div>
              <div className="bg-[#111111] p-2 flex flex-col justify-center" title="Number of confirmed enemy signals intercepted.">
                <div className="text-[9px] text-[#FF4B2B]/80 uppercase">Hostile Hits</div>
                <div className="text-lg text-[#FF4B2B] leading-none mt-1">{metrics.hostileInterceptions}</div>
              </div>
              <div className="bg-[#111111] p-2 flex flex-col justify-center" title="Percentage of scans that resulted in a valid signal interception.">
                <div className="text-[9px] text-[#FFFFFF]/60 uppercase">Hit Rate</div>
                <div className="text-lg text-[#FFFFFF] leading-none mt-1">{metrics.interceptionRate.toFixed(1)}%</div>
              </div>
              <div className="bg-[#111111] p-2 flex flex-col justify-center border border-[#FF4B2B]/30" title="5-10 second rolling trend of hostile signal volume.">
                <div className="text-[9px] text-[#FF4B2B]/80 uppercase">Enemy Chatter</div>
                <div className="text-sm font-bold mt-1" style={{ color: chatterColor }}>
                   {chatterTrend}
                </div>
              </div>
            </div>

            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333333" vertical={false} />
                  <XAxis dataKey="time" stroke="#333333" tick={{ fill: '#FFFFFF', fontSize: 9, opacity: 0.7 }} />
                  <YAxis stroke="#333333" tick={{ fill: '#FFFFFF', fontSize: 9, opacity: 0.7 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000000', border: '1px solid #333333', borderRadius: '0' }}
                    itemStyle={{ color: '#FFFFFF', fontSize: 10 }}
                    labelStyle={{ fontSize: 10, color: '#FFFFFF', opacity: 0.5 }}
                  />
                  <Area type="monotone" dataKey="rate" stroke="#FFFFFF" fillOpacity={1} fill="url(#colorRate)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TACTICAL ANALYSIS */}
          <div className="bg-[#0A0A0A] border border-[#333333] p-3 shrink-0">
            <h2 className="text-xs font-bold uppercase text-[#FFFFFF] mb-3 pb-1 border-b border-[#333333] flex justify-between items-center">
              <span>Tactical Intelligence</span>
              <Brain className="w-3 h-3 text-[#FFFFFF]/50" />
            </h2>
            <div className="flex flex-col gap-2">
               <div className="flex justify-between items-center bg-[#111111] p-2 border-l-2" style={{ borderColor: threatColor }}>
                  <span className="text-[10px] text-[#FFFFFF]/70 uppercase">Overall Threat</span>
                  <span className="text-xs font-bold uppercase" style={{ color: threatColor }}>{threatLevel}</span>
               </div>
               <div className="flex justify-between items-center bg-[#111111] p-2">
                  <span className="text-[10px] text-[#FFFFFF]/70 uppercase">Primary Target (Est)</span>
                  <span className="text-xs text-[#FF4B2B]">{highestThreatFreq}</span>
               </div>
               <div className="flex justify-between items-center bg-[#111111] p-2">
                  <span className="text-[10px] text-[#FFFFFF]/70 uppercase">Tracked Hot Zones</span>
                  <span className="text-xs text-[#FFFFFF]">{activeThreats}</span>
               </div>
               <div className="mt-2 text-[10px] text-[#FFFFFF]/80 leading-relaxed bg-[#111111] p-2 border border-[#333333]">
                  <span className="font-bold text-[#FFFFFF]">SYS_REC: </span>{recommendation}
               </div>
            </div>
          </div>

          {/* EVENT LOG */}
          <div className="bg-[#0A0A0A] border border-[#333333] p-3 flex flex-col h-[300px]">
            <h2 className="text-xs font-bold uppercase text-[#FFFFFF] mb-3 pb-1 border-b border-[#333333] flex justify-between">
              <span>Event Log</span>
              <Radio className="w-4 h-4 text-[#FFFFFF]" />
            </h2>
            
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar flex flex-col">
              {logs.length === 0 && (
                <div className="text-[10px] text-[#FFFFFF]/40 text-center mt-4 uppercase animate-pulse">Awaiting signal intercepts...</div>
              )}
              {logs.map(log => (
                <div key={log.id} className="bg-[#111111] p-1.5 text-[9px] leading-tight border-l-2 flex justify-between" style={{
                  borderColor: log.type === 'critical' ? '#FF4B2B' : log.type === 'success' ? '#00FF41' : '#FFFFFF'
                }}>
                  <span className={log.type === 'critical' ? 'text-[#FF4B2B] font-bold' : 'text-[#FFFFFF]'}>{log.message}</span>
                  <span className="text-[#FFFFFF]/40 ml-2 text-right min-w-[50px]">[{new Date(log.timestamp).toISOString().substring(11, 23)}]</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      )}

      {activeTab === 'history' && (
      <main className="flex-1 flex flex-col gap-4 min-h-[600px]">
        <div className="bg-[#0A0A0A] border border-[#333333] p-3 flex flex-col flex-1">
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-[#333333]">
             <h2 className="text-xs uppercase font-bold text-[#FFFFFF]">Extended Waterfall Spectrogram (Last 150 Sweeps)</h2>
             <button onClick={exportToCSV} className="flex items-center gap-1.5 text-[10px] font-bold uppercase border border-[#333333] px-2 py-1 text-[#00FF41] hover:bg-[#333333]/50 transition-colors">
               <Download className="w-3 h-3" /> Export CSV
             </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#000000] border border-[#333333]">
            <div className="absolute top-0 left-0 right-0 flex flex-col">
               {waterfallData.map((row) => (
                  <div key={row.id} className="flex w-full border-b border-[#333333]/30 h-[24px] shrink-0">
                    {row.cells.map((cell, cIdx) => (
                      <div key={cIdx} className="flex-1 border-r border-[#333333]/30" style={{
                        backgroundColor: cell.type === 'hostile' ? `rgba(255,75,43, ${cell.strength / 100})` :
                                         cell.type === 'friendly' ? `rgba(0,255,65, ${cell.strength / 100})` :
                                         cell.type === 'noise' ? `rgba(255,184,0, ${(cell.strength / 100) * 0.5})` : 'transparent'
                      }} />
                    ))}
                  </div>
               ))}
               {/* Fill empty if < 150 */}
               {Array.from({ length: Math.max(0, 150 - waterfallData.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex w-full border-b border-[#333333]/30 h-[24px] shrink-0">
                    {Array.from({ length: 32 }).map((_, c) => <div key={c} className="flex-1 border-r border-[#333333]/30" />)}
                  </div>
               ))}
            </div>
          </div>
        </div>
      </main>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333333; }
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
