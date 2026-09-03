"use client";

/**
 * Retroalimentación sonora y táctil al escanear un QR, pensada para una
 * tablet fija en el vehículo donde el operador no siempre está mirando la
 * pantalla de cerca. No depende de archivos de audio (funciona sin
 * conexión): genera los tonos con la Web Audio API.
 */

let _ctx = null;
function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!_ctx) _ctx = new Ctx();
  // Los navegadores móviles suspenden el contexto hasta el primer gesto del
  // usuario; como el flujo siempre arranca con un toque en "ESCANEAR QR",
  // para este punto ya debería poder reanudarse sin problema.
  if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
  return _ctx;
}

function beep({ freq = 880, durationMs = 150, delayMs = 0, volume = 0.35, type = "sine" }) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const startAt = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.01);
  gain.gain.linearRampToValueAtTime(0, startAt + durationMs / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationMs / 1000 + 0.02);
}

// Patrones por resultado: sonido (uno o varios "beep") + patrón de vibración
// ([vibrar, pausar, vibrar, ...] en milisegundos).
const PATTERNS = {
  AUTORIZADO: {
    tones: [{ freq: 1046, durationMs: 130 }],
    vibrate: [80],
  },
  NO_AUTORIZADO: {
    tones: [
      { freq: 300, durationMs: 180, type: "square" },
      { freq: 220, durationMs: 260, delayMs: 200, type: "square" },
    ],
    vibrate: [120, 80, 120],
  },
  QR_NO_ENCONTRADO: {
    tones: [
      { freq: 300, durationMs: 180, type: "square" },
      { freq: 220, durationMs: 260, delayMs: 200, type: "square" },
    ],
    vibrate: [120, 80, 120],
  },
  YA_REGISTRADO: {
    tones: [
      { freq: 660, durationMs: 130 },
      { freq: 660, durationMs: 130, delayMs: 170 },
    ],
    vibrate: [60, 60, 60],
  },
  PENDIENTE: {
    tones: [{ freq: 520, durationMs: 200 }],
    vibrate: [60],
  },
  ERROR: {
    tones: [{ freq: 220, durationMs: 300, type: "square" }],
    vibrate: [200],
  },
};

export function playScanFeedback(resultado) {
  const pattern = PATTERNS[resultado] || PATTERNS.ERROR;
  try {
    pattern.tones.forEach((t) => beep(t));
  } catch {
    // Web Audio no disponible en este navegador: seguimos sin sonido.
  }
  try {
    if (navigator.vibrate) navigator.vibrate(pattern.vibrate);
  } catch {
    // Vibración no soportada: se ignora.
  }
}
