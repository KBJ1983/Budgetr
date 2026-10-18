/**
 * A calm, happy background tune for the films, synthesised from scratch (our own music – no samples, no licence):
 * a soft pad, a plucked arpeggio, a round bass, a bell-like electric-piano melody over a I–V–vi–IV progression, a
 * very light kick and shaker, and a small reverb. Deterministic: the same film and length give the same file.
 * Used by scripts/video.mjs; on its own it writes a WAV to listen to:
 *
 *   node scripts/music.mjs privat 90 out.wav
 */
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const RATE = 44100;

/** One tune per film: key (MIDI note of the tonic), tempo and a seed for the melody. */
export const TUNES = {
  privat: { key: 60, bpm: 84, seed: 7 },
  erhverv: { key: 65, bpm: 82, seed: 3 },
  skole: { key: 67, bpm: 90, seed: 11 },
  "kom-i-gang": { key: 62, bpm: 86, seed: 5 },
};

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
/** Small seeded random numbers (mulberry32). */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Chords as scale degrees from the tonic (semitones): I, V, vi, IV, I, iii, IV, V
const PROG = [
  [0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12],
  [0, 4, 7], [4, 7, 11], [5, 9, 12], [7, 11, 14],
];
const PENTA = [0, 2, 4, 7, 9]; // major pentatonic: always sounds friendly over these chords

/** Renders `seconds` of music as a stereo Float32 pair. */
export function render(name, seconds) {
  const { key, bpm, seed } = TUNES[name] ?? TUNES.privat;
  const n = Math.ceil(seconds * RATE);
  const L = new Float32Array(n), R = new Float32Array(n);
  const beat = 60 / bpm, bar = beat * 4;
  const rand = rng(seed);

  /** Adds a voice: fn(time since note start) → sample, for `len` seconds, panned (-1 left … 1 right). */
  function add(start, len, gain, pan, fn) {
    const a = Math.floor(start * RATE), b = Math.min(n, Math.floor((start + len) * RATE));
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = Math.max(0, a); i < b; i++) {
      const v = fn((i - a) / RATE);
      L[i] += v * gl;
      R[i] += v * gr;
    }
  }
  const TAU = 2 * Math.PI;
  // Soft pad: three slightly detuned sines per note, slow attack and release
  const pad = (f, len) => (t) => {
    const env = Math.min(1, t / 0.9) * Math.min(1, (len - t) / 0.9);
    return env * (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.003 * t) + 0.5 * Math.sin(TAU * f * 0.997 * t) + 0.12 * Math.sin(TAU * f * 2 * t)) / 2;
  };
  // Pluck (a little marimba-like): fundamental + a quiet fourth partial, quick decay
  const pluck = (f) => (t) => Math.min(1, t / 0.004) * (Math.sin(TAU * f * t) * Math.exp(-t * 4.2) + 0.18 * Math.sin(TAU * f * 4 * t) * Math.exp(-t * 14));
  // Round bass
  const bass = (f, len) => (t) => Math.min(1, t / 0.01) * Math.min(1, (len - t) / 0.08) * Math.exp(-t * 0.9) * (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * f * 2 * t));
  // Electric piano / bell (FM 1:1 with a decaying index)
  const keys = (f, len) => (t) => {
    const idx = 1.3 * Math.exp(-t * 3);
    const env = Math.min(1, t / 0.006) * Math.exp(-t * 1.6) * Math.min(1, (len - t) / 0.12);
    return env * Math.sin(TAU * f * t + idx * Math.sin(TAU * f * t));
  };
  const kick = (t) => Math.exp(-t * 18) * Math.sin(TAU * (48 + 70 * Math.exp(-t * 30)) * t);
  let noise = 0, prev = 0;
  const shaker = (t) => {
    noise = 0.6 * noise + 0.4 * (rand() * 2 - 1);
    const hp = (rand() * 2 - 1) - noise; // crude band-pass: white noise minus its smoothed self, then smoothed a little
    prev = 0.5 * (hp + prev);
    return prev * Math.min(1, t / 0.008) * Math.exp(-t * 38);
  };

  // A two-bar melody phrase: rhythm in beats, the notes walk the pentatonic scale near the chord
  const RHYTHMS = [
    [1, 1, 2, 3, 1],
    [1.5, 0.5, 2, 2, 2],
    [2, 1, 1, 4],
    [1, 1, 1, 1, 3, 1],
  ];
  function phrase(rootOff) {
    const r = RHYTHMS[Math.floor(rand() * RHYTHMS.length)];
    let deg = 2 + Math.floor(rand() * 3);
    return r.map((d, i) => {
      if (i) deg = Math.max(0, Math.min(9, deg + [-2, -1, -1, 1, 1, 2][Math.floor(rand() * 6)]));
      const last = i === r.length - 1;
      const step = last ? 0 : PENTA[deg % 5] + 12 * Math.floor(deg / 5);
      return [d, last ? rootOff : step];
    });
  }
  // Phrases A A' B A, repeated: the tune comes back, so it feels like a song and not a random walk
  const A = phrase(0), B = phrase(4), A2 = phrase(0);
  const PHRASES = [A, A2, B, A];

  const bars = Math.ceil(seconds / bar);
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, chord = PROG[b % PROG.length];
    const notes = chord.map((d) => key + d);
    // Pad all the way, a little quieter at first
    notes.forEach((m, i) => add(t0, bar + 0.6, b < 2 ? 0.035 : 0.045, (i - 1) * 0.5, pad(hz(m - 12), bar + 0.6)));
    if (b >= 1) {
      // Arpeggio in eighths: 1 5 8 10 8 5 8 5 (up an octave on the top)
      const arp = [notes[0], notes[1], notes[2], notes[0] + 12, notes[2], notes[1], notes[2], notes[1]];
      arp.forEach((m, i) => add(t0 + i * beat / 2, 1.2, 0.07, i % 2 ? 0.35 : -0.35, pluck(hz(m))));
      // Bass on beats 1 and 3
      const root = key - 24 + (chord[0] % 12);
      add(t0, beat * 2, 0.16, 0, bass(hz(root), beat * 2));
      add(t0 + beat * 2, beat * 2, 0.13, 0, bass(hz(b % 2 ? root + 7 : root), beat * 2));
    }
    if (b >= 3) {
      // Kick on 1 and 3, shaker on the offbeats
      add(t0, 0.4, 0.22, 0, kick);
      add(t0 + 2 * beat, 0.4, 0.16, 0, kick);
      for (let i = 0; i < 4; i++) add(t0 + (i + 0.5) * beat, 0.12, 0.035, 0.4, shaker);
    }
    if (b >= 4 && b % 2 === 0) {
      // A melody phrase every two bars, resting every fourth phrase so it breathes
      const k = (b - 4) / 2;
      if (k % 8 === 7) continue;
      let at = t0;
      for (const [d, step] of PHRASES[k % 4]) {
        add(at, d * beat + 0.3, 0.1, 0.1, keys(hz(key + 12 + step), d * beat + 0.3));
        at += d * beat;
      }
    }
  }

  // Reverb: four combs and two allpasses per channel (Schroeder), slightly different per side for width
  function reverb(x, spread) {
    const outBuf = new Float32Array(x.length);
    for (const [ms, fb] of [[29.7, 0.78], [37.1, 0.76], [41.1, 0.74], [43.7, 0.72]]) {
      const d = Math.floor(((ms + spread) / 1000) * RATE), buf = new Float32Array(d);
      let lp = 0;
      for (let i = 0, j = 0; i < x.length; i++, j = (j + 1) % d) {
        const y = buf[j];
        lp = 0.7 * y + 0.3 * lp; // damping: the tail gets darker
        buf[j] = x[i] + lp * fb;
        outBuf[i] += y / 4;
      }
    }
    for (const ms of [5, 1.7]) {
      const d = Math.floor((ms / 1000) * RATE), buf = new Float32Array(d);
      for (let i = 0, j = 0; i < x.length; i++, j = (j + 1) % d) {
        const b = buf[j], v = outBuf[i];
        buf[j] = v + 0.5 * b;
        outBuf[i] = b - 0.5 * buf[j];
      }
    }
    return outBuf;
  }
  const wl = reverb(L, 0), wr = reverb(R, 1.3);
  // Mix, fade in and out, then normalise to -3 dB
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE, fade = Math.min(1, t / 1.5, (seconds - t) / 3.5);
    L[i] = (L[i] + 0.35 * wl[i]) * Math.max(0, fade);
    R[i] = (R[i] + 0.35 * wr[i]) * Math.max(0, fade);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const g = peak ? 0.7 / peak : 1;
  for (let i = 0; i < n; i++) (L[i] *= g), (R[i] *= g);
  return [L, R];
}

/** Writes the tune as a 16-bit stereo WAV. */
export function writeMusic(path, name, seconds) {
  const [L, R] = render(name, seconds);
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  writeFileSync(path, buf);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [name = "privat", secs = "60", out = `${name}.wav`] = process.argv.slice(2);
  writeMusic(out, name, Number(secs));
  console.log(`Wrote ${out}`);
}
