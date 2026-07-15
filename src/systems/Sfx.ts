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

  // --- Relic Forge (S5) ---------------------------------------------------
  // The slot-machine reveal's payoff scales HARD by rarity: Common is a modest
  // "nice" pop, Mythic is a layered, longer fanfare — matching RelicRevealFx's
  // per-rarity visual escalation. All synthesized here at call time like every
  // other cue (no asset files).

  // Faint click on each reel-gem swap during the spin. Fires many times, so
  // kept near-inaudible individually; together they read as a spinning reel.
  relicReelTick(): void {
    this.tone(1400, 14, "square", { gain: 0.018 });
  }

  // Common — a modest single rising blip.
  relicCommon(): void {
    this.tone(523, 130, "triangle", { toFreq: 784, gain: 0.09 });
  }

  // Uncommon — a brighter two-note rise, a touch louder.
  relicUncommon(): void {
    this.tone(523, 90, "triangle", { gain: 0.1 });
    this.tone(698, 170, "triangle", { toFreq: 880, gain: 0.11, delaySec: 0.09 });
  }

  // Rare — a real fanfare: low body + ascending major arpeggio + bright sparkle.
  relicRare(): void {
    this.tone(131, 360, "triangle", { gain: 0.09 }); // low body
    this.tone(523, 110, "square", { gain: 0.1, delaySec: 0.02 }); // C5
    this.tone(659, 110, "square", { gain: 0.1, delaySec: 0.12 }); // E5
    this.tone(784, 130, "square", { gain: 0.11, delaySec: 0.22 }); // G5
    this.tone(1047, 300, "square", { toFreq: 1319, gain: 0.12, delaySec: 0.34 }); // C6 sparkle
  }

  // Mythic — MASSIVE + longer: a sub boom under a full ascending run, a
  // sustained shimmer pad, and a high sparkle tail. The rarest payoff in game.
  relicMythic(): void {
    this.tone(98, 620, "sawtooth", { toFreq: 65, gain: 0.14 }); // sub boom
    this.tone(523, 120, "square", { gain: 0.11, delaySec: 0.05 }); // C5
    this.tone(659, 120, "square", { gain: 0.11, delaySec: 0.15 }); // E5
    this.tone(784, 120, "square", { gain: 0.12, delaySec: 0.25 }); // G5
    this.tone(1047, 130, "square", { gain: 0.12, delaySec: 0.35 }); // C6
    this.tone(1319, 480, "square", { toFreq: 1568, gain: 0.13, delaySec: 0.45 }); // E6 rise
    this.tone(1047, 760, "triangle", { gain: 0.06, delaySec: 0.35 }); // sustained pad
    this.tone(2093, 300, "sine", { toFreq: 2637, gain: 0.08, delaySec: 0.7 }); // sparkle tail
  }

  // Failed roll — a dusty downward fizzle. Subdued so wins feel better by
  // contrast (mirrors the "Crumbled to dust…" visual).
  relicCrumble(): void {
    this.tone(300, 280, "sawtooth", { toFreq: 90, gain: 0.05 });
    this.tone(190, 380, "triangle", { toFreq: 70, gain: 0.04, delaySec: 0.06 });
  }
}
