// =============================================================================
// PLATANUS HACK 26: ARCADE CHALLENGE (CARACAS)
// JUEGO: Florentino y el Diablo
// Un contrapunteo arcade llanero con espíritu de rap venezolano.
// =============================================================================

const W = 800;
const H = 600;
const STORAGE_KEY = 'florentino-diablo-highscores-v1';
const MAX_SCORES = 10;

// Mapeo inmutable de la máquina arcade física
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
// MOTOR DE AUDIO (Web Audio sintetizado con osciladores e instrumentos llaneros)
// -----------------------------------------------------------------------------
let audioCtx = null;
let musicSchedulerTimer = null;
let currentBpm = 110;
let isMusicPlaying = false;
let currentPatternIndex = 0;
let nextStepTime = 0;
let currentMusicMode = 'joropo'; // 'joropo', 'rap', 'fusion'

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

const NOTE_FREQS = {
  D3: 146.83,
  A3: 220.00,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.00,
  A4: 440.00,
  Bb4: 466.16,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  A5: 880.00,
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

// Sonido de Bombo hip-hop sintetizado
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

// Sonido de Caja (Snare) rap
function playHipHopSnare(time) {
  if (!audioCtx) return;
  // Tono base
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

  // Ruido de redoble
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

// Efectos de sonido (SFX)
function playSfxSuccess() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  playArpaNote(now, NOTE_FREQS.D5, 0.12);
  playArpaNote(now + 0.08, NOTE_FREQS.F5, 0.15);
  playArpaNote(now + 0.16, NOTE_FREQS.A5, 0.25);
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

const JOROPO_MELODY = [
  { harp: NOTE_FREQS.A4, cuatro: [NOTE_FREQS.D4, NOTE_FREQS.F4, NOTE_FREQS.A4], maraca: true },
  { harp: NOTE_FREQS.D5, cuatro: null, maraca: false },
  { harp: NOTE_FREQS.F5, cuatro: [NOTE_FREQS.D4, NOTE_FREQS.F4, NOTE_FREQS.A4], maraca: true },
  { harp: NOTE_FREQS.E5, cuatro: null, maraca: false },
  { harp: NOTE_FREQS.D5, cuatro: [NOTE_FREQS.D4, NOTE_FREQS.F4, NOTE_FREQS.A4], maraca: true },
  { harp: NOTE_FREQS.A4, cuatro: null, maraca: false },
  { harp: NOTE_FREQS.C5, cuatro: [NOTE_FREQS.C5, NOTE_FREQS.E4, NOTE_FREQS.G4], maraca: true },
  { harp: NOTE_FREQS.E5, cuatro: null, maraca: false },
  { harp: NOTE_FREQS.G4, cuatro: [NOTE_FREQS.C5, NOTE_FREQS.E4, NOTE_FREQS.G4], maraca: true },
  { harp: NOTE_FREQS.E5, cuatro: null, maraca: false },
  { harp: NOTE_FREQS.D5, cuatro: [NOTE_FREQS.A3, NOTE_FREQS.D4, NOTE_FREQS.F4], maraca: true },
  { harp: NOTE_FREQS.A4, cuatro: null, maraca: false },
];

function scheduleMusicStep() {
  if (!isMusicPlaying || !audioCtx) return;
  const currentTime = audioCtx.currentTime;
  const stepDuration = (60 / currentBpm) / (currentMusicMode === 'joropo' ? 3 : 4);
  
  while (nextStepTime < currentTime + 0.15) {
    const step = JOROPO_MELODY[currentPatternIndex % JOROPO_MELODY.length];

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
      // Fusión Joropo + Rap
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

// -----------------------------------------------------------------------------
// BANCO DE VERSOS ORIGINALES (Fácil selección: 4 opciones W/A/S/D)
// -----------------------------------------------------------------------------
const DUEL_ROUNDS = [
  // ROUND 1: Medianoche - El Reto
  {
    roundNum: 1,
    title: 'COPLA I: MEDIANOCHE',
    bpm: 108,
    mode: 'joropo',
    devilLine: '¡Si te dices cantador, échate un verso en el llano,\nque esta noche vengo a ver de qué madera es tu mano!',
    options: [
      { dir: 'P1_U', label: '▲ ARRIBA', text: '¡Tengo madera de cedro y corazón de sabana!', points: 150, correct: true },
      { dir: 'P1_D', label: '▼ ABAJO', text: '¡Yo canto cuando me da la regalada gana!', points: 80, correct: false },
      { dir: 'P1_L', label: '◄ IZQ', text: '¡El cuatro se me aflojó, mejor canto mañana!', points: 30, correct: false },
      { dir: 'P1_R', label: '► DER', text: '¡No me asusta tu sombrero ni tu capa negra!', points: 90, correct: false },
    ],
  },
  // ROUND 2: Madrugada - El Fuego
  {
    roundNum: 2,
    title: 'COPLA II: MADRUGADA',
    bpm: 122,
    mode: 'joropo',
    devilLine: '¡La candela de mi pecho quema sabana y moriche,\nno hay coplero que me aguante sin que la voz se le achique!',
    options: [
      { dir: 'P1_L', label: '◄ IZQ', text: '¡El agua fresca del río apaga todo tu ardor!', points: 80, correct: false },
      { dir: 'P1_U', label: '▲ ARRIBA', text: '¡Mi verso viene del viento y no le teme al replique!', points: 180, correct: true },
      { dir: 'P1_D', label: '▼ ABAJO', text: '¡Con este trago de caña se me aclara la garganta!', points: 70, correct: false },
      { dir: 'P1_R', label: '► DER', text: '¡Mucho ruido y pocas nueces para tanta espanta!', points: 100, correct: false },
    ],
  },
  // ROUND 3: La Hora Bruja - El Contrapunteo Urbano (Beat 4/4)
  {
    roundNum: 3,
    title: 'COPLA III: LA HORA BRUJA (RAP LLANERO)',
    bpm: 92,
    mode: 'rap',
    devilLine: '¡Pongo rima sobre el bombo, sombra sobre tu garganta,\nel infierno trae compás y tu verso se atraganta!',
    options: [
      { dir: 'P1_D', label: '▼ ABAJO', text: '¡Tengo métrica de trueno y este llano no se espanta!', points: 220, correct: true },
      { dir: 'P1_U', label: '▲ ARRIBA', text: '¡Tu rap de azufre barato no me impresiona!', points: 90, correct: false },
      { dir: 'P1_L', label: '◄ IZQ', text: '¡El Diablo tira freestyle pero no le suena!', points: 110, correct: false },
      { dir: 'P1_R', label: '► DER', text: '¡Caracas me dio el piquete y el estero la corona!', points: 140, correct: false },
    ],
  },
  // ROUND 4: El Amanecer - Fusión Final
  {
    roundNum: 4,
    title: 'COPLA IV: EL CANTO DEL GALLO',
    bpm: 130,
    mode: 'fusion',
    devilLine: '¡Ya la sombra se disuelve y la noche se me acaba,\nsuelta el cuatro Florentino, que la muerte no te salva!',
    options: [
      { dir: 'P1_R', label: '► DER', text: '¡Canta el gallo en el corral y el sol bendito ya clarea!', points: 260, correct: true },
      { dir: 'P1_U', label: '▲ ARRIBA', text: '¡Huye pa\' tu cueva oscura antes que te vea!', points: 120, correct: false },
      { dir: 'P1_L', label: '◄ IZQ', text: '¡Florentino no se raja mientras el sol brilla!', points: 130, correct: false },
      { dir: 'P1_D', label: '▼ ABAJO', text: '¡El llano entero celebra la retirada del diablo!', points: 100, correct: false },
    ],
  },
];

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

  scene.gamePhase = 'title'; // 'title', 'instructions', 'battle', 'roundResult', 'victory', 'gameover'
  scene.stars = [];
  scene.fireParticles = [];

  // Estado de la partida
  scene.gameState = {
    roundIndex: 0,
    score: 0,
    combo: 0,
    balance: 50, // 0 = Diablo gana, 100 = Florentino gana
    selectedDir: 'P1_U', // Dirección seleccionada con la palanca
    roundTimer: 0,
    roundMaxTime: 7000,
    waitingAnswer: false,
  };

  createLlanoBackground(scene);
  createCharacterSilhouettes(scene);
  createBattleUI(scene);
  createTitleUI(scene);
}

function update(time, delta) {
  const scene = this;

  // Animación de estrellas
  if (scene.stars) {
    for (let i = 0; i < scene.stars.length; i++) {
      const s = scene.stars[i];
      s.alpha = 0.3 + 0.7 * Math.abs(Math.sin((time * 0.002) + s.seed));
    }
  }

  updateFireParticles(scene, delta);

  if (scene.pressStartText) {
    scene.pressStartText.alpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.005));
  }
  if (scene.devilEyes) {
    scene.devilEyes.alpha = 0.7 + 0.3 * Math.sin(time * 0.006);
  }

  // Máquina de estados
  if (scene.gamePhase === 'title') {
    if (wasPressed('START1') || wasPressed('P1_1')) {
      startMusic();
      scene.titleContainer.setVisible(false);
      scene.instructionsContainer.setVisible(true);
      scene.gamePhase = 'instructions';
    }
  } else if (scene.gamePhase === 'instructions') {
    if (wasPressed('START1') || wasPressed('P1_1')) {
      scene.instructionsContainer.setVisible(false);
      startBattle(scene);
    }
  } else if (scene.gamePhase === 'battle') {
    updateBattleLoop(scene, delta);
  } else if (scene.gamePhase === 'victory' || scene.gamePhase === 'gameover') {
    if (wasPressed('START1') || wasPressed('P1_1')) {
      scene.endGameContainer.setVisible(false);
      scene.titleContainer.setVisible(true);
      scene.battleContainer.setVisible(false);
      scene.gamePhase = 'title';
    }
  }
}

// -----------------------------------------------------------------------------
// LÓGICA DE BATALLA / CONTRAPUNTEO
// -----------------------------------------------------------------------------
function startBattle(scene) {
  scene.gamePhase = 'battle';
  scene.gameState.roundIndex = 0;
  scene.gameState.score = 0;
  scene.gameState.combo = 0;
  scene.gameState.balance = 50;
  scene.battleContainer.setVisible(true);
  loadRound(scene, 0);
}

function loadRound(scene, roundIdx) {
  const round = DUEL_ROUNDS[roundIdx];
  scene.currentRoundData = round;
  currentBpm = round.bpm;
  currentMusicMode = round.mode;

  scene.gameState.roundTimer = scene.gameState.roundMaxTime;
  scene.gameState.waitingAnswer = false;
  scene.gameState.selectedDir = 'P1_U'; // Selección inicial

  // Ocultar opciones mientras el diablo recita
  scene.optionsBox.setVisible(false);
  scene.feedbackText.setText('');
  scene.roundHeader.setText(`${round.title}  |  PUNTOS: ${scene.gameState.score}`);

  // Mostrar copla del Diablo con efecto
  scene.dialogueBox.setVisible(true);
  scene.speakerName.setText('EL DIABLO DICE:');
  scene.speakerName.setColor('#ff3322');
  scene.dialogueText.setText(round.devilLine);
  playSfxDevilVoice();

  // Pausa dramática para escuchar al diablo, luego el jugador responde
  scene.time.delayedCall(2200, () => {
    if (scene.gamePhase !== 'battle') return;
    scene.gameState.waitingAnswer = true;
    scene.speakerName.setText('FLORENTINO RESPONDE (PALANCA + BOTÓN 1 / U):');
    scene.speakerName.setColor('#00ffcc');
    scene.dialogueText.setText('¡Elige tu verso con W/A/S/D y cántalo con U!');
    scene.optionsBox.setVisible(true);
    renderOptions(scene);
  });
}

function renderOptions(scene) {
  const round = scene.currentRoundData;
  const sel = scene.gameState.selectedDir;

  round.options.forEach((opt, idx) => {
    const card = scene.optionCards[idx];
    const isSelected = (opt.dir === sel);

    card.bg.setFillStyle(isSelected ? 0xffd700 : 0x111c2e, isSelected ? 0.95 : 0.85);
    card.bg.setStrokeStyle(isSelected ? 3 : 1, isSelected ? 0xffffff : 0x446688);
    card.label.setColor(isSelected ? '#000000' : '#ffd700');
    card.text.setColor(isSelected ? '#000000' : '#ffffff');
    card.label.setText(opt.label);
    card.text.setText(opt.text);
  });
}

function updateBattleLoop(scene, delta) {
  // Manejo de palanca para cambiar de opción seleccionada
  let changed = false;
  if (wasPressed('P1_U')) { scene.gameState.selectedDir = 'P1_U'; changed = true; }
  else if (wasPressed('P1_D')) { scene.gameState.selectedDir = 'P1_D'; changed = true; }
  else if (wasPressed('P1_L')) { scene.gameState.selectedDir = 'P1_L'; changed = true; }
  else if (wasPressed('P1_R')) { scene.gameState.selectedDir = 'P1_R'; changed = true; }

  if (changed && scene.gameState.waitingAnswer) {
    renderOptions(scene);
  }

  // Actualizar temporizador de respuesta
  if (scene.gameState.waitingAnswer) {
    scene.gameState.roundTimer -= delta;
    const progress = Math.max(0, scene.gameState.roundTimer / scene.gameState.roundMaxTime);
    scene.timerBar.setSize(460 * progress, 8);
    scene.timerBar.setFillStyle(progress > 0.3 ? 0x00ffcc : 0xff3333);

    // Confirmación de verso con BOTÓN 1 (U)
    if (wasPressed('P1_1') || wasPressed('START1')) {
      evaluateAnswer(scene);
    } else if (scene.gameState.roundTimer <= 0) {
      // Se agotó el tiempo
      evaluateAnswer(scene, true);
    }
  }

  // Actualizar barra de balance (tira y afloja)
  updateBalanceBar(scene);
}

function evaluateAnswer(scene, timedOut = false) {
  scene.gameState.waitingAnswer = false;
  const round = scene.currentRoundData;
  const choice = round.options.find(o => o.dir === scene.gameState.selectedDir);

  let gained = 0;
  let text = '';
  let color = '#ffffff';

  if (timedOut) {
    text = '¡TE COMISTE EL VERSO!';
    color = '#ff2222';
    scene.gameState.combo = 0;
    scene.gameState.balance = Math.max(0, scene.gameState.balance - 25);
    playSfxFail();
    scene.cameras.main.shake(250, 0.015);
  } else if (choice.correct) {
    scene.gameState.combo++;
    gained = choice.points + (scene.gameState.combo * 20);
    scene.gameState.score += gained;
    scene.gameState.balance = Math.min(100, scene.gameState.balance + 22);
    text = scene.gameState.combo > 1 ? `¡ÉPICO! COMBO x${scene.gameState.combo}` : '¡VERSO PERFECTO!';
    color = '#00ff66';
    playSfxSuccess();
    scene.cameras.main.flash(200, 200, 255, 150);
  } else {
    // Verso regular o flojo
    scene.gameState.combo = 0;
    gained = choice.points;
    scene.gameState.score += gained;
    scene.gameState.balance = Math.max(0, scene.gameState.balance - 12);
    text = '¡TE FALTO RIMA!';
    color = '#ffaa00';
    playSfxFail();
    scene.cameras.main.shake(150, 0.008);
  }

  scene.feedbackText.setText(text);
  scene.feedbackText.setColor(color);
  scene.dialogueText.setText(`Florentino cantó:\n"${choice ? choice.text : '...'}"`);
  scene.optionsBox.setVisible(false);

  // Evaluar condición de victoria/derrota o pasar a siguiente round
  scene.time.delayedCall(2000, () => {
    if (scene.gameState.balance <= 0) {
      showEndGame(scene, false); // Derrota
    } else {
      scene.gameState.roundIndex++;
      if (scene.gameState.roundIndex >= DUEL_ROUNDS.length) {
        showEndGame(scene, true); // Victoria
      } else {
        loadRound(scene, scene.gameState.roundIndex);
      }
    }
  });
}

function updateBalanceBar(scene) {
  const b = scene.gameState.balance;
  // Barra de 300px ancho
  const w = (b / 100) * 300;
  scene.duelBalanceFill.setSize(w, 14);
  scene.duelBalanceFill.setX(W / 2 - 150 + w / 2);
  scene.scoreLabel.setText(`PUNTOS: ${scene.gameState.score}`);
}

function showEndGame(scene, won) {
  scene.gamePhase = won ? 'victory' : 'gameover';
  scene.battleContainer.setVisible(false);
  scene.endGameContainer.setVisible(true);

  if (won) {
    scene.endTitle.setText('¡EL SOL SALIÓ! ¡VICTORIA!');
    scene.endTitle.setColor('#ffd700');
    scene.endSubtitle.setText([
      'Cantó el gallo y el Diablo tuvo que huir.',
      'Florentino salvó su alma en el contrapunteo.',
      `Puntuación final: ${scene.gameState.score}`,
      '',
      'PRESIONA START PARA VOLVER AL TÍTULO',
    ].join('\n'));
    playSfxSuccess();
  } else {
    scene.endTitle.setText('¡EL DIABLO TE DERROTÓ!');
    scene.endTitle.setColor('#ff3322');
    scene.endSubtitle.setText([
      'La noche se tragó tus coplas en la sabana.',
      'El Mandinga venció esta vez...',
      `Puntuación lograda: ${scene.gameState.score}`,
      '',
      'PRESIONA START PARA REINTENTAR',
    ].join('\n'));
    playSfxFail();
  }
}

// -----------------------------------------------------------------------------
// ARTE PROCEDURAL Y FONDOS
// -----------------------------------------------------------------------------
function createLlanoBackground(scene) {
  const gfx = scene.add.graphics();
  gfx.fillGradientStyle(0x050813, 0x050813, 0x181528, 0x1f1930, 1);
  gfx.fillRect(0, 0, W, H - 150);

  // Luna llanera
  gfx.fillStyle(0xfff7db, 1);
  gfx.fillCircle(140, 110, 42);
  gfx.fillStyle(0x0a0c16, 0.95);
  gfx.fillCircle(156, 102, 38);

  // Estrellas
  for (let i = 0; i < 40; i++) {
    const star = scene.add.rectangle(Math.random() * W, Math.random() * (H - 240), 2, 2, 0xffffff, 0.8);
    star.seed = Math.random() * 10;
    scene.stars.push(star);
  }

  // Sabana
  gfx.fillStyle(0x0c1109, 1);
  gfx.fillRect(0, H - 150, W, 150);
  gfx.fillStyle(0x080b06, 1);
  gfx.fillRect(0, H - 110, W, 110);

  // Palmas
  drawMorichePalm(gfx, 60, H - 150, 0.85);
  drawMorichePalm(gfx, 210, H - 150, 0.65);
  drawMorichePalm(gfx, 730, H - 150, 0.9);
  drawMorichePalm(gfx, 610, H - 150, 0.7);

  // Fogata
  gfx.fillStyle(0x2d1a0c, 1);
  gfx.fillRect(W / 2 - 20, H - 120, 40, 8);
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
  const dx = 620;
  const dy = H - 130;
  gfx.fillStyle(0x0b0507, 1);
  gfx.fillRect(dx - 18, dy - 85, 36, 70);
  gfx.fillRect(dx - 32, dy - 96, 64, 6);
  gfx.fillRect(dx - 16, dy - 114, 32, 18);
  gfx.fillRect(dx - 14, dy - 15, 11, 28);
  gfx.fillRect(dx + 3, dy - 15, 11, 28);

  const eyes = scene.add.graphics();
  eyes.fillStyle(0xff1111, 1);
  eyes.fillRect(dx - 7, dy - 90, 4, 3);
  eyes.fillRect(dx + 3, dy - 90, 4, 3);
  scene.devilEyes = eyes;
}

// -----------------------------------------------------------------------------
// UI DE BATALLA Y OPCIONES
// -----------------------------------------------------------------------------
function createBattleUI(scene) {
  scene.battleContainer = scene.add.container(0, 0).setVisible(false);

  // Barra de cabecera con Round y Puntaje
  scene.roundHeader = scene.add.text(W / 2, 25, '', {
    fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#ffd700',
  }).setOrigin(0.5);

  // Barra de duelo (Tug of war)
  const duelBarBg = scene.add.rectangle(W / 2, 52, 304, 18, 0x111111).setStrokeStyle(2, 0x555555);
  scene.duelBalanceFill = scene.add.rectangle(W / 2, 52, 150, 14, 0x00ffcc);
  const florentinoTag = scene.add.text(W / 2 - 160, 52, 'FLORENTINO', { fontFamily: 'monospace', fontSize: '11px', color: '#00ffcc' }).setOrigin(1, 0.5);
  const diabloTag = scene.add.text(W / 2 + 160, 52, 'DIABLO', { fontFamily: 'monospace', fontSize: '11px', color: '#ff3333' }).setOrigin(0, 0.5);

  scene.scoreLabel = scene.add.text(W / 2, 75, 'PUNTOS: 0', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);

  // Feedback en el centro
  scene.feedbackText = scene.add.text(W / 2, 102, '', {
    fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5);

  // Cuadro de diálogo del verso actual
  scene.dialogueBox = scene.add.container(0, 0);
  const dialBg = scene.add.rectangle(W / 2, 160, 680, 80, 0x0a101d, 0.9).setStrokeStyle(2, 0x334e68);
  scene.speakerName = scene.add.text(W / 2 - 325, 130, '', { fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#ffd700' });
  scene.dialogueText = scene.add.text(W / 2, 168, '', {
    fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', align: 'center', wordWrap: { width: 640 },
  }).setOrigin(0.5);
  scene.dialogueBox.add([dialBg, scene.speakerName, scene.dialogueText]);

  // Barra de tiempo de respuesta
  const timerTrack = scene.add.rectangle(W / 2, 212, 464, 10, 0x111111).setStrokeStyle(1, 0x444444);
  scene.timerBar = scene.add.rectangle(W / 2, 212, 460, 8, 0x00ffcc);

  // Cuadro de opciones de respuesta (Arriba, Abajo, Izquierda, Derecha)
  scene.optionsBox = scene.add.container(0, 0).setVisible(false);
  scene.optionCards = [];

  const positions = [
    { x: W / 2, y: 250 },       // Arriba
    { x: W / 2 - 170, y: 310 }, // Izquierda
    { x: W / 2 + 170, y: 310 }, // Derecha
    { x: W / 2, y: 370 },       // Abajo
  ];

  positions.forEach((pos) => {
    const cardBg = scene.add.rectangle(pos.x, pos.y, 320, 48, 0x111c2e, 0.85).setStrokeStyle(1, 0x446688);
    const cardLabel = scene.add.text(pos.x - 150, pos.y, '', { fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#ffd700' }).setOrigin(0, 0.5);
    const cardText = scene.add.text(pos.x - 70, pos.y, '', { fontFamily: 'monospace', fontSize: '11px', color: '#ffffff', wordWrap: { width: 220 } }).setOrigin(0, 0.5);
    scene.optionsBox.add([cardBg, cardLabel, cardText]);
    scene.optionCards.push({ bg: cardBg, label: cardLabel, text: cardText });
  });

  scene.battleContainer.add([
    scene.roundHeader, duelBarBg, scene.duelBalanceFill, florentinoTag, diabloTag,
    scene.scoreLabel, scene.feedbackText, scene.dialogueBox, timerTrack, scene.timerBar, scene.optionsBox
  ]);

  // Pantalla de Fin de Juego (Victoria o Derrota)
  scene.endGameContainer = scene.add.container(0, 0).setVisible(false);
  const endBg = scene.add.rectangle(W / 2, H / 2, 600, 320, 0x070c14, 0.95).setStrokeStyle(3, 0xffd700);
  scene.endTitle = scene.add.text(W / 2, 190, '', { fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold', color: '#ffd700' }).setOrigin(0.5);
  scene.endSubtitle = scene.add.text(W / 2, 300, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', align: 'center', lineSpacing: 6 }).setOrigin(0.5);
  scene.endGameContainer.add([endBg, scene.endTitle, scene.endSubtitle]);
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

  scene.titleContainer.add([titleGlow, titleText, subtitle, legendText, scene.pressStartText, controlsNote]);

  // Contenedor de instrucciones
  scene.instructionsContainer = scene.add.container(0, 0).setVisible(false);

  const instBg = scene.add.rectangle(W / 2, H / 2, 640, 360, 0x080c14, 0.95).setStrokeStyle(3, 0xffd700, 0.9);
  const instTitle = scene.add.text(W / 2, 160, '¿CÓMO JUGAR?', {
    fontFamily: 'monospace', fontSize: '26px', fontStyle: 'bold', color: '#ffd700',
  }).setOrigin(0.5);

  const instBody = scene.add.text(W / 2, 275, [
    '1. El Diablo te retará con una copla venenosa.',
    '',
    '2. En pantalla verás 4 versos asignados a la palanca:',
    '   ▲ ARRIBA (W)    ▼ ABAJO (S)    ◄ IZQUIERDA (A)    ► DERECHA (D)',
    '',
    '3. Mueve la palanca para elegir el verso que mejor rime',
    '   y presiona BOTÓN 1 (U) antes de que se agote el tiempo.',
    '',
    '4. ¡Aguanta las coplas hasta el amanecer para vencer al Diablo!',
  ].join('\n'), {
    fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', lineSpacing: 4, align: 'left',
  }).setOrigin(0.5);

  const instBack = scene.add.text(W / 2, 425, 'PRESIONA START O BOTÓN 1 PARA EMPEZAR', {
    fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#00ffff',
  }).setOrigin(0.5);

  scene.instructionsContainer.add([instBg, instTitle, instBody, instBack]);
}
