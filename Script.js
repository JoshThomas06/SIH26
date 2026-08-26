(function(){
  const canvas = document.getElementById('waterfall');
  const ctx = canvas.getContext('2d');
  const HISTORY = 140;

  let NUM_BANDS = 12;
  let dwellMs = 180;
  let mixMode = 'mixed';
  let mode = 'open';
  let running = false;
  let timer = null;
  let clockTimer = null;
  let elapsedSec = 0;

  let bandsState, history, receiverBand, dwellCounter;
  let stats, bandWeight, sinceLastOn, profiles;
  let logEl = document.getElementById('log');

  function initSim(){
    NUM_BANDS = +document.getElementById('bands').value;
    document.getElementById('bandCount').textContent = NUM_BANDS + ' BANDS';
    bandsState = new Array(NUM_BANDS).fill(0);
    history = [];
    receiverBand = 0;
    dwellCounter = 0;
    bandWeight = new Array(NUM_BANDS).fill(1);
    sinceLastOn = new Array(NUM_BANDS).fill(0);
    stats = { ticks:0, hits:0, misses:0, transmissionOpportunities:0, falseAlarms:0, correct:0 };
    profiles = [];
    for(let i=0;i<NUM_BANDS;i++){
      let r = Math.random(); let type;
      if(mixMode==='easy') type = r<0.7?'continuous':(r<0.9?'periodic':'agile');
      else if(mixMode==='hard') type = r<0.25?'continuous':(r<0.55?'periodic':'agile');
      else type = r<0.4?'continuous':(r<0.75?'periodic':'agile');
      profiles.push({type, phase:Math.floor(Math.random()*40), period: 15+Math.floor(Math.random()*30)});
    }
    logEl.innerHTML='';
    elapsedSec = 0;
    updateClock();
    draw();
    updateMetrics();
  }

  function updateClock(){
    const h = String(Math.floor(elapsedSec/3600)).padStart(2,'0');
    const m = String(Math.floor((elapsedSec%3600)/60)).padStart(2,'0');
    const s = String(Math.floor(elapsedSec%60)).padStart(2,'0');
    document.getElementById('clock').textContent = `T+${h}:${m}:${s}`;
  }

  function stepEnvironment(){
    stats.ticks++;
    for(let i=0;i<NUM_BANDS;i++){
      const p = profiles[i]; let on = 0;
      if(p.type==='continuous'){ on = Math.random() < 0.9 ? 1 : 0; }
      else if(p.type==='periodic'){ on = ((stats.ticks + p.phase) % p.period) < (p.period*0.35) ? 1 : 0; }
      else { on = Math.random() < 0.15 ? 1 : 0; }
      bandsState[i] = on;
    }
  }

  function scheduleReceiver(){
    if(mode==='open'){
      dwellCounter += dwellMs;
      if(dwellCounter >= dwellMs){ dwellCounter = 0; receiverBand = (receiverBand + 1) % NUM_BANDS; }
    } else {
      for(let i=0;i<NUM_BANDS;i++){
        bandWeight[i] *= 0.92;
        if(bandsState[i]) bandWeight[i] += 3.0;
        bandWeight[i] = Math.max(bandWeight[i], 0.15);
      }
      let total = bandWeight.reduce((a,b)=>a+b,0);
      let r = Math.random()*total, acc=0, chosen=0;
      for(let i=0;i<NUM_BANDS;i++){ acc+=bandWeight[i]; if(r<=acc){chosen=i;break;} }
      receiverBand = chosen;
    }
  }

  function tick(){
    stepEnvironment();
    scheduleReceiver();
    const truthOn = bandsState[receiverBand] === 1;
    const noiseFalseAlarm = !truthOn && Math.random() < 0.02;
    const hit = truthOn;

    stats.transmissionOpportunities += bandsState.reduce((a,b)=>a+b,0);
    if(hit){
      stats.hits++; stats.correct++;
      logLine(`T+${elapsedSec.toFixed(1)}s  BAND ${receiverBand}`, 'hit');
    } else if(noiseFalseAlarm){
      stats.falseAlarms++;
      logLine(`T+${elapsedSec.toFixed(1)}s  BAND ${receiverBand}`, 'fa');
    } else {
      stats.misses++;
      stats.correct += (bandsState[receiverBand]===0)?1:0;
    }

    history.push({truth: bandsState.slice(), scanned: receiverBand, hit});
    if(history.length > HISTORY) history.shift();
    elapsedSec += dwellMs/1000;
    updateClock();
    draw();
    updateMetrics();
  }

  function logLine(text, cls){
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = text;
    logEl.prepend(d);
    while(logEl.childNodes.length > 60) logEl.removeChild(logEl.lastChild);
  }

  function draw(){
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#020403';
    ctx.fillRect(0,0,W,H);
    const rowH = H / NUM_BANDS;
    const colW = W / HISTORY;

    for(let c=0;c<history.length;c++){
      const col = history[c];
      const x = W - (history.length - c)*colW;
      for(let b=0;b<NUM_BANDS;b++){
        let color = '#0c150d';
        if(col.truth[b]) color = '#5c4200';
        if(col.scanned===b){ color = col.hit ? '#4dff6e' : '#ff3b3b'; }
        ctx.fillStyle = color;
        ctx.fillRect(x, b*rowH, colW+0.5, rowH-1);
      }
    }
    ctx.strokeStyle = '#1c2b1f';
    ctx.lineWidth = 1;
    for(let b=0;b<=NUM_BANDS;b++){ ctx.beginPath(); ctx.moveTo(0,b*rowH); ctx.lineTo(W,b*rowH); ctx.stroke(); }

    ctx.fillStyle = '#5a6e5c';
    ctx.font = '9px Consolas, monospace';
    for(let b=0;b<NUM_BANDS;b++){ ctx.fillText('B'+String(b).padStart(2,'0'), 4, b*rowH + rowH*0.7); }
  }

  function updateMetrics(){
    const pd = stats.transmissionOpportunities>0 ? (stats.hits/stats.transmissionOpportunities*100) : 0;
    const pfa = stats.ticks>0 ? (stats.falseAlarms/stats.ticks*100) : 0;
    const seconds = (stats.ticks*dwellMs)/1000;
    const rate = seconds>0 ? (stats.hits/seconds) : 0;
    const avgErr = dwellMs/2;
    const acc = stats.ticks>0 ? (stats.correct/stats.ticks*100) : 0;

    document.getElementById('mPd').textContent = pd.toFixed(1)+'%';
    document.getElementById('mPfa').textContent = pfa.toFixed(1)+'%';
    document.getElementById('mHits').textContent = stats.hits;
    document.getElementById('mRate').textContent = rate.toFixed(2);
    document.getElementById('mErr').textContent = avgErr.toFixed(0)+'ms';
    document.getElementById('mAcc').textContent = acc.toFixed(1)+'%';
  }

  function start(){
    if(running) return; running = true;
    document.getElementById('startBtn').textContent = 'Pause';
    timer = setInterval(tick, dwellMs);
  }
  function pause(){
    running = false;
    document.getElementById('startBtn').textContent = 'Engage';
    clearInterval(timer);
  }

  document.getElementById('startBtn').addEventListener('click', ()=>{ if(running) pause(); else start(); });
  document.getElementById('resetBtn').addEventListener('click', ()=>{ pause(); initSim(); });
  document.getElementById('bands').addEventListener('input', e=>{ document.getElementById('bandsVal').textContent = e.target.value; });
  document.getElementById('bands').addEventListener('change', ()=>{ pause(); initSim(); });
  document.getElementById('dwell').addEventListener('input', e=>{
    dwellMs = +e.target.value; document.getElementById('dwellVal').textContent = dwellMs;
    if(running){ pause(); start(); }
  });
  document.getElementById('mix').addEventListener('change', e=>{ mixMode = e.target.value; pause(); initSim(); });
  document.getElementById('modeOpen').addEventListener('click', ()=>{
    mode='open';
    document.getElementById('modeOpen').classList.add('active');
    document.getElementById('modeSmart').classList.remove('active');
  });
  document.getElementById('modeSmart').addEventListener('click', ()=>{
    mode='smart';
    document.getElementById('modeSmart').classList.add('active');
    document.getElementById('modeOpen').classList.remove('active');
  });

  initSim();
})();