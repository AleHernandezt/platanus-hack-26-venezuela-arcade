// =============================================================================
// PLATANUS HACK 26: ARCADE CHALLENGE (CARACAS)
// JUEGO: Florentino y el Diablo
// Un contrapunteo arcade llanero con espíritu de rap venezolano.
// =============================================================================

const W = 800;
const H = 600;
const STORAGE_KEY = 'florentino-diablo-highscores-v2';
const MAX_SCORES = 5;
const NAME_LENGTH = 3;

// Mapeo físico inmutable de la máquina arcade física
const CABINET_KEYS = {
  P1_U: ['w'],
  P1_D: ['s'],
  P1_L: ['a'],
  P1_R: ['d'],
  P1_1: ['u'],
  P1_2: ['i'],
  P1_3: ['o'],
  P1_4: ['j'],
  P1_5: ['k'],
  P1_6: ['l'],
  P2_U: ['ArrowUp'],
  P2_D: ['ArrowDown'],
  P2_L: ['ArrowLeft'],
  P2_R: ['ArrowRight'],
  P2_1: ['r'],
  P2_2: ['t'],
  P2_3: ['y'],
  P2_4: ['f'],
  P2_5: ['g'],
  P2_6: ['h'],
  START1: ['Enter'],
  START2: ['2'],
};

const KEY_TO_ARCADE = {};
for (const [code, keys] of Object.entries(CABINET_KEYS)) {
  for (const k of keys) {
    KEY_TO_ARCADE[k.length === 1 ? k.toLowerCase() : k] = code;
  }
}

const inputState = {
  held: Object.create(null),
  justPressed: Object.create(null),
};

window.addEventListener('keydown', (e) => {
  initAudioOnFirstKey();
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const code = KEY_TO_ARCADE[k];
  if (code) {
    if (!inputState.held[code]) {
      inputState.justPressed[code] = true;
    }
    inputState.held[code] = true;
  }
});

window.addEventListener('keyup', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const code = KEY_TO_ARCADE[k];
  if (code) {
    inputState.held[code] = false;
  }
});

function wasPressed(code) {
  if (inputState.justPressed[code]) {
    inputState.justPressed[code] = false;
    return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// MOTOR DE AUDIO (Web Audio con progresión IVm - Im - V7 - Im y modulación Dm -> D#m -> Em)
// -----------------------------------------------------------------------------
let audioCtx = null;
let musicSchedulerTimer = null;
const INITIAL_BPM = 106;
let currentBpm = INITIAL_BPM;
let isMusicPlaying = false;
let currentPatternIndex = 0;
let nextStepTime = 0;
let currentMusicMode = 'joropo'; // 'joropo', 'rap', 'fusion'
let currentKeyRoot = 'Dm'; // 'Dm', 'D#m', 'Em'

function initAudioOnFirstKey() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Tabla de frecuencias por semitono (octavas 3 a 5)
const FREQS = {
  // Octava 3
  C3: 130.81, 'C#3': 138.59, D3: 146.83, 'D#3': 155.56, E3: 164.81, F3: 174.61, 'F#3': 185.00, G3: 196.00, 'G#3': 207.65, A3: 220.00, 'A#3': 233.08, B3: 246.94,
  // Octava 4
  C4: 261.63, 'C#4': 277.18, D4: 293.66, 'D#4': 311.13, E4: 329.63, F4: 349.23, 'F#4': 369.99, G4: 392.00, 'G#4': 415.30, A4: 440.00, 'A#4': 466.16, B4: 493.88,
  // Octava 5
  C5: 523.25, 'C#5': 554.37, D5: 587.33, 'D#5': 622.25, E5: 659.25, F5: 698.46, 'F#5': 739.99, G5: 783.99, 'G#5': 830.61, A5: 880.00, 'A#5': 932.33, B5: 987.77,
};

// Definición de progresiones armónicas: IVm -> Im -> V7 -> Im (+ acorde de paso para modular)
// Tonalidad Dm:  IVm = Gm (G-Bb-D),   Im = Dm (D-F-A),    V7 = A7 (A-C#-E-G)
// Paso a D#m:    Bb7 (Bb-D-F-Ab) -> D#m
// Tonalidad D#m: IVm = G#m (G#-B-D#), Im = D#m (D#-F#-A#), V7 = A#7 (A#-D-F-G#)
// Paso a Em:     B7 (B-D#-F#-A) -> Em
// Tonalidad Em:  IVm = Am (A-C-E),    Im = Em (E-G-B),    V7 = B7 (B-D#-F#-A)

const CHORD_PROGRESSIONS = {
  Dm: [
    // 1. IVm: Gm
    { harp: FREQS.G4, cuatro: [FREQS.G3, FREQS['A#4'], FREQS.D4], maraca: true },
    { harp: FREQS['A#4'], cuatro: null, maraca: false },
    { harp: FREQS.D5, cuatro: [FREQS.G3, FREQS['A#4'], FREQS.D4], maraca: true },
    { harp: FREQS['A#4'], cuatro: null, maraca: false },
    // 2. Im: Dm
    { harp: FREQS.D4, cuatro: [FREQS.D3, FREQS.F4, FREQS.A4], maraca: true },
    { harp: FREQS.F4, cuatro: null, maraca: false },
    { harp: FREQS.A4, cuatro: [FREQS.D3, FREQS.F4, FREQS.A4], maraca: true },
    { harp: FREQS.D5, cuatro: null, maraca: false },
    // 3. V7: A7
    { harp: FREQS.A4, cuatro: [FREQS.A3, FREQS['C#4'], FREQS.E4, FREQS.G4], maraca: true },
    { harp: FREQS['C#5'], cuatro: null, maraca: false },
    { harp: FREQS.E5, cuatro: [FREQS.A3, FREQS['C#4'], FREQS.E4, FREQS.G4], maraca: true },
    { harp: FREQS.G4, cuatro: null, maraca: false },
    // 4. Im: Dm
    { harp: FREQS.F4, cuatro: [FREQS.D3, FREQS.F4, FREQS.A4], maraca: true },
    { harp: FREQS.D4, cuatro: null, maraca: false },
    { harp: FREQS.A4, cuatro: [FREQS.D3, FREQS.F4, FREQS.A4], maraca: true },
    { harp: FREQS.D5, cuatro: null, maraca: false },
    // Acorde de paso a D#m (Bb7)
    { harp: FREQS['A#4'], cuatro: [FREQS['A#3'], FREQS.D4, FREQS.F4, FREQS['G#4']], maraca: true },
    { harp: FREQS.F5, cuatro: null, maraca: false },
  ],
  'D#m': [
    // 1. IVm: G#m
    { harp: FREQS['G#4'], cuatro: [FREQS['G#3'], FREQS.B4, FREQS['D#4']], maraca: true },
    { harp: FREQS.B4, cuatro: null, maraca: false },
    { harp: FREQS['D#5'], cuatro: [FREQS['G#3'], FREQS.B4, FREQS['D#4']], maraca: true },
    { harp: FREQS.B4, cuatro: null, maraca: false },
    // 2. Im: D#m
    { harp: FREQS['D#4'], cuatro: [FREQS['D#3'], FREQS['F#4'], FREQS['A#4']], maraca: true },
    { harp: FREQS['F#4'], cuatro: null, maraca: false },
    { harp: FREQS['A#4'], cuatro: [FREQS['D#3'], FREQS['F#4'], FREQS['A#4']], maraca: true },
    { harp: FREQS['D#5'], cuatro: null, maraca: false },
    // 3. V7: A#7
    { harp: FREQS['A#4'], cuatro: [FREQS['A#3'], FREQS.D4, FREQS.F4, FREQS['G#4']], maraca: true },
    { harp: FREQS.D5, cuatro: null, maraca: false },
    { harp: FREQS.F5, cuatro: [FREQS['A#3'], FREQS.D4, FREQS.F4, FREQS['G#4']], maraca: true },
    { harp: FREQS['G#4'], cuatro: null, maraca: false },
    // 4. Im: D#m
    { harp: FREQS['F#4'], cuatro: [FREQS['D#3'], FREQS['F#4'], FREQS['A#4']], maraca: true },
    { harp: FREQS['D#4'], cuatro: null, maraca: false },
    { harp: FREQS['A#4'], cuatro: [FREQS['D#3'], FREQS['F#4'], FREQS['A#4']], maraca: true },
    { harp: FREQS['D#5'], cuatro: null, maraca: false },
    // Acorde de paso a Em (B7)
    { harp: FREQS.B4, cuatro: [FREQS.B3, FREQS['D#4'], FREQS['F#4'], FREQS.A4], maraca: true },
    { harp: FREQS['F#5'], cuatro: null, maraca: false },
  ],
  Em: [
    // 1. IVm: Am
    { harp: FREQS.A4, cuatro: [FREQS.A3, FREQS.C4, FREQS.E4], maraca: true },
    { harp: FREQS.C5, cuatro: null, maraca: false },
    { harp: FREQS.E5, cuatro: [FREQS.A3, FREQS.C4, FREQS.E4], maraca: true },
    { harp: FREQS.C5, cuatro: null, maraca: false },
    // 2. Im: Em
    { harp: FREQS.E4, cuatro: [FREQS.E3, FREQS.G4, FREQS.B4], maraca: true },
    { harp: FREQS.G4, cuatro: null, maraca: false },
    { harp: FREQS.B4, cuatro: [FREQS.E3, FREQS.G4, FREQS.B4], maraca: true },
    { harp: FREQS.E5, cuatro: null, maraca: false },
    // 3. V7: B7
    { harp: FREQS.B4, cuatro: [FREQS.B3, FREQS['D#4'], FREQS['F#4'], FREQS.A4], maraca: true },
    { harp: FREQS['D#5'], cuatro: null, maraca: false },
    { harp: FREQS['F#5'], cuatro: [FREQS.B3, FREQS['D#4'], FREQS['F#4'], FREQS.A4], maraca: true },
    { harp: FREQS.A4, cuatro: null, maraca: false },
    // 4. Im: Em
    { harp: FREQS.G4, cuatro: [FREQS.E3, FREQS.G4, FREQS.B4], maraca: true },
    { harp: FREQS.E4, cuatro: null, maraca: false },
    { harp: FREQS.B4, cuatro: [FREQS.E3, FREQS.G4, FREQS.B4], maraca: true },
    { harp: FREQS.E5, cuatro: null, maraca: false },
  ],
};

function playMaraca(time, accent) {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * 0.035;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(4500, time);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(accent ? 0.12 : 0.05, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start(time);
}

function playCuatroChit(time, chordNotes) {
  if (!audioCtx || !chordNotes) return;
  chordNotes.forEach((f, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, time + idx * 0.008);
    gain.gain.setValueAtTime(0.05, time + idx * 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.008 + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time + idx * 0.008);
    osc.stop(time + idx * 0.008 + 0.09);
  });
}

function playArpaNote(time, freq, dur = 0.18) {
  if (!audioCtx || !freq) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0.08, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + dur);
}

function playHipHopKick(time) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);
  gain.gain.setValueAtTime(0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + 0.19);
}

function playHipHopSnare(time) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, time);
  oscGain.gain.setValueAtTime(0.08, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
  osc.connect(oscGain);
  oscGain.connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + 0.1);

  const bufSize = audioCtx.sampleRate * 0.1;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.28));
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.12, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  src.connect(gain);
  gain.connect(audioCtx.destination);
  src.start(time);
}

function playSfxSuccess() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  playArpaNote(now, FREQS.D5, 0.12);
  playArpaNote(now + 0.08, FREQS.F5, 0.15);
  playArpaNote(now + 0.16, FREQS.A5, 0.25);
}

function playSfxFail() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.linearRampToValueAtTime(55, now + 0.25);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.26);
}

function playSfxDevilVoice() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(75, now);
  osc.frequency.setValueAtTime(95, now + 0.08);
  osc.frequency.setValueAtTime(65, now + 0.18);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.32);
}

function playSfxNav() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  playArpaNote(now, 440, 0.05);
}

function scheduleMusicStep() {
  if (!isMusicPlaying || !audioCtx) return;
  const currentTime = audioCtx.currentTime;
  const isJoropo = (currentMusicMode === 'joropo');
  const stepDuration = (60 / currentBpm) / (isJoropo ? 3 : 4);
  const currentProg = CHORD_PROGRESSIONS[currentKeyRoot] || CHORD_PROGRESSIONS.Dm;
  
  while (nextStepTime < currentTime + 0.15) {
    const step = currentProg[currentPatternIndex % currentProg.length];

    if (currentMusicMode === 'joropo') {
      if (step.maraca) playMaraca(nextStepTime, currentPatternIndex % 3 === 0);
      if (step.cuatro) playCuatroChit(nextStepTime, step.cuatro);
      if (step.harp) playArpaNote(nextStepTime, step.harp, stepDuration * 1.5);
    } else if (currentMusicMode === 'rap') {
      if (currentPatternIndex % 4 === 0) playHipHopKick(nextStepTime);
      if (currentPatternIndex % 4 === 2) playHipHopSnare(nextStepTime);
      playMaraca(nextStepTime, currentPatternIndex % 2 === 0);
      if (step.harp) playArpaNote(nextStepTime, step.harp * 0.5, stepDuration);
    } else {
      // Fusión final joropo + rap
      if (currentPatternIndex % 4 === 0) playHipHopKick(nextStepTime);
      if (currentPatternIndex % 4 === 2) playHipHopSnare(nextStepTime);
      if (step.cuatro) playCuatroChit(nextStepTime, step.cuatro);
      if (step.harp) playArpaNote(nextStepTime, step.harp, stepDuration);
    }

    nextStepTime += stepDuration;
    currentPatternIndex++;
  }
}

function startMusic() {
  isMusicPlaying = true;
  if (audioCtx) nextStepTime = audioCtx.currentTime + 0.05;
  if (!musicSchedulerTimer) {
    musicSchedulerTimer = setInterval(scheduleMusicStep, 25);
  }
}

function resetMusicToTitle() {
  currentBpm = INITIAL_BPM;
  currentMusicMode = 'joropo';
  currentKeyRoot = 'Dm';
  currentPatternIndex = 0;
}

// -----------------------------------------------------------------------------
// BANCO DE VERSOS ORIGINALES (Mapeo estricto 4-Way: Arriba=W, Abajo=S, Izq=A, Der=D)
// -----------------------------------------------------------------------------
const DUEL_ROUNDS = [
  {
    roundNum: 1,
    title: 'COPLA I: MEDIANOCHE',
    bpm: 108,
    mode: 'joropo',
    keyRoot: 'Dm',
    skyTop: 0x050813,
    skyBottom: 0x1f1930,
    sunY: 650,
    devilLine: '¡Si te dices cantador, échate un verso en el llano,\nque esta noche vengo a ver de qué madera es tu mano!',
    options: {
      P1_U: { label: '▲ ARRIBA (W)', text: '¡Tengo madera de cedro y corazón de sabana!', points: 150, correct: true },
      P1_D: { label: '▼ ABAJO (S)', text: '¡Yo canto cuando me da la regalada gana!', points: 80, correct: false },
      P1_L: { label: '◄ IZQ (A)', text: '¡El cuatro se me aflojó, mejor canto mañana!', points: 30, correct: false },
      P1_R: { label: '► DER (D)', text: '¡No me asusta tu sombrero ni tu capa negra!', points: 90, correct: false },
    },
  },
  {
    roundNum: 2,
    title: 'COPLA II: MADRUGADA (MODULA A D#m)',
    bpm: 122,
    mode: 'joropo',
    keyRoot: 'D#m',
    skyTop: 0x0f112c,
    skyBottom: 0x471d4a,
    sunY: 580,
    devilLine: '¡La candela de mi pecho quema sabana y moriche,\nno hay coplero que me aguante sin que la voz se le achique!',
    options: {
      P1_U: { label: '▲ ARRIBA (W)', text: '¡Mi verso viene del viento y no le teme al replique!', points: 180, correct: true },
      P1_D: { label: '▼ ABAJO (S)', text: '¡Con este trago de caña se me aclara la garganta!', points: 70, correct: false },
      P1_L: { label: '◄ IZQ (A)', text: '¡El agua fresca del río apaga todo tu ardor!', points: 80, correct: false },
      P1_R: { label: '► DER (D)', text: '¡Mucho ruido y pocas nueces para tanta espanta!', points: 100, correct: false },
    },
  },
  {
    roundNum: 3,
    title: 'COPLA III: LA HORA BRUJA (RAP LLANERO - D#m)',
    bpm: 94,
    mode: 'rap',
    keyRoot: 'D#m',
    skyTop: 0x1b1338,
    skyBottom: 0x6e2840,
    sunY: 510,
    devilLine: '¡Pongo rima sobre el bombo, sombra sobre tu garganta,\nel infierno trae compás y tu verso se atraganta!',
    options: {
      P1_U: { label: '▲ ARRIBA (W)', text: '¡Tu rap de azufre barato no me impresiona!', points: 90, correct: false },
      P1_D: { label: '▼ ABAJO (S)', text: '¡Tengo métrica de trueno y este llano no se espanta!', points: 220, correct: true },
      P1_L: { label: '◄ IZQ (A)', text: '¡El Diablo tira freestyle pero no le suena!', points: 110, correct: false },
      P1_R: { label: '► DER (D)', text: '¡Caracas me dio el piquete y el estero la corona!', points: 140, correct: false },
    },
  },
  {
    roundNum: 4,
    title: 'COPLA IV: EL CANTO DEL GALLO (FUSIÓN EN Em)',
    bpm: 132,
    mode: 'fusion',
    keyRoot: 'Em',
    skyTop: 0x2d1a45,
    skyBottom: 0xc45524,
    sunY: 420,
    devilLine: '¡Ya la sombra se disuelve y la noche se me acaba,\nsuelta el cuatro Florentino, que la muerte no te salva!',
    options: {
      P1_U: { label: '▲ ARRIBA (W)', text: '¡Huye pa\' tu cueva oscura antes que te vea!', points: 120, correct: false },
      P1_D: { label: '▼ ABAJO (S)', text: '¡El llano entero celebra la retirada del diablo!', points: 100, correct: false },
      P1_L: { label: '◄ IZQ (A)', text: '¡Florentino no se raja mientras el sol brilla!', points: 130, correct: false },
      P1_R: { label: '► DER (D)', text: '¡Canta el gallo en el corral y el sol bendito ya clarea!', points: 260, correct: true },
    },
  },
];

// -----------------------------------------------------------------------------
// SISTEMA DE ALMACENAMIENTO DE RÉCORDS
// -----------------------------------------------------------------------------
function getStorage() {
  if (window.platanusArcadeStorage) return window.platanusArcadeStorage;
  return {
    async get(key) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? { found: false, value: null } : { found: true, value: JSON.parse(raw) };
      } catch {
        return { found: false, value: null };
      }
    },
    async set(key, val) {
      try {
        window.localStorage.setItem(key, JSON.stringify(val));
      } catch {}
    },
  };
}

async function loadLeaderboard() {
  try {
    const res = await getStorage().get(STORAGE_KEY);
    if (res && res.found && Array.isArray(res.value)) {
      return res.value.filter(e => e && typeof e.name === 'string' && typeof e.score === 'number').slice(0, MAX_SCORES);
    }
  } catch {}
  return [
    { name: 'FLO', score: 850, date: '2026-10-17' },
    { name: 'CAN', score: 700, date: '2026-10-17' },
    { name: 'LLN', score: 550, date: '2026-10-17' },
  ];
}

async function saveLeaderboardEntry(entry) {
  const current = await loadLeaderboard();
  current.push(entry);
  current.sort((a, b) => b.score - a.score);
  const trimmed = current.slice(0, MAX_SCORES);
  try {
    await getStorage().set(STORAGE_KEY, trimmed);
  } catch {}
  return trimmed;
}

// -----------------------------------------------------------------------------
// ESCENA PRINCIPAL
// -----------------------------------------------------------------------------
const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-root',
  backgroundColor: '#05070a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: { create, update },
};

new Phaser.Game(config);

function create() {
  const scene = this;

  scene.gamePhase = 'title'; // 'title', 'instructions', 'battle', 'nameEntry', 'records', 'gameover'
  scene.stars = [];
  scene.fireParticles = [];

  scene.gameState = {
    roundIndex: 0,
    score: 0,
    combo: 0,
    balance: 50,
    selectedDir: 'P1_U',
    roundTimer: 0,
    roundMaxTime: 7500,
    waitingAnswer: false,
    devilScale: 1,
  };

  scene.nameEntry = {
    letters: ['A', 'A', 'A'],
    charIndex: 0,
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(''),
    alphabetIndices: [0, 0, 0],
  };

  createLlanoBackground(scene);
  createCharacterSilhouettes(scene);
  createBattleUI(scene);
  createNameEntryUI(scene);
  createRecordsUI(scene);
  createTitleUI(scene);

  loadLeaderboard().then(scores => {
    scene.cachedLeaderboard = scores;
    refreshLeaderboardView(scene, scores);
  });
}

function update(time, delta) {
  const scene = this;

  if (scene.stars) {
    for (let i = 0; i < scene.stars.length; i++) {
      const s = scene.stars[i];
      s.alpha = (0.3 + 0.7 * Math.abs(Math.sin((time * 0.002) + s.seed))) * scene.starSkyVisibility;
    }
  }

  updateFireParticles(scene, delta);

  if (scene.pressStartText) {
    scene.pressStartText.alpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.005));
  }
  if (scene.devilEyes) {
    scene.devilEyes.alpha = 0.7 + 0.3 * Math.sin(time * 0.006);
  }

  if (scene.gamePhase === 'title') {
    if (wasPressed('START1') || wasPressed('P1_1')) {
      playSfxNav();
      startMusic();
      scene.titleContainer.setVisible(false);
      scene.instructionsContainer.setVisible(true);
      scene.gamePhase = 'instructions';
    } else if (wasPressed('P1_2') || wasPressed('P1_D')) {
      playSfxNav();
      scene.titleContainer.setVisible(false);
      scene.recordsContainer.setVisible(true);
      scene.gamePhase = 'records';
    }
  } else if (scene.gamePhase === 'instructions') {
    if (wasPressed('START1') || wasPressed('P1_1')) {
      playSfxNav();
      scene.instructionsContainer.setVisible(false);
      startBattle(scene);
    }
  } else if (scene.gamePhase === 'battle') {
    updateBattleLoop(scene, delta);
  } else if (scene.gamePhase === 'nameEntry') {
    updateNameEntryLoop(scene);
  } else if (scene.gamePhase === 'records' || scene.gamePhase === 'gameover') {
    if (wasPressed('START1') || wasPressed('P1_1')) {
      playSfxNav();
      resetMusicToTitle();
      scene.recordsContainer.setVisible(false);
      scene.gameOverContainer.setVisible(false);
      scene.titleContainer.setVisible(true);
      scene.battleContainer.setVisible(false);
      resetToNightSky(scene);
      scene.gamePhase = 'title';
    }
  }
}

// -----------------------------------------------------------------------------
// LÓGICA DE BATALLA Y CONTRAPUNTEO
// -----------------------------------------------------------------------------
function startBattle(scene) {
  scene.gamePhase = 'battle';
  scene.gameState.roundIndex = 0;
  scene.gameState.score = 0;
  scene.gameState.combo = 0;
  scene.gameState.balance = 50;
  scene.gameState.devilScale = 1;
  scene.battleContainer.setVisible(true);
  loadRound(scene, 0);
}

function loadRound(scene, roundIdx) {
  const round = DUEL_ROUNDS[roundIdx];
  scene.currentRoundData = round;
  currentBpm = round.bpm;
  currentMusicMode = round.mode;
  currentKeyRoot = round.keyRoot;

  scene.gameState.roundTimer = scene.gameState.roundMaxTime;
  scene.gameState.waitingAnswer = false;
  scene.gameState.selectedDir = 'P1_U';

  transitionSky(scene, round.skyTop, round.skyBottom, round.sunY, 4 - roundIdx);

  scene.optionsBox.setVisible(false);
  scene.feedbackText.setText('');
  scene.roundHeader.setText(`${round.title}  |  PUNTOS: ${scene.gameState.score}`);

  // Mostrar el verso del Diablo y mantenerlo visible
  scene.dialogueBox.setVisible(true);
  scene.speakerName.setText('EL DIABLO RETÓ:');
  scene.speakerName.setColor('#ff3322');
  scene.dialogueText.setText(round.devilLine);
  playSfxDevilVoice();

  scene.time.delayedCall(2200, () => {
    if (scene.gamePhase !== 'battle') return;
    scene.gameState.waitingAnswer = true;
    // Se mantiene el verso del Diablo arriba para que el jugador lo lea mientras elige
    scene.optionsBox.setVisible(true);
    renderOptions(scene);
  });
}

function renderOptions(scene) {
  const round = scene.currentRoundData;
  const sel = scene.gameState.selectedDir;
  const dirs = ['P1_U', 'P1_D', 'P1_L', 'P1_R'];

  dirs.forEach((dirCode) => {
    const card = scene.optionCardMap[dirCode];
    const opt = round.options[dirCode];
    const isSelected = (dirCode === sel);

    card.bg.setFillStyle(isSelected ? 0xffd700 : 0x111c2e, isSelected ? 0.96 : 0.88);
    card.bg.setStrokeStyle(isSelected ? 3 : 1, isSelected ? 0xffffff : 0x446688);
    card.label.setColor(isSelected ? '#000000' : '#ffd700');
    card.text.setColor(isSelected ? '#000000' : '#ffffff');
    card.label.setText(opt.label);
    card.text.setText(opt.text);
  });
}

function updateBattleLoop(scene, delta) {
  let changed = false;
  // Selección 100% consistente con la posición en pantalla
  if (wasPressed('P1_U')) { scene.gameState.selectedDir = 'P1_U'; changed = true; }
  else if (wasPressed('P1_D')) { scene.gameState.selectedDir = 'P1_D'; changed = true; }
  else if (wasPressed('P1_L')) { scene.gameState.selectedDir = 'P1_L'; changed = true; }
  else if (wasPressed('P1_R')) { scene.gameState.selectedDir = 'P1_R'; changed = true; }

  if (changed && scene.gameState.waitingAnswer) {
    playSfxNav();
    renderOptions(scene);
  }

  if (scene.gameState.waitingAnswer) {
    scene.gameState.roundTimer -= delta;
    const progress = Math.max(0, scene.gameState.roundTimer / scene.gameState.roundMaxTime);
    scene.timerBar.setSize(460 * progress, 8);
    scene.timerBar.setFillStyle(progress > 0.3 ? 0x00ffcc : 0xff3333);

    if (wasPressed('P1_1') || wasPressed('START1')) {
      evaluateAnswer(scene);
    } else if (scene.gameState.roundTimer <= 0) {
      evaluateAnswer(scene, true);
    }
  }

  updateBalanceBar(scene);
}

function evaluateAnswer(scene, timedOut = false) {
  scene.gameState.waitingAnswer = false;
  const round = scene.currentRoundData;
  const choice = round.options[scene.gameState.selectedDir];

  let text = '';
  let color = '#ffffff';

  if (timedOut) {
    text = '¡TE COMISTE EL VERSO!';
    color = '#ff2222';
    scene.gameState.combo = 0;
    scene.gameState.balance = Math.max(0, scene.gameState.balance - 26);
    scene.gameState.devilScale = Math.min(1.4, scene.gameState.devilScale + 0.15);
    playSfxFail();
    scene.cameras.main.shake(250, 0.015);
  } else if (choice.correct) {
    scene.gameState.combo++;
    const gained = choice.points + (scene.gameState.combo * 25);
    scene.gameState.score += gained;
    scene.gameState.balance = Math.min(100, scene.gameState.balance + 24);
    scene.gameState.devilScale = Math.max(0.7, scene.gameState.devilScale - 0.1);
    text = scene.gameState.combo > 1 ? `¡ÉPICO! COMBO x${scene.gameState.combo}` : '¡VERSO PERFECTO!';
    color = '#00ff66';
    playSfxSuccess();
    scene.cameras.main.flash(200, 200, 255, 150);
  } else {
    scene.gameState.combo = 0;
    scene.gameState.score += choice.points;
    scene.gameState.balance = Math.max(0, scene.gameState.balance - 15);
    scene.gameState.devilScale = Math.min(1.4, scene.gameState.devilScale + 0.08);
    text = '¡TE FALTO RIMA!';
    color = '#ffaa00';
    playSfxFail();
    scene.cameras.main.shake(150, 0.008);
  }

  updateDevilSilhouetteScale(scene);

  scene.feedbackText.setText(text);
  scene.feedbackText.setColor(color);
  scene.speakerName.setText('FLORENTINO RESPONDIÓ:');
  scene.speakerName.setColor('#00ffcc');
  scene.dialogueText.setText(`"${choice ? choice.text : '...'}"`);
  scene.optionsBox.setVisible(false);

  scene.time.delayedCall(2200, () => {
    if (scene.gameState.balance <= 0) {
      showGameOver(scene);
    } else {
      scene.gameState.roundIndex++;
      if (scene.gameState.roundIndex >= DUEL_ROUNDS.length) {
        showVictoryNameEntry(scene);
      } else {
        loadRound(scene, scene.gameState.roundIndex);
      }
    }
  });
}

function updateBalanceBar(scene) {
  const b = scene.gameState.balance;
  const w = (b / 100) * 300;
  scene.duelBalanceFill.setSize(w, 14);
  scene.duelBalanceFill.setX(W / 2 - 150 + w / 2);
  scene.scoreLabel.setText(`PUNTOS: ${scene.gameState.score}`);
}

function showGameOver(scene) {
  scene.gamePhase = 'gameover';
  scene.battleContainer.setVisible(false);
  scene.gameOverContainer.setVisible(true);
  scene.gameOverScore.setText(`Puntuación lograda: ${scene.gameState.score}`);
  playSfxFail();
}

function showVictoryNameEntry(scene) {
  scene.gamePhase = 'nameEntry';
  scene.battleContainer.setVisible(false);
  scene.nameEntryContainer.setVisible(true);
  scene.victoryScoreText.setText(`PUNTOS FINALES: ${scene.gameState.score}`);
  scene.nameEntry.charIndex = 0;
  updateNameEntryDisplay(scene);
  playSfxSuccess();
}

// -----------------------------------------------------------------------------
// ENTRADA DE INICIALES (Alto contraste: letras claras sobre fondo oscuro)
// -----------------------------------------------------------------------------
function createNameEntryUI(scene) {
  scene.nameEntryContainer = scene.add.container(0, 0).setVisible(false);

  // 1. Fondo oscuro sólido con marco dorado
  const bg = scene.add.rectangle(W / 2, H / 2, 640, 420, 0x05070a, 0.98)
    .setStrokeStyle(4, 0xffd700, 1);

  const title = scene.add.text(W / 2, 130, '¡VICTORIA! ¡EL SOL SALIÓ!', {
    fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold', color: '#ffd700',
  }).setOrigin(0.5);

  scene.victoryScoreText = scene.add.text(W / 2, 175, 'PUNTOS: 0', {
    fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#00ffcc',
  }).setOrigin(0.5);

  const prompt = scene.add.text(W / 2, 215, 'REGISTRA TUS INICIALES (3 LETRAS):', {
    fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5);

  scene.nameEntryContainer.add([bg, title, scene.victoryScoreText, prompt]);

  // 2. Casillas con fondo contrastado y letras en BLANCO PURO GRANDE
  scene.letterSlots = [];
  [-80, 0, 80].forEach((ox, i) => {
    // Fondo de casilla azul marino con borde grueso
    const slotBg = scene.add.rectangle(W / 2 + ox, 280, 68, 80, 0x1e293b, 1).setStrokeStyle(3, 0x64748b);
    // Letra en blanco puro (#ffffff) con tamaño 46px
    const letterText = scene.add.text(W / 2 + ox, 280, 'A', {
      fontFamily: 'monospace', fontSize: '46px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    scene.letterSlots.push({ bg: slotBg, text: letterText });
    scene.nameEntryContainer.add([slotBg, letterText]);
  });

  scene.letterPreviewText = scene.add.text(W / 2, 345, '▲ W para subir  |  ▼ S para bajar letra', {
    fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#ffd700',
  }).setOrigin(0.5);

  const instructions = scene.add.text(W / 2, 385, [
    '◄/► (A/D): Mover Cursor    BOTÓN 1 (U) / ENTER: Confirmar',
  ].join('\n'), {
    fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', align: 'center', lineSpacing: 5,
  }).setOrigin(0.5);

  scene.nameEntryContainer.add([scene.letterPreviewText, instructions]);
}

function updateNameEntryLoop(scene) {
  const ne = scene.nameEntry;

  if (wasPressed('P1_U')) {
    ne.alphabetIndices[ne.charIndex] = (ne.alphabetIndices[ne.charIndex] + 1) % ne.alphabet.length;
    playSfxNav();
    updateNameEntryDisplay(scene);
  } else if (wasPressed('P1_D')) {
    ne.alphabetIndices[ne.charIndex] = (ne.alphabetIndices[ne.charIndex] - 1 + ne.alphabet.length) % ne.alphabet.length;
    playSfxNav();
    updateNameEntryDisplay(scene);
  } else if (wasPressed('P1_R')) {
    ne.charIndex = Math.min(NAME_LENGTH - 1, ne.charIndex + 1);
    playSfxNav();
    updateNameEntryDisplay(scene);
  } else if (wasPressed('P1_L')) {
    ne.charIndex = Math.max(0, ne.charIndex - 1);
    playSfxNav();
    updateNameEntryDisplay(scene);
  }

  if (wasPressed('P1_1') || wasPressed('START1')) {
    if (ne.charIndex < NAME_LENGTH - 1) {
      ne.charIndex++;
      playSfxNav();
      updateNameEntryDisplay(scene);
    } else {
      const name = ne.alphabetIndices.map(idx => ne.alphabet[idx]).join('');
      saveLeaderboardEntry({
        name,
        score: scene.gameState.score,
        date: new Date().toISOString().slice(0, 10),
      }).then(updatedScores => {
        scene.cachedLeaderboard = updatedScores;
        refreshLeaderboardView(scene, updatedScores);
        scene.nameEntryContainer.setVisible(false);
        scene.recordsContainer.setVisible(true);
        scene.gamePhase = 'records';
      });
    }
  }
}

function updateNameEntryDisplay(scene) {
  const ne = scene.nameEntry;
  scene.letterSlots.forEach((slot, i) => {
    const isCurrent = (i === ne.charIndex);
    slot.text.setText(ne.alphabet[ne.alphabetIndices[i]]);
    // Casilla activa: fondo azul rey intenso con borde dorado grueso
    // Casilla inactiva: fondo azul pizarra oscuro con borde gris azulado
    slot.bg.setFillStyle(isCurrent ? 0x2563eb : 0x1e293b, 1);
    slot.bg.setStrokeStyle(isCurrent ? 4 : 2, isCurrent ? 0xffd700 : 0x64748b);
    // Letras 100% en BLANCO PURO (#ffffff) siempre para legibilidad absoluta
    slot.text.setColor('#ffffff');
  });
}

// -----------------------------------------------------------------------------
// TABLA DE RÉCORDS (TOP 10)
// -----------------------------------------------------------------------------
function createRecordsUI(scene) {
  scene.recordsContainer = scene.add.container(0, 0).setVisible(false);

  const bg = scene.add.rectangle(W / 2, H / 2, 600, 420, 0x080e18, 0.98)
    .setStrokeStyle(3, 0xffd700, 0.9);

  const title = scene.add.text(W / 2, 130, '★ COPLEROS DE LEYENDA ★', {
    fontFamily: 'monospace', fontSize: '24px', fontStyle: 'bold', color: '#ffd700',
  }).setOrigin(0.5);

  scene.recordsListText = scene.add.text(W / 2, 270, '', {
    fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', lineSpacing: 8, align: 'center',
  }).setOrigin(0.5);

  const backNote = scene.add.text(W / 2, 450, 'PRESIONA START / ENTER PARA VOLVER', {
    fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#00ffcc',
  }).setOrigin(0.5);

  scene.recordsContainer.add([bg, title, scene.recordsListText, backNote]);

  // Pantalla de Game Over
  scene.gameOverContainer = scene.add.container(0, 0).setVisible(false);
  const goBg = scene.add.rectangle(W / 2, H / 2, 580, 320, 0x140507, 0.98).setStrokeStyle(3, 0xff2200);
  const goTitle = scene.add.text(W / 2, 180, '¡EL DIABLO SE LLEVÓ EL VERSO!', {
    fontFamily: 'monospace', fontSize: '24px', fontStyle: 'bold', color: '#ff2200',
  }).setOrigin(0.5);
  scene.gameOverScore = scene.add.text(W / 2, 230, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
  const goText = scene.add.text(W / 2, 280, [
    'Tu voz vaciló en la sabana oscura.',
    'Florentino cayó en la trampa del Mandinga...',
    '',
    'PRESIONA START / ENTER PARA REINTENTAR',
  ].join('\n'), {
    fontFamily: 'monospace', fontSize: '13px', color: '#dddddd', align: 'center', lineSpacing: 4,
  }).setOrigin(0.5);
  scene.gameOverContainer.add([goBg, goTitle, scene.gameOverScore, goText]);
}

function refreshLeaderboardView(scene, scores) {
  if (!scores || !scores.length) {
    scene.recordsListText.setText('NO HAY RÉCORDS REGISTRADOS');
    return;
  }
  const lines = scores.map((s, idx) => {
    const pos = String(idx + 1).padStart(2, '0');
    const name = (s.name || '???').padEnd(3, ' ');
    const pts = String(s.score || 0).padStart(6, ' ');
    return `${pos}.   ${name}   -----   ${pts} PTS`;
  });
  scene.recordsListText.setText(lines.join('\n'));
}

// -----------------------------------------------------------------------------
// ARTE PROCEDURAL Y FONDOS
// -----------------------------------------------------------------------------
function createLlanoBackground(scene) {
  scene.skyGfx = scene.add.graphics();
  scene.sunGfx = scene.add.graphics();
  scene.starSkyVisibility = 1;

  resetToNightSky(scene);

  for (let i = 0; i < 40; i++) {
    const star = scene.add.rectangle(Math.random() * W, Math.random() * (H - 240), 2, 2, 0xffffff, 0.8);
    star.seed = Math.random() * 10;
    scene.stars.push(star);
  }

  const landGfx = scene.add.graphics();
  landGfx.fillStyle(0x0c1109, 1);
  landGfx.fillRect(0, H - 150, W, 150);
  landGfx.fillStyle(0x080b06, 1);
  landGfx.fillRect(0, H - 110, W, 110);

  drawMorichePalm(landGfx, 60, H - 150, 0.85);
  drawMorichePalm(landGfx, 210, H - 150, 0.65);
  drawMorichePalm(landGfx, 730, H - 150, 0.9);
  drawMorichePalm(landGfx, 610, H - 150, 0.7);

  landGfx.fillStyle(0x2d1a0c, 1);
  landGfx.fillRect(W / 2 - 20, H - 120, 40, 8);
}

function resetToNightSky(scene) {
  scene.skyGfx.clear();
  scene.skyGfx.fillGradientStyle(0x050813, 0x050813, 0x181528, 0x1f1930, 1);
  scene.skyGfx.fillRect(0, 0, W, H - 150);

  scene.sunGfx.clear();
  scene.sunGfx.fillStyle(0xfff7db, 1);
  scene.sunGfx.fillCircle(140, 110, 42);
  scene.sunGfx.fillStyle(0x0a0c16, 0.95);
  scene.sunGfx.fillCircle(156, 102, 38);
  scene.starSkyVisibility = 1;
}

function transitionSky(scene, topColor, bottomColor, sunY, starsLeft) {
  scene.skyGfx.clear();
  scene.skyGfx.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
  scene.skyGfx.fillRect(0, 0, W, H - 150);

  scene.starSkyVisibility = starsLeft / 4;

  scene.sunGfx.clear();
  if (sunY < 500) {
    scene.sunGfx.fillStyle(0xffaa00, 0.3);
    scene.sunGfx.fillCircle(W / 2, sunY, 70);
    scene.sunGfx.fillStyle(0xffe066, 0.7);
    scene.sunGfx.fillCircle(W / 2, sunY, 45);
    scene.sunGfx.fillStyle(0xffffff, 1);
    scene.sunGfx.fillCircle(W / 2, sunY, 28);
  } else {
    scene.sunGfx.fillStyle(0xfff7db, 0.8);
    scene.sunGfx.fillCircle(140, 110, 42);
    scene.sunGfx.fillStyle(0x181528, 0.9);
    scene.sunGfx.fillCircle(156, 102, 38);
  }
}

function drawMorichePalm(gfx, x, y, scale) {
  gfx.fillStyle(0x040705, 1);
  gfx.fillRect(x - 3 * scale, y - 110 * scale, 6 * scale, 110 * scale);
  for (let angle = -60; angle <= 60; angle += 20) {
    const rad = Phaser.Math.DegToRad(angle - 90);
    const hx = x + Math.cos(rad) * 45 * scale;
    const hy = (y - 110 * scale) + Math.sin(rad) * 35 * scale;
    gfx.lineStyle(3 * scale, 0x040705, 1);
    gfx.lineBetween(x, y - 110 * scale, hx, hy);
  }
}

function updateFireParticles(scene, delta) {
  if (Math.random() < 0.5) {
    const p = scene.add.rectangle(W / 2 + (Math.random() * 20 - 10), H - 125, 3, 3, Math.random() > 0.3 ? 0xffaa00 : 0xff3300);
    p.vy = -1.2 - Math.random() * 1.5;
    p.vx = (Math.random() - 0.5) * 0.8;
    p.life = 1.0;
    scene.fireParticles.push(p);
  }
  for (let i = scene.fireParticles.length - 1; i >= 0; i--) {
    const p = scene.fireParticles[i];
    p.y += p.vy;
    p.x += p.vx;
    p.life -= delta * 0.002;
    p.alpha = Math.max(0, p.life);
    if (p.life <= 0) {
      p.destroy();
      scene.fireParticles.splice(i, 1);
    }
  }
}

function createCharacterSilhouettes(scene) {
  const gfx = scene.add.graphics();
  const fx = 180;
  const fy = H - 130;

  // Florentino
  gfx.fillStyle(0x0e141a, 1);
  gfx.fillRect(fx - 14, fy - 75, 28, 60);
  gfx.fillRect(fx - 28, fy - 88, 56, 6);
  gfx.fillRect(fx - 14, fy - 104, 28, 16);
  gfx.fillRect(fx - 12, fy - 15, 9, 28);
  gfx.fillRect(fx + 3, fy - 15, 9, 28);
  gfx.fillStyle(0x995522, 1);
  gfx.fillCircle(fx + 10, fy - 40, 11);
  gfx.fillRect(fx + 10, fy - 65, 4, 25);

  // El Diablo
  scene.devilContainer = scene.add.container(620, H - 130);
  const devilGfx = scene.add.graphics();
  devilGfx.fillStyle(0x0b0507, 1);
  devilGfx.fillRect(-18, -85, 36, 70);
  devilGfx.fillRect(-32, -96, 64, 6);
  devilGfx.fillRect(-16, -114, 32, 18);
  devilGfx.fillRect(-14, -15, 11, 28);
  devilGfx.fillRect(3, -15, 11, 28);

  const eyes = scene.add.graphics();
  eyes.fillStyle(0xff1111, 1);
  eyes.fillRect(-7, -90, 4, 3);
  eyes.fillRect(3, -90, 4, 3);
  scene.devilEyes = eyes;

  scene.devilContainer.add([devilGfx, eyes]);
}

function updateDevilSilhouetteScale(scene) {
  if (scene.devilContainer) {
    const s = scene.gameState.devilScale;
    scene.devilContainer.setScale(s);
  }
}

// -----------------------------------------------------------------------------
// UI DE BATALLA Y OPCIONES EN CRUCETA ARQUITECTÓNICA (100% CONSISTENTE)
// -----------------------------------------------------------------------------
function createBattleUI(scene) {
  scene.battleContainer = scene.add.container(0, 0).setVisible(false);

  scene.roundHeader = scene.add.text(W / 2, 22, '', {
    fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#ffd700',
  }).setOrigin(0.5);

  const duelBarBg = scene.add.rectangle(W / 2, 46, 304, 16, 0x111111).setStrokeStyle(2, 0x555555);
  scene.duelBalanceFill = scene.add.rectangle(W / 2, 46, 150, 12, 0x00ffcc);
  const florentinoTag = scene.add.text(W / 2 - 160, 46, 'FLORENTINO', { fontFamily: 'monospace', fontSize: '11px', color: '#00ffcc' }).setOrigin(1, 0.5);
  const diabloTag = scene.add.text(W / 2 + 160, 46, 'DIABLO', { fontFamily: 'monospace', fontSize: '11px', color: '#ff3333' }).setOrigin(0, 0.5);

  scene.scoreLabel = scene.add.text(W / 2, 68, 'PUNTOS: 0', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);

  scene.feedbackText = scene.add.text(W / 2, 92, '', {
    fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5);

  // Cuadro del verso del Diablo (SE MANTIENE VISIBLE ARRIBA SIEMPRE)
  scene.dialogueBox = scene.add.container(0, 0);
  const dialBg = scene.add.rectangle(W / 2, 145, 720, 68, 0x070c16, 0.94).setStrokeStyle(2, 0x334e68);
  scene.speakerName = scene.add.text(W / 2 - 345, 120, '', { fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ff3322' });
  scene.dialogueText = scene.add.text(W / 2, 153, '', {
    fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', align: 'center', wordWrap: { width: 680 },
  }).setOrigin(0.5);
  scene.dialogueBox.add([dialBg, scene.speakerName, scene.dialogueText]);

  // Barra de tiempo de respuesta
  const timerTrack = scene.add.rectangle(W / 2, 192, 464, 8, 0x111111).setStrokeStyle(1, 0x444444);
  scene.timerBar = scene.add.rectangle(W / 2, 192, 460, 6, 0x00ffcc);

  // Contenedor de opciones en cruceta
  scene.optionsBox = scene.add.container(0, 0).setVisible(false);
  scene.optionCardMap = {};

  // Posiciones estrictamente geométricas correspondientes a los controles
  const layout = {
    P1_U: { x: W / 2, y: 235, w: 480, h: 44 },        // Arriba (W)
    P1_L: { x: W / 2 - 200, y: 300, w: 340, h: 54 },  // Izquierda (A)
    P1_R: { x: W / 2 + 200, y: 300, w: 340, h: 54 },  // Derecha (D)
    P1_D: { x: W / 2, y: 375, w: 480, h: 44 },        // Abajo (S)
  };

  for (const [dirKey, pos] of Object.entries(layout)) {
    const cardBg = scene.add.rectangle(pos.x, pos.y, pos.w, pos.h, 0x111c2e, 0.9).setStrokeStyle(1, 0x446688);
    const cardLabel = scene.add.text(pos.x - pos.w / 2 + 10, pos.y, '', {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#ffd700',
    }).setOrigin(0, 0.5);
    const cardText = scene.add.text(pos.x - pos.w / 2 + 95, pos.y, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffffff', wordWrap: { width: pos.w - 105 },
    }).setOrigin(0, 0.5);

    scene.optionsBox.add([cardBg, cardLabel, cardText]);
    scene.optionCardMap[dirKey] = { bg: cardBg, label: cardLabel, text: cardText };
  }

  scene.battleContainer.add([
    scene.roundHeader, duelBarBg, scene.duelBalanceFill, florentinoTag, diabloTag,
    scene.scoreLabel, scene.feedbackText, scene.dialogueBox, timerTrack, scene.timerBar, scene.optionsBox
  ]);
}

function createTitleUI(scene) {
  scene.titleContainer = scene.add.container(0, 0);

  const titleGlow = scene.add.text(W / 2 + 2, 72, 'FLORENTINO Y EL DIABLO', {
    fontFamily: 'monospace', fontSize: '38px', fontStyle: 'bold', color: '#ff2200',
  }).setOrigin(0.5);

  const titleText = scene.add.text(W / 2, 70, 'FLORENTINO Y EL DIABLO', {
    fontFamily: 'monospace', fontSize: '38px', fontStyle: 'bold', color: '#ffd700',
  }).setOrigin(0.5);

  const subtitle = scene.add.text(W / 2, 116, '★ EL CONTRAPUNTEO DEL LLANO AL RAP ★', {
    fontFamily: 'monospace', fontSize: '15px', color: '#00ffff',
  }).setOrigin(0.5);

  const legendText = scene.add.text(W / 2, 150, 'Caracas Arcade Challenge 2026', {
    fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa',
  }).setOrigin(0.5);

  scene.pressStartText = scene.add.text(W / 2, 380, '► PRESIONA START / ENTER ◄', {
    fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5);

  const controlsNote = scene.add.text(W / 2, 420, 'Palanca: W/A/S/D  |  Cantar: U / Botón 1', {
    fontFamily: 'monospace', fontSize: '13px', color: '#ffc83b',
  }).setOrigin(0.5);

  const recordsButtonHint = scene.add.text(W / 2, 450, '[ Presiona ABAJO (S) para ver Récords ]', {
    fontFamily: 'monospace', fontSize: '12px', color: '#8899aa',
  }).setOrigin(0.5);

  scene.titleContainer.add([titleGlow, titleText, subtitle, legendText, scene.pressStartText, controlsNote, recordsButtonHint]);

  scene.instructionsContainer = scene.add.container(0, 0).setVisible(false);

  const instBg = scene.add.rectangle(W / 2, H / 2, 640, 360, 0x080c14, 0.95).setStrokeStyle(3, 0xffd700, 0.9);
  const instTitle = scene.add.text(W / 2, 160, '¿CÓMO JUGAR?', {
    fontFamily: 'monospace', fontSize: '26px', fontStyle: 'bold', color: '#ffd700',
  }).setOrigin(0.5);

  const instBody = scene.add.text(W / 2, 275, [
    '1. El Diablo te retará con una copla venenosa (arriba en pantalla).',
    '',
    '2. En pantalla verás 4 versos ubicados exactamente según la palanca:',
    '   ▲ ARRIBA (W)    ▼ ABAJO (S)    ◄ IZQUIERDA (A)    ► DERECHA (D)',
    '',
    '3. Apunta con la palanca a la opción que mejor rime y',
    '   presiona BOTÓN 1 (U) antes de que se agote la barra de tiempo.',
    '',
    '4. ¡Resiste las 4 coplas hasta el amanecer para vencer al Mandinga!',
  ].join('\n'), {
    fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', lineSpacing: 4, align: 'left',
  }).setOrigin(0.5);

  const instBack = scene.add.text(W / 2, 425, 'PRESIONA START O BOTÓN 1 PARA EMPEZAR', {
    fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#00ffcc',
  }).setOrigin(0.5);

  scene.instructionsContainer.add([instBg, instTitle, instBody, instBack]);
}
