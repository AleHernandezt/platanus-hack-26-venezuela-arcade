// =============================================================================
// PLATANUS HACK 26: ARCADE CHALLENGE (CARACAS)
// JUEGO: Florentino y el Diablo
// Un contrapunteo arcade llanero con espíritu de rap venezolano.
// =============================================================================

const W = 800;
const H = 600;
const STORAGE_KEY = 'florentino-diablo-highscores-v1';
const MAX_SCORES = 10;

// Mapeo físico inmutable de la máquina arcade (NO modificar teclas existentes)
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

// Mapeo inverso de tecla a código arcade
const KEY_TO_ARCADE = {};
for (const [code, keys] of Object.entries(CABINET_KEYS)) {
  for (const k of keys) {
    KEY_TO_ARCADE[k.length === 1 ? k.toLowerCase() : k] = code;
  }
}

// Estado global de entradas arcade
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
let currentBpm = 112;
let isMusicPlaying = false;
let currentPatternIndex = 0;
let nextStepTime = 0;

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

// Escala musical para arpegios de arpa y acordes de cuatro (Re menor llanero)
// D4, E4, F4, G4, A4, Bb4, C5, D5, E5, F5, A5
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

// Generador de maraca (ráfaga de ruido blanco con envolvente corta)
function playMaraca(time, accent) {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * 0.04;
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
  gain.gain.setValueAtTime(accent ? 0.12 : 0.06, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start(time);
}

// Rasgueo percusivo de cuatro (acorde rápido de onda cuadrada)
function playCuatroChit(time, chordNotes) {
  if (!audioCtx) return;
  chordNotes.forEach((f, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, time + idx * 0.008);
    gain.gain.setValueAtTime(0.06, time + idx * 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.008 + 0.09);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time + idx * 0.008);
    osc.stop(time + idx * 0.008 + 0.1);
  });
}

// Arpegio de arpa llanera (onda triangular limpia y brillante)
function playArpaNote(time, freq, dur = 0.2) {
  if (!audioCtx || !freq) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0.09, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + dur);
}

// Patrón rítmico del Joropo 6/8 llanero (6 corcheas por compás)
// La clásica hemiola llanera: acentos en 1, 3, 5 alternando con 2, 4, 6
const JOROPO_MELODY = [
  // Compás 1
  { harp: NOTE_FREQS.A4, cuatro: [NOTE_FREQS.D4, NOTE_FREQS.F4, NOTE_FREQS.A4], maraca: true },
  { harp: NOTE_FREQS.D5, cuatro: null, maraca: false },
  { harp: NOTE_FREQS.F5, cuatro: [NOTE_FREQS.D4, NOTE_FREQS.F4, NOTE_FREQS.A4], maraca: true },
  { harp: NOTE_FREQS.E5, cuatro: null, maraca: false },
  { harp: NOTE_FREQS.D5, cuatro: [NOTE_FREQS.D4, NOTE_FREQS.F4, NOTE_FREQS.A4], maraca: true },
  { harp: NOTE_FREQS.A4, cuatro: null, maraca: false },
  // Compás 2
  { harp: NOTE_FREQS.C5, cuatro: [NOTE_FREQS.C5, NOTE_FREQS.E4, NOTE_FREQS.G4], maraca: true },
  { harp: NOTE_FREQS.E5, cuatro: null, maraca: false },
  { harp: NOTE_FREQS.G4, cuatro: [NOTE_FREQS.C5, NOTE_FREQS.E4, NOTE_FREQS.G4], maraca: true },
  { harp: NOTE_FREQS.E5, cuatro: null, maraca: false },
  { harp: NOTE_FREQS.D5, cuatro: [NOTE_FREQS.A3, NOTE_FREQS.D4, NOTE_FREQS.F4], maraca: true },
  { harp: NOTE_FREQS.A4, cuatro: null, maraca: false },
  // Compás 3
  { harp: NOTE_FREQS.Bb4, cuatro: [NOTE_FREQS.D4, NOTE_FREQS.G4, NOTE_FREQS.Bb4], maraca: true },
  { harp: NOTE_FREQS.D5, cuatro: null, maraca: false },
  { harp: NOTE_FREQS.G4, cuatro: [NOTE_FREQS.D4, NOTE_FREQS.G4, NOTE_FREQS.Bb4], maraca: true },
  { harp: NOTE_FREQS.Bb4, cuatro: null, maraca: false },
  { harp: NOTE_FREQS.A4, cuatro: [NOTE_FREQS.D4, NOTE_FREQS.F4, NOTE_FREQS.A4], maraca: true },
  { harp: NOTE_FREQS.F4, cuatro: null, maraca: false },
  // Compás 4
  { harp: NOTE_FREQS.E4, cuatro: [NOTE_FREQS.A3, NOTE_FREQS.E4, NOTE_FREQS.A4], maraca: true },
  { harp: NOTE_FREQS.G4, cuatro: null, maraca: false },
  { harp: NOTE_FREQS.F4, cuatro: [NOTE_FREQS.A3, NOTE_FREQS.D4, NOTE_FREQS.F4], maraca: true },
  { harp: NOTE_FREQS.E4, cuatro: null, maraca: false },
  { harp: NOTE_FREQS.D4, cuatro: [NOTE_FREQS.D3, NOTE_FREQS.A3, NOTE_FREQS.D4], maraca: true },
  { harp: null, cuatro: null, maraca: false },
];

function scheduleMusicStep() {
  if (!isMusicPlaying || !audioCtx) return;
  const currentTime = audioCtx.currentTime;
  const stepDuration = (60 / currentBpm) / 3; // Corchea en 6/8
  
  while (nextStepTime < currentTime + 0.15) {
    const step = JOROPO_MELODY[currentPatternIndex];
    if (step.maraca) playMaraca(nextStepTime, currentPatternIndex % 3 === 0);
    if (step.cuatro) playCuatroChit(nextStepTime, step.cuatro);
    if (step.harp) playArpaNote(nextStepTime, step.harp, stepDuration * 1.5);

    nextStepTime += stepDuration;
    currentPatternIndex = (currentPatternIndex + 1) % JOROPO_MELODY.length;
  }
}

function startJoropoTheme() {
  if (isMusicPlaying) return;
  isMusicPlaying = true;
  currentPatternIndex = 0;
  if (audioCtx) {
    nextStepTime = audioCtx.currentTime + 0.05;
  }
  if (!musicSchedulerTimer) {
    musicSchedulerTimer = setInterval(scheduleMusicStep, 25);
  }
}

// -----------------------------------------------------------------------------
// ALMACENAMIENTO DE RÉCORDS (Bridge de arcade con fallback en localStorage)
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

// -----------------------------------------------------------------------------
// CONFIGURACIÓN Y ESCENA PRINCIPAL DE PHASER 3
// -----------------------------------------------------------------------------
const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-root',
  backgroundColor: '#05070a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: {
    create,
    update,
  },
};

new Phaser.Game(config);

function create() {
  const scene = this;

  scene.gamePhase = 'title'; // 'title', 'instructions', 'battle', 'gameover'
  scene.stars = [];
  scene.fireParticles = [];

  // Dibujar paisaje nocturno del llano
  createLlanoBackground(scene);

  // Siluetas de los personajes
  createCharacterSilhouettes(scene);

  // Textos e interfaz de la pantalla de título
  createTitleUI(scene);
}

function update(time, delta) {
  const scene = this;

  // Animación suave de estrellas titilantes
  if (scene.stars) {
    for (let i = 0; i < scene.stars.length; i++) {
      const s = scene.stars[i];
      s.alpha = 0.3 + 0.7 * Math.abs(Math.sin((time * 0.002) + s.seed));
    }
  }

  // Animación de chispas de la fogata
  updateFireParticles(scene, delta);

  // Pulsación del texto "PRESIONA START"
  if (scene.pressStartText) {
    scene.pressStartText.alpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.005));
  }

  // Ojos del Diablo brillando sutilmente
  if (scene.devilEyes) {
    scene.devilEyes.alpha = 0.7 + 0.3 * Math.sin(time * 0.006);
  }

  // Manejo de input en pantalla de título
  if (scene.gamePhase === 'title') {
    if (wasPressed('START1') || wasPressed('P1_1')) {
      startJoropoTheme();
      // Pequeño flash y salto a instrucciones/juego
      scene.cameras.main.flash(300, 255, 200, 50);
      scene.titleContainer.setVisible(false);
      scene.instructionsContainer.setVisible(true);
      scene.gamePhase = 'instructions';
    }
  } else if (scene.gamePhase === 'instructions') {
    if (wasPressed('START1') || wasPressed('P1_1')) {
      scene.instructionsContainer.setVisible(false);
      scene.titleContainer.setVisible(true);
      scene.gamePhase = 'title';
    }
  }
}

// -----------------------------------------------------------------------------
// ARTE PROCEDURAL (Fondo llanero, palmas, fogata y personajes)
// -----------------------------------------------------------------------------
function createLlanoBackground(scene) {
  const gfx = scene.add.graphics();

  // Cielo nocturno en degradé
  gfx.fillGradientStyle(0x050813, 0x050813, 0x181528, 0x1f1930, 1);
  gfx.fillRect(0, 0, W, H - 150);

  // Luna llanera menguante/llena
  gfx.fillStyle(0xfff7db, 1);
  gfx.fillCircle(140, 130, 48);
  gfx.fillStyle(0x0a0c16, 0.95);
  gfx.fillCircle(158, 122, 42); // Sombra que crea el cuarto creciente llanero

  // Estrellas
  for (let i = 0; i < 45; i++) {
    const sx = Math.random() * W;
    const sy = Math.random() * (H - 220);
    const star = scene.add.rectangle(sx, sy, 2, 2, 0xffffff, 0.8);
    star.seed = Math.random() * 10;
    scene.stars.push(star);
  }

  // Sabana / Suelo llanero
  gfx.fillStyle(0x0c1109, 1);
  gfx.fillRect(0, H - 150, W, 150);
  gfx.fillStyle(0x080b06, 1);
  gfx.fillRect(0, H - 110, W, 110);

  // Siluetas de palmas moriche al fondo
  drawMorichePalm(gfx, 60, H - 150, 0.85);
  drawMorichePalm(gfx, 230, H - 150, 0.65);
  drawMorichePalm(gfx, 720, H - 150, 0.9);
  drawMorichePalm(gfx, 620, H - 150, 0.7);

  // Fogata en el centro del contrapunteo
  drawCampfireLogs(gfx, W / 2, H - 120);
}

function drawMorichePalm(gfx, x, y, scale) {
  gfx.fillStyle(0x040705, 1);
  // Tronco delgado
  gfx.fillRect(x - 3 * scale, y - 110 * scale, 6 * scale, 110 * scale);
  // Penacho de hojas abiertas
  for (let angle = -60; angle <= 60; angle += 20) {
    const rad = Phaser.Math.DegToRad(angle - 90);
    const hx = x + Math.cos(rad) * 45 * scale;
    const hy = (y - 110 * scale) + Math.sin(rad) * 35 * scale;
    gfx.lineStyle(3 * scale, 0x040705, 1);
    gfx.lineBetween(x, y - 110 * scale, hx, hy);
  }
}

function drawCampfireLogs(gfx, x, y) {
  gfx.fillStyle(0x2d1a0c, 1);
  gfx.fillRect(x - 22, y, 44, 8);
  gfx.fillRect(x - 16, y - 5, 32, 7);
}

function updateFireParticles(scene, delta) {
  // Crear nuevas chispas
  if (Math.random() < 0.6) {
    const p = scene.add.rectangle(
      W / 2 + (Math.random() * 20 - 10),
      H - 125,
      3,
      3,
      Math.random() > 0.3 ? 0xffaa00 : 0xff3300
    );
    p.vy = -1.2 - Math.random() * 1.5;
    p.vx = (Math.random() - 0.5) * 0.8;
    p.life = 1.0;
    scene.fireParticles.push(p);
  }

  // Actualizar partículas
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

  // 1. FLORENTINO (Izquierda) - Vestido con sombrero de ala ancha y cuatro
  const fx = 230;
  const fy = H - 130;

  gfx.fillStyle(0x0e141a, 1);
  // Cuerpo
  gfx.fillRect(fx - 14, fy - 75, 28, 60);
  // Sombrero llanero pelo e' guama
  gfx.fillRect(fx - 28, fy - 88, 56, 6);
  gfx.fillRect(fx - 14, fy - 104, 28, 16);
  // Piernas
  gfx.fillRect(fx - 12, fy - 15, 9, 28);
  gfx.fillRect(fx + 3, fy - 15, 9, 28);
  // Cuatro llanero
  gfx.fillStyle(0x995522, 1);
  gfx.fillCircle(fx + 10, fy - 40, 11);
  gfx.fillRect(fx + 10, fy - 65, 4, 25);

  // 2. EL DIABLO (Derecha) - Figura oscura imponente con capa y cuernos discretos en el sombrero
  const dx = 570;
  const dy = H - 130;

  gfx.fillStyle(0x0b0507, 1);
  // Capa y cuerpo
  gfx.fillRect(dx - 18, dy - 85, 36, 70);
  // Sombrero siniestro
  gfx.fillRect(dx - 32, dy - 96, 64, 6);
  gfx.fillRect(dx - 16, dy - 114, 32, 18);
  // Piernas
  gfx.fillRect(dx - 14, dy - 15, 11, 28);
  gfx.fillRect(dx + 3, dy - 15, 11, 28);

  // Ojos rojos brillantes del Diablo
  const eyesGfx = scene.add.graphics();
  eyesGfx.fillStyle(0xff1111, 1);
  eyesGfx.fillRect(dx - 7, dy - 90, 4, 3);
  eyesGfx.fillRect(dx + 3, dy - 90, 4, 3);
  scene.devilEyes = eyesGfx;
}

// -----------------------------------------------------------------------------
// PANTALLAS DE INTERFAZ (Título e Instrucciones)
// -----------------------------------------------------------------------------
function createTitleUI(scene) {
  scene.titleContainer = scene.add.container(0, 0);

  // Título principal con estilo arcade retro
  const titleGlow = scene.add.text(W / 2 + 2, 72, 'FLORENTINO Y EL DIABLO', {
    fontFamily: 'monospace',
    fontSize: '38px',
    fontStyle: 'bold',
    color: '#ff2200',
  }).setOrigin(0.5);

  const titleText = scene.add.text(W / 2, 70, 'FLORENTINO Y EL DIABLO', {
    fontFamily: 'monospace',
    fontSize: '38px',
    fontStyle: 'bold',
    color: '#ffd700',
  }).setOrigin(0.5);

  const subtitle = scene.add.text(W / 2, 116, '★ EL CONTRAPUNTEO DEL LLANO AL RAP ★', {
    fontFamily: 'monospace',
    fontSize: '15px',
    color: '#00ffff',
  }).setOrigin(0.5);

  const legendText = scene.add.text(W / 2, 150, 'Caracas Arcade Challenge 2026', {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#aaaaaa',
  }).setOrigin(0.5);

  scene.pressStartText = scene.add.text(W / 2, 380, '► PRESIONA START / ENTER ◄', {
    fontFamily: 'monospace',
    fontSize: '22px',
    fontStyle: 'bold',
    color: '#ffffff',
  }).setOrigin(0.5);

  const controlsNote = scene.add.text(W / 2, 420, 'Palanca: W/A/S/D  |  Cantar: U / Botón 1', {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#ffc83b',
  }).setOrigin(0.5);

  scene.titleContainer.add([titleGlow, titleText, subtitle, legendText, scene.pressStartText, controlsNote]);

  // Contenedor de instrucciones
  scene.instructionsContainer = scene.add.container(0, 0).setVisible(false);

  const instBg = scene.add.rectangle(W / 2, H / 2, 640, 360, 0x080c14, 0.95)
    .setStrokeStyle(3, 0xffd700, 0.9);

  const instTitle = scene.add.text(W / 2, 160, '¿CÓMO JUGAR?', {
    fontFamily: 'monospace',
    fontSize: '26px',
    fontStyle: 'bold',
    color: '#ffd700',
  }).setOrigin(0.5);

  const instBody = scene.add.text(W / 2, 275, [
    '1. El Diablo te retará con una copla venenosa.',
    '',
    '2. En pantalla verás 4 respuestas posibles ligadas a la palanca:',
    '   ▲ ARRIBA (W)    ▼ ABAJO (S)    ◄ IZQUIERDA (A)    ► DERECHA (D)',
    '',
    '3. ¡Elige el verso que mejor rime y presiona BOTÓN 1 (U)!',
    '',
    '4. Resiste los rounds hasta el amanecer para vencer al Diablo.',
  ].join('\n'), {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#ffffff',
    lineSpacing: 4,
    align: 'left',
  }).setOrigin(0.5);

  const instBack = scene.add.text(W / 2, 425, 'PRESIONA START PARA VOLVER', {
    fontFamily: 'monospace',
    fontSize: '15px',
    fontStyle: 'bold',
    color: '#00ffff',
  }).setOrigin(0.5);

  scene.instructionsContainer.add([instBg, instTitle, instBody, instBack]);
}
