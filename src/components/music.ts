"use client";

/**
 * Música instrumental ORIGINAL generada en el navegador con Web Audio
 * (cajita musical en 3/4). No usa archivos ni música comercial.
 * Punto de reemplazo: para usar una pista con licencia, sustituir esta
 * clase por un <audio> con la misma interfaz start()/stop().
 * Solo arranca tras un gesto explícito del usuario.
 */

type Note = [midi: number, beats: number];

const MELODY: Note[] = [
  [71, 1], [74, 1], [79, 1],
  [78, 2], [76, 1],
  [74, 1], [71, 1], [67, 1],
  [69, 3],
  [72, 1], [76, 1], [81, 1],
  [79, 2], [78, 1],
  [76, 1], [74, 1], [72, 1],
  [71, 3],
  [71, 1], [74, 1], [79, 1],
  [83, 2], [81, 1],
  [79, 1], [76, 1], [72, 1],
  [74, 3],
  [76, 1], [78, 1], [79, 1],
  [81, 2], [78, 1],
  [79, 1.5], [74, 0.5], [71, 1],
  [67, 3],
];

// Una nota grave por compás (3 tiempos).
const BASS = [43, 50, 43, 50, 45, 50, 48, 43, 43, 43, 48, 50, 48, 50, 43, 43];

const BEAT = 0.52; // segundos
const LOOP_BEATS = BASS.length * 3;

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class MusicBox {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private loopStart = 0;
  private scheduledUntil = 0;

  get playing() {
    return this.timer !== null;
  }

  async start(): Promise<boolean> {
    if (this.playing) return true;
    const Ctor =
      typeof window !== "undefined"
        ? window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!Ctor) return false;
    try {
      this.ctx = this.ctx ?? new Ctor();
      await this.ctx.resume();
      if (this.ctx.state !== "running") return false;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 1.2);
      this.master.connect(this.ctx.destination);
      this.loopStart = this.ctx.currentTime + 0.1;
      this.scheduledUntil = this.loopStart;
      this.schedule();
      this.timer = setInterval(() => this.schedule(), 400);
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + 0.3);
      const old = this.master;
      setTimeout(() => old.disconnect(), 400);
    }
    this.master = null;
    void this.ctx?.suspend().catch(() => undefined);
  }

  /** Programa notas con 2 segundos de anticipación. */
  private schedule() {
    if (!this.ctx || !this.master) return;
    const horizon = this.ctx.currentTime + 2;
    while (this.scheduledUntil < horizon) {
      this.scheduleLoop(this.scheduledUntil);
      this.scheduledUntil += LOOP_BEATS * BEAT;
    }
  }

  private scheduleLoop(t0: number) {
    let t = t0;
    for (const [midi, beats] of MELODY) {
      this.bell(freq(midi), t, 0.22);
      t += beats * BEAT;
    }
    BASS.forEach((midi, bar) => this.pad(freq(midi), t0 + bar * 3 * BEAT, 3 * BEAT));
  }

  private bell(f: number, when: number, level: number) {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, when);
    out.gain.linearRampToValueAtTime(level, when + 0.01);
    out.gain.exponentialRampToValueAtTime(0.0001, when + 1.6);
    out.connect(this.master!);
    [1, 2.01, 3.98].forEach((mult, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = f * mult;
      g.gain.value = [1, 0.25, 0.08][i];
      osc.connect(g).connect(out);
      osc.start(when);
      osc.stop(when + 1.7);
    });
  }

  private pad(f: number, when: number, dur: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.08, when + 0.3);
    g.gain.linearRampToValueAtTime(0, when + dur);
    g.connect(this.master!);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    osc.connect(g);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }
}
