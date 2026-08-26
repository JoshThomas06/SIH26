(function(){
  const canvas = document.getElementById('waterfall');
  const ctx = canvas.getContext('2d');
  const HISTORY = 180;

  let NUM_BANDS = 12;
  let dwellMs = 180;
  let mixMode = 'mixed';
  let mode = 'open';
  let running = false;
  let timer = null;
  let elapsedSec = 0;
  let renderTick = 0;

  let bandsState, history, receiverBand, dwellCounter;
  let stats, bandWeight, profiles;
  const logEl = document.getElementById('log');
  const statusEl = document.getElementById('status');
  const strategySummaryEl = document.getElementById('strategySummary');

  function initSim(){
    NUM_BANDS = +document.getElementById('bands').value;
    document.getElementById('bandCount').textContent = NUM_BANDS + ' BANDS';
    bandsState = new Array(NUM_BANDS).fill(0);
    history = [];
    receiverBand = 0;
    dwellCounter = 0;
    bandWeight = new Array(NUM_BANDS).fill(1);
    stats = {
      ticks:0,
      hits:0,
      misses:0,
      transmissionOpportunities:0,
      falseAlarms:0,
      correct:0,
      reward:0
    };

    profiles = [];
    for (let i = 0; i < NUM_BANDS; i++) {
      const r = Math.random();
      let type;
      if (mixMode === 'easy') type = r < 0.7 ? 'continuous' : (r < 0.9 ? 'periodic' : 'agile');
      else if (mixMode === 'hard') type = r < 0.25 ? 'continuous' : (r < 0.55 ? 'periodic' : 'agile');
      else type = r < 0.4 ? 'continuous' : (r < 0.75 ? 'periodic' : 'agile');

      profiles.push({
        type,
        phase: Math.floor(Math.random() * 40),
        period: 15 + Math.floor(Math.random() * 30)
      });
    }

    logEl.innerHTML = '';
    elapsedSec = 0;
    updateClock();
    updateModeSummary();
    draw();
    updateMetrics();
  }

  function updateModeSummary(){
    const isSmart = mode === 'smart';
    statusEl.textContent = isSmart ? 'SMART SCAN' : 'OPEN SWEEP';
    statusEl.style.borderColor = isSmart ? 'rgba(90,252,133,0.6)' : 'rgba(255,200,87,0.6)';
    statusEl.style.color = isSmart ? '#5afc85' : '#ffc857';
    strategySummaryEl.textContent = isSmart
      ? 'Adaptive reward weighting prioritizes bands with sustained transmission likelihood, improving intercept efficiency without requiring prior emitter intelligence.'
      : 'Open-loop sweep prioritizes rapid full-band coverage, but it spends time revisiting low-value segments instead of exploiting newly active emitters.';
  }

  function updateClock(){
    const h = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(elapsedSec % 60)).padStart(2, '0');
    document.getElementById('clock').textContent = `T+${h}:${m}:${s}`;
  }

  function stepEnvironment(){
    stats.ticks++;
    for (let i = 0; i < NUM_BANDS; i++) {
      const p = profiles[i];
      let on = 0;

      if (p.type === 'continuous') on = Math.random() < 0.88 ? 1 : 0;
      else if (p.type === 'periodic') on = ((stats.ticks + p.phase) % p.period) < (p.period * 0.35) ? 1 : 0;
      else on = Math.random() < 0.18 ? 1 : 0;

      bandsState[i] = on;
    }
  }

  function scheduleReceiver(){
    if (mode === 'open') {
      dwellCounter += dwellMs;
      if (dwellCounter >= dwellMs) {
        dwellCounter = 0;
        receiverBand = (receiverBand + 1) % NUM_BANDS;
      }
      return;
    }

    for (let i = 0; i < NUM_BANDS; i++) {
      bandWeight[i] *= 0.92;
      if (bandsState[i]) bandWeight[i] += 3.0;
      bandWeight[i] = Math.max(bandWeight[i], 0.18);
    }

    const total = bandWeight.reduce((sum, value) => sum + value, 0);
    let threshold = Math.random() * total;
    let acc = 0;

    for (let i = 0; i < NUM_BANDS; i++) {
      acc += bandWeight[i];
      if (threshold <= acc) {
        receiverBand = i;
        break;
      }
    }
  }

  function tick(){
    stepEnvironment();
    scheduleReceiver();

    const truthOn = bandsState[receiverBand] === 1;
    const falseAlarm = !truthOn && Math.random() < (mode === 'smart' ? 0.025 : 0.04);
    const hit = truthOn && !falseAlarm;

    stats.transmissionOpportunities += bandsState.reduce((sum, value) => sum + value, 0);

    if (hit) {
      stats.hits++;
      stats.correct++;
      stats.reward += 1.5;
      bandWeight[receiverBand] = Math.min(12, bandWeight[receiverBand] + 2.5);
      logLine(`T+${elapsedSec.toFixed(1)}s  BAND ${receiverBand} DETECTED`, 'hit');
    } else if (falseAlarm) {
      stats.falseAlarms++;
      stats.reward -= 0.8;
      logLine(`T+${elapsedSec.toFixed(1)}s  BAND ${receiverBand} NOISE`, 'fa');
    } else {
      stats.misses++;
      stats.correct += truthOn ? 0 : 1;
      stats.reward += truthOn ? -0.2 : 0.05;
      if (truthOn) {
        logLine(`T+${elapsedSec.toFixed(1)}s  BAND ${receiverBand} MISSED`, 'fa');
      }
    }

    history.push({ truth: bandsState.slice(), scanned: receiverBand, hit, falseAlarm });
    if (history.length > HISTORY) history.shift();

    elapsedSec += dwellMs / 1000;
    updateClock();
    draw();
    updateMetrics();
  }

  function logLine(text, cls){
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = text;
    logEl.prepend(d);
    while (logEl.childNodes.length > 60) logEl.removeChild(logEl.lastChild);
  }

  function draw(){
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    renderTick++;
    ctx.fillStyle = '#061018';
    ctx.fillRect(0, 0, width, height);

    const rowH = height / NUM_BANDS;
    const colW = width / HISTORY;

    for (let c = 0; c < history.length; c++) {
      const col = history[c];
      const x = width - (history.length - c) * colW;

      for (let b = 0; b < NUM_BANDS; b++) {
        let color = '#091820';
        if (col.truth[b]) color = '#6b5018';
        if (col.scanned === b) color = col.hit ? '#38d9ae' : '#e35d67';

        ctx.fillStyle = color;
        ctx.fillRect(x, b * rowH, colW + 0.5, rowH - 1);

        if (col.truth[b] && col.scanned !== b) {
          ctx.fillStyle = 'rgba(246, 198, 103, 0.16)';
          ctx.fillRect(x, b * rowH, colW + 0.5, rowH - 1);
        }
      }
    }

    ctx.strokeStyle = 'rgba(112, 201, 232, 0.12)';
    ctx.lineWidth = 1;
    for (let b = 0; b <= NUM_BANDS; b++) {
      ctx.beginPath();
      ctx.moveTo(0, b * rowH);
      ctx.lineTo(width, b * rowH);
      ctx.stroke();
    }

    const sweepX = (renderTick * 2.4) % width;
    const sweepGlow = ctx.createLinearGradient(sweepX - 18, 0, sweepX + 8, 0);
    sweepGlow.addColorStop(0, 'rgba(85, 230, 188, 0)');
    sweepGlow.addColorStop(0.75, 'rgba(85, 230, 188, 0.16)');
    sweepGlow.addColorStop(1, 'rgba(85, 230, 188, 0.5)');
    ctx.fillStyle = sweepGlow;
    ctx.fillRect(sweepX - 18, 0, 26, height);
    ctx.fillStyle = '#55e6bc';
    ctx.fillRect(sweepX, 0, 1, height);
    ctx.fillRect(sweepX - 3, 0, 7, 2);

    ctx.fillStyle = '#6f8d98';
    ctx.font = '9px Consolas, monospace';
    for (let b = 0; b < NUM_BANDS; b++) {
      ctx.fillText('B' + String(b).padStart(2, '0'), 4, b * rowH + rowH * 0.7);
    }
  }

  function animateWaterfall(){
    draw();
    requestAnimationFrame(animateWaterfall);
  }

  function updateMetrics(){
    const pd = stats.transmissionOpportunities > 0 ? (stats.hits / stats.transmissionOpportunities) * 100 : 0;
    const pfa = stats.ticks > 0 ? (stats.falseAlarms / stats.ticks) * 100 : 0;
    const seconds = (stats.ticks * dwellMs) / 1000;
    const rate = seconds > 0 ? (stats.hits / seconds) : 0;
    const avgErr = dwellMs / 2;
    const accuracy = stats.ticks > 0 ? ((stats.correct / stats.ticks) * 100) : 0;

    document.getElementById('mPd').textContent = pd.toFixed(1) + '%';
    document.getElementById('mPfa').textContent = pfa.toFixed(1) + '%';
    document.getElementById('mHits').textContent = stats.hits;
    document.getElementById('mRate').textContent = rate.toFixed(2);
    document.getElementById('mErr').textContent = avgErr.toFixed(0) + 'ms';
    document.getElementById('mAcc').textContent = accuracy.toFixed(1) + '%';
  }

  function start(){
    if (running) return;
    running = true;
    document.getElementById('startBtn').textContent = 'Pause';
    timer = setInterval(tick, dwellMs);
  }

  function pause(){
    running = false;
    document.getElementById('startBtn').textContent = 'Engage';
    clearInterval(timer);
  }

  document.getElementById('startBtn').addEventListener('click', () => {
    if (running) pause();
    else start();
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    pause();
    initSim();
  });

  document.getElementById('bands').addEventListener('input', (e) => {
    document.getElementById('bandsVal').textContent = e.target.value;
  });

  document.getElementById('bands').addEventListener('change', () => {
    pause();
    initSim();
  });

  document.getElementById('dwell').addEventListener('input', (e) => {
    dwellMs = +e.target.value;
    document.getElementById('dwellVal').textContent = dwellMs;
    if (running) {
      pause();
      start();
    }
  });

  document.getElementById('mix').addEventListener('change', (e) => {
    mixMode = e.target.value;
    pause();
    initSim();
  });

  document.getElementById('modeOpen').addEventListener('click', () => {
    mode = 'open';
    document.getElementById('modeOpen').classList.add('active');
    document.getElementById('modeSmart').classList.remove('active');
    updateModeSummary();
  });

  document.getElementById('modeSmart').addEventListener('click', () => {
    mode = 'smart';
    document.getElementById('modeSmart').classList.add('active');
    document.getElementById('modeOpen').classList.remove('active');
    updateModeSummary();
  });

  initSim();
  requestAnimationFrame(animateWaterfall);
})();
