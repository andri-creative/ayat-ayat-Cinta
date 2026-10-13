'use strict';

/* Ayat-ayat Cinta 🕌 — Game Engine 14 Babak */

/* ================= helpers ================= */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const isHttp = location.protocol.startsWith('http');

const SCENE_KEY = 'ayat-ayat-cinta-scene';
const MUTED_KEY = 'ayat-ayat-cinta-muted';

const MUSIC_SOURCES = [
  'https://archive.org/download/arabic-instrumental-song/Dubai%20Dream%20Arabic.mp3',
  'assets/dubai_dream_arabic.mp3'
];

const TOTAL = 14;

/* ================= state ================= */
function defaultState() {
  return {
    currentScene: 1,
    totalScenes: TOTAL,
    musicMuted: localStorage.getItem(MUTED_KEY) === '1',
    audioUnlocked: false
  };
}
let STATE = defaultState();

/* restore scene */
(function restore() {
  const saved = parseInt(localStorage.getItem(SCENE_KEY) || '1', 10);
  if (saved >= 1 && saved <= TOTAL) STATE.currentScene = saved;
})();

/* ================= feedback ================= */
let toastTimer = null;
function showToast(msg, ms = 2400) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

function vibrate(p) {
  if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} }
}

function spawnFloaters(n, chars) {
  const pool = chars || ['✨', '🌙', '💫', '🕌', '💍', '🕊️', '💛'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'floater';
    s.textContent = pool[Math.floor(Math.random() * pool.length)];
    s.style.left = rand(10, 88) + 'vw';
    s.style.top = rand(55, 85) + 'vh';
    s.style.fontSize = rand(18, 34) + 'px';
    s.style.animationDuration = rand(1.1, 1.9) + 's';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 2100);
  }
}

function celebrate(msg) {
  showToast(msg);
  vibrate([18, 40, 18]);
  spawnFloaters(6);
}

/* hujan bunga mekar + lampion naik dari bawah (biar meriah) */
function bloomBurst(cfg) {
  const c = cfg || {};
  const flowers = ['🌸', '🌺', '🌷', '🌹', '🌼', '💮', '🏵️', '🪷'];
  const lanterns = ['🏮', '🪔', '✨', '💛'];
  const layer = document.createElement('div');
  layer.className = 'bloom-layer';
  const total = c.count || 56;
  for (let i = 0; i < total; i++) {
    const s = document.createElement('span');
    const isLantern = Math.random() < 0.26;
    const isOpen = Math.random() < 0.42;
    s.className = 'bloom' + (isOpen ? ' bloom-open' : '');
    s.textContent = isLantern
      ? lanterns[Math.floor(Math.random() * lanterns.length)]
      : flowers[Math.floor(Math.random() * flowers.length)];
    s.style.setProperty('--x', rand(-6, 106) + 'vw');
    s.style.setProperty('--dx', rand(-70, 70) + 'px');
    s.style.setProperty('--sz', rand(18, 44) + 'px');
    s.style.setProperty('--dur', rand(2.6, 5) + 's');
    s.style.setProperty('--delay', rand(0, 1.5) + 's');
    if (isOpen) s.style.setProperty('--ty', rand(24, 66) + 'vh');
    layer.appendChild(s);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 7200);
}

/* ================= sound engine ================= */
const A = {
  ctx: null,
  master: null,
  audio: null,
  srcIdx: 0,
  playing: false,
  mode: 'none',     // 'mp3' | 'synth'
  triedAll: false,
  schedTimer: null,
  step: 0,
  nextTime: 0
};

function ensureAudio() {
  if (A.ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  A.ctx = new AC();
  A.master = A.ctx.createGain();
  A.master.gain.value = 0.5;
  A.master.connect(A.ctx.destination);
}

function resumeCtx() {
  if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
}

/* --- MP3 chain: external URL -> local file -> synth --- */
function startMp3() {
  A.audio = A.audio || $('bg-audio');
  if (A.srcIdx >= MUSIC_SOURCES.length) { startSynth(); return; }
  const src = MUSIC_SOURCES[A.srcIdx];
  A.audio.src = src;
  A.audio.volume = 0.55;
  const p = A.audio.play();
  if (p && p.then) {
    p.then(() => { A.playing = true; A.mode = 'mp3'; updateMusicUI(true); })
      .catch((err) => {
        if (err && (err.name === 'NotAllowedError' || err.name === 'AbortError')) return;
        advanceMp3();
      });
  }
}
A.audioErrorHandler = null;
function advanceMp3() {
  A.srcIdx++;
  if (A.srcIdx < MUSIC_SOURCES.length) startMp3();
  else { A.triedAll = true; startSynth(); }
}

function hookAudioErrors() {
  const el = $('bg-audio');
  el.addEventListener('error', () => {
    if (A.mode !== 'synth' && !STATE.musicMuted) advanceMp3();
  });
}

/* --- synth fallback: maqam-ish oud + pad --- */
const SYNTH_SCALE = [220.0, 233.08, 261.63, 293.66, 311.13, 349.23, 392.0, 415.3];
function synthNote(freq, time, dur, type, gain) {
  const o = A.ctx.createOscillator();
  const g = A.ctx.createGain();
  o.type = type || 'triangle';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(gain, time + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  o.connect(g); g.connect(A.master);
  o.start(time); o.stop(time + dur + 0.05);
}
function startSynth() {
  if (!A.ctx || A.mode === 'synth') return;
  A.mode = 'synth';
  A.playing = true;
  A.step = 0;
  A.nextTime = A.ctx.currentTime + 0.1;
  const bpm = 76, beat = 60 / bpm;
  A.schedTimer = setInterval(() => {
    while (A.nextTime < A.ctx.currentTime + 0.6) {
      const i = A.step % 16;
      const mel = [0, 2, 4, 5, 4, 2, 3, 1, 0, 2, 4, 6, 5, 4, 2, 0];
      if (i % 2 === 0) synthNote(SYNTH_SCALE[mel[i]] , A.nextTime, beat * 0.9, 'triangle', 0.16);
      if (i % 8 === 0) synthNote(SYNTH_SCALE[0] / 2, A.nextTime, beat * 3.6, 'sine', 0.12);
      if (i % 8 === 4) synthNote(SYNTH_SCALE[4] / 2, A.nextTime, beat * 3.2, 'sine', 0.09);
      A.nextTime += beat;
      A.step++;
    }
  }, 250);
  updateMusicUI(true);
}
function stopSynth() {
  clearInterval(A.schedTimer);
  A.schedTimer = null;
}
function stopMusic() {
  A.playing = false;
  if (A.mode === 'mp3' && A.audio) { A.audio.pause(); }
  if (A.mode === 'synth') stopSynth();
  updateMusicUI(false);
}
function startMusic() {
  if (STATE.musicMuted || A.playing) return;
  ensureAudio();
  resumeCtx();
  if (A.mode === 'synth') { startSynth(); return; }
  startMp3();
}
function toggleMusic() {
  ensureAudio(); resumeCtx();
  STATE.musicMuted = !STATE.musicMuted;
  localStorage.setItem(MUTED_KEY, STATE.musicMuted ? '1' : '0');
  if (STATE.musicMuted) stopMusic();
  else startMusic();
}
function updateMusicUI(playing) {
  const pill = $('music-pill');
  pill.classList.toggle('playing', playing && !STATE.musicMuted);
  $('music-label').textContent = STATE.musicMuted ? 'Musik mati' : (playing ? 'Musik nyala' : 'Musik');
}

/* --- SFX --- */
function sfxChime() {
  if (!A.ctx || STATE.musicMuted) return;
  resumeCtx();
  const t = A.ctx.currentTime;
  [659.25, 783.99, 987.77].forEach((f, i) => synthNote(f, t + i * 0.07, 0.5, 'sine', 0.2));
}
function sfxKnock() {
  if (!A.ctx || STATE.musicMuted) return;
  resumeCtx();
  synthNote(120, A.ctx.currentTime, 0.16, 'square', 0.14);
}
function sfxBell() {
  if (!A.ctx || STATE.musicMuted) return;
  resumeCtx();
  const t = A.ctx.currentTime;
  [1046.5, 1318.5, 1568].forEach((f, i) => synthNote(f, t + i * 0.12, 1.1, 'sine', 0.16));
}
function sfxShimmer() {
  if (!A.ctx || STATE.musicMuted) return;
  resumeCtx();
  const t = A.ctx.currentTime;
  [880, 1174.7, 1568, 1760].forEach((f, i) => synthNote(f, t + i * 0.05, 0.4, 'triangle', 0.12));
}

/* ================= progress UI ================= */
function buildProgressDots() {
  const wrap = $('step-dots');
  wrap.innerHTML = '';
  for (let i = 1; i <= TOTAL; i++) wrap.appendChild(document.createElement('i'));
}
function updateProgress(n) {
  const dots = $('step-dots').children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].className = '';
    if (i + 1 < n) dots[i].classList.add('done');
    if (i + 1 === n) dots[i].classList.add('active');
  }
  $('step-label').textContent = n + '/' + TOTAL;
}

/* ================= scene engine ================= */
function nextScene() {
  const cur = $('scene-' + STATE.currentScene);
  const next = STATE.currentScene + 1;
  if (next > TOTAL) return;
  cur.classList.add('leaving');
  sfxChime();
  setTimeout(() => {
    cur.classList.remove('active', 'leaving');
    STATE.currentScene = next;
    localStorage.setItem(SCENE_KEY, String(next));
    const el = $('scene-' + next);
    el.classList.add('active');
    $('stage').scrollTop = 0;
    updateProgress(next);
    onSceneEnter(next);
    spawnFloaters(3);
  }, 370);
}

function completeScene(n, msg) {
  const btn = $('btn-' + n + '-next');
  const st = $('st-' + n);
  if (btn) btn.classList.remove('hidden');
  if (st) st.classList.add('ok');
  celebrate(msg);
}

function onSceneEnter(n) {
  if (n === 5) resetScratch();
  if (n === 7) startRain();
  else stopRain();
  if (n === 13) resetLetter();
  if (n === 14) {
    launchFinale();
    showGif('gif-s14');
    bloomBurst({ count: 40 });
    spawnFloaters(9, ['💛', '🤍', '🌙', '✨', '💍', '🕊️', '🌹']);
    sfxBell();
    sfxShimmer();
    startFinaleHearts();
  } else {
    stopFinaleHearts();
  }
}

/* GIF reward helper */
function showGif(id) {
  const g = $(id);
  if (g) g.classList.remove('hidden');
}

/* ================= per-scene logic ================= */

/* --- Scene 1: gerbang --- */
function initScene1() {
  const svg = document.querySelector('#gate-toy .gate-svg');
  let taps = 0;
  const hit = () => {
    if (taps >= 3) return;
    taps++;
    sfxKnock();
    vibrate(12);
    $('st-1').textContent = 'Gerbang ' + taps + '/3';
    svg.style.transform = 'translateX(' + (taps % 2 ? 3 : -3) + 'px)';
    setTimeout(() => { svg.style.transform = ''; }, 120);
    if (taps >= 3) {
      svg.classList.add('open');
      $('gate-glow').setAttribute('opacity', '1');
      showGif('gif-s1');
      $('st-1').textContent = 'Gerbang terbuka!';
      sfxShimmer();
      completeScene(1, 'MasyaAllah… gerbang terbuka 🌙');
    }
  };
  svg.addEventListener('click', hit);
}

/* --- Scene 2: bintang --- */
function initScene2() {
  let got = 0;
  document.querySelectorAll('.star-btn').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.classList.contains('got')) return;
      b.classList.add('got');
      got++;
      sfxChime();
      vibrate(10);
      spawnFloaters(1, ['⭐', '✨']);
      $('st-2').textContent = 'Bintang ' + got + '/5';
      if (got >= 5) completeScene(2, '5 bintang ilmu terkumpul ✨');
    });
  });
}

/* --- Scene 3: kereta --- */
function initScene3() {
  const r = $('train-range');
  const car = $('train-car');
  const whisper = document.querySelector('#scene-3 .whisper');
  const paint = (v) => {
    r.style.background = 'linear-gradient(90deg, var(--gold) ' + v + '%, rgba(246,239,221,.18) ' + v + '%)';
    car.setAttribute('transform', 'translate(' + (v * 1.15) + ' 0)');
    $('st-3').textContent = 'Jarak ' + v + '%';
    if (v >= 95 && !r.dataset.done) {
      r.dataset.done = '1';
      const meet = $('meet-text-3');
      if (meet) meet.classList.remove('hidden');
      bloomBurst({ count: 56 });
      sfxShimmer();
      if (whisper) {
        whisper.classList.add('reveal');
        setTimeout(() => whisper.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 250);
      }
      $('st-3').textContent = 'Bertemu! Tatapan pertama 💓';
      completeScene(3, 'Tatapan pertama… deg! 💓');
    }
  };
  r.addEventListener('input', () => paint(+r.value));
  paint(0);
}

/* --- Scene 4: segel surat --- */
function initScene4() {
  const svg = document.querySelector('#letter-toy .scroll-svg');
  $('wax-seal').addEventListener('click', () => {
    if (svg.classList.contains('broken')) return;
    svg.classList.add('broken');
    $('letter-reveal').setAttribute('opacity', '1');
    $('st-4').textContent = 'Segel terbuka!';
    const kalli = $('kalli-text-4');
    if (kalli) kalli.classList.remove('hidden');
    spawnFloaters(7, ['✒️', '🪶', '📜', '✨', '💛']);
    sfxShimmer();
    vibrate(15);
    completeScene(4, 'Rahasia terungkap 💌');
  });
}

/* --- Scene 5: gosok diary --- */
let scratchState = { active: false, revealed: 0, moves: 0, done: false };
function resetScratch() {
  const cv = $('scratch-canvas');
  const page = cv.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const w = page.clientWidth, h = page.clientHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#8b5a2b'); grad.addColorStop(1, '#5c3a17');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(246,239,221,.85)';
  ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('gosok di sini… 🖊️', w / 2, h / 2 + 5);
  scratchState = { active: false, revealed: 0, moves: 0, done: false };
  const st = $('st-5');
  st.textContent = 'Terkunci 0%';
  st.classList.remove('ok');
  $('btn-5-next').classList.add('hidden');
}
function initScene5() {
  const cv = $('scratch-canvas');
  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const erase = (e) => {
    if (!scratchState.active || scratchState.done) return;
    e.preventDefault();
    const { x, y } = pos(e);
    const ctx = cv.getContext('2d');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    scratchState.moves++;
    if (scratchState.moves % 7 === 0) checkReveal();
  };
  cv.addEventListener('pointerdown', (e) => {
    scratchState.active = true;
    cv.setPointerCapture(e.pointerId);
    erase(e);
  });
  cv.addEventListener('pointermove', erase);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) =>
    cv.addEventListener(ev, () => { scratchState.active = false; }));
}
function checkReveal() {
  const cv = $('scratch-canvas');
  const ctx = cv.getContext('2d');
  const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
  let clear = 0, total = 0;
  for (let i = 3; i < d.length; i += 4 * 16) { total++; if (d[i] < 100) clear++; }
  const pct = Math.round((clear / total) * 100);
  scratchState.revealed = pct;
  $('st-5').textContent = 'Terkunci ' + pct + '%';
  if (pct >= 42 && !scratchState.done) {
    scratchState.done = true;
    const ctx2 = cv.getContext('2d');
    ctx2.clearRect(0, 0, cv.width, cv.height);
    cv.style.transition = 'opacity .5s'; cv.style.opacity = '0';
    showGif('gif-s5');
    $('st-5').textContent = 'Diary terbuka!';
    sfxShimmer();
    completeScene(5, 'Diary Maria terbuka… jujur ya 💗');
    setTimeout(() => { cv.style.opacity = ''; cv.style.pointerEvents = 'none'; }, 520);
  }
}

/* --- Scene 6: permata --- */
function initScene6() {
  document.querySelectorAll('.gem-btn').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.classList.contains('chosen')) return;
      b.classList.add('chosen');
      document.querySelectorAll('.gem-btn').forEach((o) => {
        if (o !== b) o.classList.add('dimmed');
      });
      $('gem-answer').classList.remove('hidden');
      $('st-6').textContent = 'Kejujuran dipilih 💎';
      sfxShimmer();
      completeScene(6, 'Kejujuran memang paling indah 💎');
    });
  });
}

/* --- Scene 7: perisai (tahan 3s) --- */
let rainTimer = null;
function spawnDrop() {
  const zone = $('rain-zone');
  if (!zone) return;
  const d = document.createElement('span');
  d.className = 'rain-drop';
  d.style.left = rand(4, 94) + '%';
  d.style.animationDuration = rand(0.8, 1.4) + 's';
  zone.appendChild(d);
  setTimeout(() => d.remove(), 1600);
}
function startRain() {
  stopRain();
  rainTimer = setInterval(spawnDrop, 150);
}
function stopRain() {
  clearInterval(rainTimer);
  rainTimer = null;
}
function initScene7() {
  const btn = $('shield-btn');
  const ring = $('shield-progress');
  let holding = false, t0 = 0, raf = null, held = 0;
  const need = 3000;
  const tick = () => {
    if (!holding) return;
    held = Math.min(need, held + (performance.now() - t0));
    t0 = performance.now();
    $('st-7').textContent = 'Tahan ' + (held / 1000).toFixed(1) + '/3.0s';
    if (held >= need) {
      holding = false;
      ring.classList.remove('on');
      btn.classList.add('done');
      stopRain();
      $('st-7').textContent = 'Noura aman!';
      sfxShimmer();
      completeScene(7, 'Noura aman… kamu hebat 🛡️');
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const down = (e) => {
    e.preventDefault();
    if (held >= need) return;
    holding = true; t0 = performance.now();
    ring.classList.add('on');
    startRain();
    raf = requestAnimationFrame(tick);
  };
  const up = () => {
    if (!holding) return;
    holding = false;
    ring.classList.remove('on');
    cancelAnimationFrame(raf);
    if (held < need) {
      held = Math.max(0, held - 600);
      $('st-7').textContent = 'Tahan ' + (held / 1000).toFixed(1) + '/3.0s';
    }
  };
  btn.addEventListener('pointerdown', down);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => btn.addEventListener(ev, up));
}

/* --- Scene 8: cincin --- */
function initScene8() {
  const r = $('ring-range');
  const L = $('ring-left'), R = $('ring-right');
  const paint = (v) => {
    r.style.background = 'linear-gradient(90deg, var(--gold) ' + v + '%, rgba(246,239,221,.18) ' + v + '%)';
    const spread = 28 * (1 - v / 100);
    L.setAttribute('transform', 'translate(' + (-spread) + ' 0)');
    R.setAttribute('transform', 'translate(' + spread + ' 0)');
    $('ring-glow').setAttribute('opacity', String(v / 100 * 0.45));
    $('st-8').textContent = 'Cincin ' + v + '%';
    if (v >= 96 && !r.dataset.done) {
      r.dataset.done = '1';
      $('ring-diamond').setAttribute('opacity', '1');
      $('ring-glow').setAttribute('opacity', '0.75');
      showGif('gif-s8');
      sfxBell();
      completeScene(8, 'Cincin menyatu… insya Allah 💍');
    }
  };
  r.addEventListener('input', () => paint(+r.value));
  paint(0);
}

/* --- Scene 9: akad (tahan 2s) --- */
function initScene9() {
  const btn = $('akad-btn'), fill = $('akad-fill');
  let holding = false, t0 = 0, held = 0, raf = null;
  const need = 2000;
  const tick = () => {
    if (!holding) return;
    held = Math.min(need, held + (performance.now() - t0));
    t0 = performance.now();
    fill.style.width = (held / need * 100) + '%';
    $('akad-heart').setAttribute('r', String(6 + held / need * 9));
    if (held >= need) {
      holding = false;
      btn.classList.add('done');
      $('akad-heart').setAttribute('fill', '#e0526a');
      $('st-9').textContent = 'Akad sempurna!';
      showGif('gif-s9');
      sfxBell();
      spawnFloaters(8, ['🕊️', '✨', '💛']);
      completeScene(9, 'Mabruk! Akad sempurna 🕊️');
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const down = (e) => {
    e.preventDefault();
    if (held >= need) return;
    holding = true; t0 = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const up = () => {
    if (!holding) return;
    holding = false;
    cancelAnimationFrame(raf);
    if (held < need) { held = 0; fill.style.width = '0%'; $('akad-heart').setAttribute('r', '6'); }
  };
  btn.addEventListener('pointerdown', down);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => btn.addEventListener(ev, up));
}

/* --- Scene 10: penjara --- */
function initScene10() {
  let found = 0;
  document.querySelectorAll('.light-dot').forEach((d) => {
    d.addEventListener('click', () => {
      if (d.classList.contains('found')) return;
      d.classList.add('found');
      found++;
      sfxChime();
      spawnFloaters(1, ['🌟', '✨']);
      $('st-10').textContent = 'Cahaya ' + found + '/6';
      if (found >= 6) {
        document.querySelector('.prison-bars').style.opacity = '0.22';
        completeScene(10, 'Kebenaran menemukan jalan 🌟');
      }
    });
  });
}

/* --- Scene 11: doa (tahan 4s) --- */
function initScene11() {
  const btn = $('doa-btn'), fill = $('doa-fill'), rays = $('doa-rays');
  let holding = false, t0 = 0, held = 0, raf = null, lastF = 0;
  const need = 4000;
  const tick = () => {
    if (!holding) return;
    const now = performance.now();
    held = Math.min(need, held + (now - t0));
    t0 = now;
    const p = held / need;
    fill.style.width = (p * 100) + '%';
    rays.querySelectorAll('span').forEach((s) => { s.style.height = (p * 74) + 'px'; });
    if (now - lastF > 450) { lastF = now; spawnFloaters(2, ['🤲', '✨', '🌙']); }
    $('st-11').textContent = 'Doa ' + (held / 1000).toFixed(1) + '/4.0s';
    if (held >= need) {
      holding = false;
      btn.classList.add('done');
      rays.classList.add('on');
      $('st-11').textContent = 'Doamu terkirim 🤲';
      showGif('gif-s11');
      sfxShimmer();
      completeScene(11, 'Doamu terkirim… 🤲');
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const down = (e) => {
    e.preventDefault();
    if (held >= need) return;
    holding = true; t0 = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const up = () => {
    if (!holding) return;
    holding = false;
    cancelAnimationFrame(raf);
    if (held < need) { held = Math.max(0, held - 800); fill.style.width = (held / need * 100) + '%'; }
  };
  btn.addEventListener('pointerdown', down);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => btn.addEventListener(ev, up));
}

/* --- Scene 12: lentera --- */
function initScene12() {
  let lit = 0;
  document.querySelectorAll('.lantern').forEach((l) => {
    l.addEventListener('click', () => {
      if (l.classList.contains('lit')) return;
      l.classList.add('lit');
      lit++;
      sfxChime();
      vibrate(10);
      $('st-12').textContent = 'Lentera ' + lit + '/4';
      if (lit >= 4) {
        $('room-glow').classList.add('on');
        sfxShimmer();
        spawnFloaters(8, ['✨', '🏮', '💛']);
        completeScene(12, 'Cahaya iman menyala ✨');
      }
    });
  });
}

/* --- Scene 13: surat ketikan --- */
const LETTER_TEXT =
  'Kepada kamu yang membaca ini…\n\n' +
  'Aku bukan Fahri yang sempurna. Aku hanya manusia biasa yang jatuh cinta pada cara kamu berdoa, pada suara tawa kamu, dan pada diam kamu yang penuh makna.\n\n' +
  'Jika suatu hari dunia menulis cinta dengan rumit, aku ingin menulismu dengan sederhana: aku, kamu, dan doa yang sama setiap malam.\n\n' +
  '— untukmu, dari seseorang yang mencintaimu karena Allah. 💛';
let typeTimer = null;
let noteTimer = null;
let letterPhase = 'closed';   // closed | intro | typing | done
let letterPos = 0;
let scene13Done = false;

function letterEls() {
  return {
    card: $('envelope-card'),
    out: $('typed-text'),
    caret: $('caret'),
    note: $('letter-note-13')
  };
}

/* surat tertutup — tidak auto buka, menunggu ketukan */
function resetLetter() {
  clearInterval(typeTimer);
  clearTimeout(noteTimer);
  const e = letterEls();
  letterPhase = 'closed';
  letterPos = 0;
  e.card.classList.remove('opened');
  e.out.textContent = '';
  e.caret.classList.add('off');
  $('envelope-label').textContent = 'Ketuk untuk membuka surat 💌';
  if (e.note) e.note.classList.add('hidden');
  $('st-13').textContent = 'Ketuk surat untuk membuka 💌';
  $('st-13').classList.remove('ok');
  $('btn-13-next').classList.add('hidden');
  scene13Done = false;
}

/* buka amplop: flap terbuka + Bismillah & Salam lengkap menetap di atas surat */
function openLetter() {
  if (letterPhase !== 'closed') return;
  const e = letterEls();
  letterPhase = 'intro';
  e.card.classList.add('opened');
  $('envelope-label').textContent = 'Untukmu, yang membaca ini…';
  if (e.note) e.note.classList.remove('hidden');
  $('st-13').textContent = 'Surat dibuka 📜';
  sfxShimmer();
  vibrate(12);
  noteTimer = setTimeout(() => { if (letterPhase === 'intro') beginTyping(); }, 2200);
}

/* setelah salam, huruf mulai diketik (pembuka tetap di atas) */
function beginTyping() {
  if (letterPhase === 'typing' || letterPhase === 'done') return;
  const e = letterEls();
  letterPhase = 'typing';
  e.caret.classList.remove('off');
  $('st-13').textContent = 'Menulis… 0%';
  let hold = 0; /* jeda antartik (tick) biar temponya seperti orang membaca */
  typeTimer = setInterval(() => {
    if (hold > 0) { hold--; return; }
    letterPos += 1;
    const ch = LETTER_TEXT.charAt(letterPos - 1);
    if (ch === '\n') hold = 14;                                  /* jeda antar paragraf */
    else if (ch === '.' || ch === '…' || ch === '!' || ch === '?') hold = 7; /* jeda akhir kalimat */
    e.out.textContent = LETTER_TEXT.slice(0, letterPos);
    const pct = Math.min(100, Math.round((letterPos / LETTER_TEXT.length) * 100));
    $('st-13').textContent = 'Menulis… ' + pct + '%';
    $('stage').scrollTop = $('stage').scrollHeight;
    if (letterPos >= LETTER_TEXT.length) finishLetter();
  }, 42);
}

function finishLetter() {
  const e = letterEls();
  clearInterval(typeTimer);
  clearTimeout(noteTimer);
  letterPhase = 'done';
  e.out.textContent = LETTER_TEXT;
  e.caret.classList.add('off');
  $('st-13').textContent = 'Surat selesai dibaca 🌙';
  completeScene13Once();
}

function onLetterTap() {
  if (letterPhase === 'closed') openLetter();
  else if (letterPhase === 'intro') { clearTimeout(noteTimer); beginTyping(); }
  else if (letterPhase === 'typing') finishLetter();
}

function completeScene13Once() {
  if (scene13Done) return;
  scene13Done = true;
  sfxShimmer();
  completeScene(13, 'Suratnya selesai… baper? 🌙');
}
function initScene13() {
  scene13Done = false;
  $('envelope-card').onclick = onLetterTap;
}

/* --- Scene 14: finale --- */
function initScene14() {
  $('btn-restart').addEventListener('click', () => {
    localStorage.removeItem(SCENE_KEY);
    location.reload();
  });
}

/* ================= canvases ================= */
function initAmbient() {
  const cv = $('ambient-canvas');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, parts = [];
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    W = cv.width = innerWidth * dpr;
    H = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts = [];
    const n = Math.round(innerWidth / 16);
    for (let i = 0; i < n; i++) {
      parts.push({
        x: rand(0, innerWidth), y: rand(0, innerHeight),
        r: rand(0.7, 2.4), s: rand(0.15, 0.55),
        a: rand(0.25, 0.8), hue: Math.random() < 0.75 ? '240,199,94' : '224,82,106',
        ph: rand(0, Math.PI * 2)
      });
    }
  };
  resize();
  addEventListener('resize', resize);
  let t = 0;
  (function loop() {
    t += 0.016;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.y -= p.s;
      p.x += Math.sin(t + p.ph) * 0.22;
      if (p.y < -6) { p.y = innerHeight + 6; p.x = rand(0, innerWidth); }
      const tw = 0.6 + 0.4 * Math.sin(t * 2 + p.ph);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.hue + ',' + (p.a * tw) + ')';
      ctx.fill();
    }
    requestAnimationFrame(loop);
  })();
}

function launchFinale() {
  const cv = $('finale-canvas');
  const ctx = cv.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = ['#f0c75e', '#d4af37', '#e0526a', '#f6efdd', '#7dd3fc'];
  const bits = [];
  for (let i = 0; i < 130; i++) {
    bits.push({
      x: rand(0, innerWidth), y: rand(-innerHeight * 0.5, -10),
      w: rand(5, 11), h: rand(8, 16),
      vy: rand(1.6, 4.4), vx: rand(-0.9, 0.9),
      rot: rand(0, Math.PI * 2), vr: rand(-0.14, 0.14),
      c: colors[Math.floor(Math.random() * colors.length)],
      sw: Math.random() < 0.5
    });
  }
  const t0 = performance.now();
  (function anim(now) {
    const el = now - t0;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.y += b.vy; b.x += b.vx + Math.sin(b.y / 34) * 0.5; b.rot += b.vr;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = b.c;
      if (b.sw) {
        ctx.beginPath();
        ctx.moveTo(0, -b.h / 2);
        ctx.quadraticCurveTo(b.w, 0, 0, b.h / 2);
        ctx.quadraticCurveTo(-b.w, 0, 0, -b.h / 2);
        ctx.fill();
      } else {
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      }
      ctx.restore();
    }
    if (el < 6500) requestAnimationFrame(anim);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}

/* hujan hati kecil pelan selama finale (biar adem & baper) */
let finaleHeartTimer = null;
function startFinaleHearts() {
  stopFinaleHearts();
  finaleHeartTimer = setInterval(() => {
    spawnFloaters(1, ['💛', '🤍', '🌙', '✨', '🌹', '💍']);
  }, 1250);
}
function stopFinaleHearts() {
  clearInterval(finaleHeartTimer);
  finaleHeartTimer = null;
}

/* ================= boot ================= */
function bindNextButtons() {
  for (let n = 1; n <= 13; n++) {
    const b = $('btn-' + n + '-next');
    if (b) b.addEventListener('click', nextScene);
  }
}

function unlockAudio() {
  if (STATE.audioUnlocked) return;
  STATE.audioUnlocked = true;
  ensureAudio();
  resumeCtx();
  if (!STATE.musicMuted) startMusic();
}

function init() {
  buildProgressDots();
  const start = STATE.currentScene;
  for (let n = 1; n <= TOTAL; n++) {
    const el = $('scene-' + n);
    if (n === start) el.classList.add('active');
    else el.classList.remove('active');
  }
  updateProgress(start);

  hookAudioErrors();
  bindNextButtons();

  initScene1(); initScene2(); initScene3(); initScene4(); initScene5();
  initScene6(); initScene7(); initScene8(); initScene9(); initScene10();
  initScene11(); initScene12(); initScene13(); initScene14();
  initAmbient();

  $('music-pill').addEventListener('click', toggleMusic);
  document.addEventListener('pointerdown', unlockAudio, { once: false });
  document.addEventListener('keydown', unlockAudio, { once: true });

  onSceneEnter(start);
  updateMusicUI(false);

  if (start > 1) showToast('Melanjutkan dari babak ' + start + ' 🌙', 2000);
}

document.addEventListener('DOMContentLoaded', init);
