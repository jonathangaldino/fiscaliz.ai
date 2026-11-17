/**
 * Interface sounds, synthesized with the Web Audio API: no audio files, no
 * licenses, a few hundred bytes of code. Every sound is short (< 250 ms) and
 * quiet, and the user can mute them (saved in the browser).
 */

export type SoundName =
  | "tap" // select a pin or a list item
  | "toggleOn" // turn a filter on
  | "toggleOff" // turn a filter off
  | "open" // open the occurrence card
  | "close" // close it
  | "send" // send a message in the simulator
  | "receive" // the bot answers
  | "success"; // an action went through (e.g. verification started)

type Note = {
  /** Start, in seconds from now. */
  at: number;
  frequency: number;
  /** Optional glide to this frequency. */
  to?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
};

const SOUNDS: Record<SoundName, Note[]> = {
  tap: [{ at: 0, frequency: 1320, duration: 0.05, type: "sine", gain: 0.5 }],
  toggleOn: [
    { at: 0, frequency: 660, duration: 0.06 },
    { at: 0.05, frequency: 990, duration: 0.08 },
  ],
  toggleOff: [
    { at: 0, frequency: 880, duration: 0.06 },
    { at: 0.05, frequency: 587, duration: 0.08 },
  ],
  open: [{ at: 0, frequency: 520, to: 880, duration: 0.12, gain: 0.7 }],
  close: [{ at: 0, frequency: 760, to: 420, duration: 0.1, gain: 0.6 }],
  send: [{ at: 0, frequency: 440, to: 1200, duration: 0.14, gain: 0.6 }],
  receive: [
    { at: 0, frequency: 784, duration: 0.09 },
    { at: 0.09, frequency: 1047, duration: 0.14 },
  ],
  success: [
    { at: 0, frequency: 659, duration: 0.09 },
    { at: 0.08, frequency: 831, duration: 0.09 },
    { at: 0.16, frequency: 988, duration: 0.18 },
  ],
};

const STORAGE_KEY = "fiscaliza.sound";
const MASTER_GAIN = 0.07;

let context: AudioContext | null = null;
const listeners = new Set<() => void>();
let memoryEnabled = true;

export function isSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "on";
  } catch {
    // Storage can be unavailable; keep the in-memory value.
  }
  return memoryEnabled;
}

export function setSoundEnabled(enabled: boolean) {
  memoryEnabled = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function audioContext(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  context ??= new AudioContext();
  // Browsers start it suspended until a user gesture; sounds always follow one.
  if (context.state === "suspended") void context.resume();
  return context;
}

/** Plays a sound if sound is on. Never throws. */
export function playSound(name: SoundName) {
  if (!isSoundEnabled()) return;
  try {
    const ctx = audioContext();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
    const now = ctx.currentTime;
    for (const note of SOUNDS[name]) {
      const start = now + note.at;
      const end = start + note.duration;
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      oscillator.type = note.type ?? "triangle";
      oscillator.frequency.setValueAtTime(note.frequency, start);
      if (note.to) {
        oscillator.frequency.exponentialRampToValueAtTime(note.to, end);
      }
      // Quick attack and exponential release: a soft "tick", no clicks.
      const peak = note.gain ?? 1;
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(peak, start + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(envelope).connect(master);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    }
  } catch {
    // Sound is a nicety; never break the UI for it.
  }
}
