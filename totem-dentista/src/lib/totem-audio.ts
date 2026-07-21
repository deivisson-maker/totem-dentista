// Áudio sintetizado via WebAudio + tentativa de "audio ducking" (abaixar volume
// de outros apps sem pausá-los) quando a plataforma suportar.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
const BASE_MASTER = 0.9;
const FOCUS_MASTER = 1.0;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = BASE_MASTER;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function dest(): AudioNode | null {
  const c = getCtx();
  if (!c || !masterGain) return null;
  return masterGain;
}

export function tick(freq: number, dur = 0.05, vol = 0.6) {
  const c = getCtx();
  const out = dest();
  if (!c || !out) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.connect(gain).connect(out);
  osc.start();
  osc.stop(c.currentTime + dur);
}

export function fanfare() {
  const c = getCtx();
  const out = dest();
  if (!c || !out) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
  notes.forEach((f, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = f;
    const start = c.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.85, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
    osc.connect(gain).connect(out);
    osc.start(start);
    osc.stop(start + 0.5);
  });
}

export function buzzer() {
  const c = getCtx();
  const out = dest();
  if (!c || !out) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.4);
  gain.gain.setValueAtTime(0.7, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  osc.connect(gain).connect(out);
  osc.start();
  osc.stop(c.currentTime + 0.4);
}

export function primeAudio() {
  getCtx();
}

// --- Audio focus (ducking, sem pausar outras mídias) ---
// Estratégia:
// 1. iOS Safari 16.4+ expõe `navigator.audioSession.type`. Definir para
//    "transient-solo" pede ao SO para abaixar/silenciar outras fontes
//    durante nossa reprodução e restaurar sozinho ao voltar para "auto".
// 2. Em Android/Chrome não existe API equivalente. NÃO usamos o truque
//    de <audio> silencioso + MediaSession playing — ele faz o Chrome
//    PAUSAR o YouTube em vez de abaixar. Preferimos deixar as mídias
//    concorrentes tocando e apenas reforçar nosso masterGain.

type AudioSessionType = "auto" | "playback" | "transient" | "transient-solo" | "ambient" | "play-and-record";
interface AudioSessionLike { type: AudioSessionType }

function getAudioSession(): AudioSessionLike | null {
  if (typeof navigator === "undefined") return null;
  const s = (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession;
  return s && typeof s === "object" && "type" in s ? s : null;
}

let focusActive = false;
let previousSessionType: AudioSessionType | null = null;

export function beginAudioFocus() {
  if (typeof window === "undefined" || focusActive) return;
  focusActive = true;

  if (masterGain && ctx) {
    try {
      masterGain.gain.setTargetAtTime(FOCUS_MASTER, ctx.currentTime, 0.05);
    } catch {
      masterGain.gain.value = FOCUS_MASTER;
    }
  }

  const session = getAudioSession();
  if (session) {
    try {
      previousSessionType = session.type;
      session.type = "transient-solo";
    } catch {
      previousSessionType = null;
    }
  }
}

export function endAudioFocus() {
  if (!focusActive) return;
  focusActive = false;

  if (masterGain && ctx) {
    try {
      masterGain.gain.setTargetAtTime(BASE_MASTER, ctx.currentTime, 0.1);
    } catch {
      masterGain.gain.value = BASE_MASTER;
    }
  }

  const session = getAudioSession();
  if (session) {
    try {
      session.type = previousSessionType ?? "auto";
    } catch {
      // ignore
    }
  }
  previousSessionType = null;
}
