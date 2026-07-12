// Minimal procedurally-generated SFX layer — raw Web Audio oscillator/gain
// envelopes synthesized at call time, no asset files. Same "everything
// generated in code, swap for real assets later" ethos BootScene established
// for placeholder textures. Deliberately NOT reset per-run (see
// MainScene.create()'s field-reset audit) — the AudioContext + on/off
// preference should survive a "New Run" restart, unlike gameplay state.

const STORAGE_KEY = "survivor-rpg:sfx-enabled:v1";

function loadEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? true : raw === "1";
  } catch {
    return true;
  }
}

function saveEnabled(v: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  } catch {
    // ignore (e.g. private-browsing storage denial)
  }
}

interface ToneOpts {
  toFreq?: number; // exponential pitch sweep target
  gain?: number; // peak volume, 0..1
  delaySec?: number; // schedule offset from "now" — used to sequence notes
  // without a second AudioContext timer (avoids interacting with Phaser's
  // own pause/time system at all, since Web Audio scheduling is independent).
}

export class SfxPlayer {
  private ctx: AudioContext | null = null;
  private enabled = loadEnabled();

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    saveEnabled(v);
  }

  // Lazily created + resumed on first real use — browsers block audio before
  // a user gesture, and every call site here is already inside one (a click/
  // keypress triggered the game action that calls it).
  private context(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, durationMs: number, type: OscillatorType, opts?: ToneOpts): void {
    const ctx = this.context();
    if (!ctx) return;
    const start = ctx.currentTime + (opts?.delaySec ?? 0);
    const end = start + durationMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (opts?.toFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.toFreq), end);
    const peak = opts?.gain ?? 0.1;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }

  // Short percussive downward blip — shared by both "you hit something" and
  // "something hit you" (no separate variant; minimal scope). Fires on EVERY
  // hit in combat, so it's kept deliberately soft/short (playtest feedback:
  // the original was "annoying" at sustained combat pace).
  hit(): void {
    this.tone(180, 55, "square", { toFreq: 90, gain: 0.035 });
  }

  // Crit hit (M-SS) — a brighter upward zing distinct from the soft downward
  // hit() blip, so a crit reads by ear. Fires only on crits (rarer than every
  // hit), but still kept modest per the "subtle feedback for frequent events"
  // note.
  crit(): void {
    this.tone(520, 70, "square", { toFreq: 880, gain: 0.055 });
  }

  // Quick upward chirp.
  pickup(): void {
    this.tone(520, 90, "sine", { toFreq: 900, gain: 0.09 });
  }

  // Two-note ascending blip — used for craft/process/cook/refine, all "you
  // made something" moments.
  craft(): void {
    this.tone(440, 80, "triangle", { gain: 0.1 });
    this.tone(660, 100, "triangle", { gain: 0.1, delaySec: 0.08 });
  }

  // Three-note ascending arpeggio (A-C#-E major triad) — reserved for the
  // rarer Player Level-up (the "big deal" moment).
  levelUp(): void {
    this.tone(440, 90, "square", { gain: 0.11 });
    this.tone(554, 90, "square", { gain: 0.11, delaySec: 0.09 });
    this.tone(659, 160, "square", { gain: 0.12, delaySec: 0.18 });
  }

  // Quieter two-note blip for a SKILL level-up — these fire much more often
  // than Player level-ups, so it's a lower-key cousin of levelUp(), not the
  // full triad.
  skillUp(): void {
    this.tone(392, 70, "triangle", { gain: 0.06 });
    this.tone(494, 100, "triangle", { gain: 0.07, delaySec: 0.07 });
  }

  // Low ominous swell sweeping downward.
  // Playtest request: a wolf-howl cue alongside this on nightfall. Left
  // un-built — every cue here is a raw oscillator/gain envelope synthesized
  // at call time (no asset files, see the class comment), and a convincing
  // howl (pitch bend + formant-ish timbre) isn't a good fit for that same
  // simple-envelope approach. Revisit once real audio assets are in scope
  // (audio/art are deliberately last on the roadmap — see CLAUDE.md).
  nightfall(): void {
    this.tone(140, 900, "sawtooth", { toFreq: 70, gain: 0.06 });
  }

  // Descending sad tone.
  death(): void {
    this.tone(300, 550, "sine", { toFreq: 80, gain: 0.12 });
  }
}
