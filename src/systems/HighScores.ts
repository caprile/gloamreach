// HighScores.ts — minimal localStorage high-score table (M-R1). The game's
// first persisted data: only meta (run scores) survives between runs, never
// full game state. Deliberately tolerant of a missing/corrupt store since
// nothing else has ever written here.
import type { RunOutcome } from "./Run";

export interface ScoreEntry {
  score: number;
  outcome: RunOutcome;
  seed: string;
  elapsedMs: number;
  kills: number;
  level: number;
  dateISO: string;
}

const STORAGE_KEY = "survivor-rpg:highscores:v1";
const MAX_ENTRIES = 20;

export function loadHighScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}

// Append `entry`, re-sort descending by score, truncate, and persist. Returns
// the sorted table and the 1-based rank of the just-added entry (for
// highlighting it on the run-end screen); rank is 0 if it fell outside the
// retained table.
export function recordHighScore(entry: ScoreEntry): { entries: ScoreEntry[]; rank: number } {
  const entries = loadHighScores();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  const rankIndex = entries.indexOf(entry);
  const trimmed = entries.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Best-effort persist — a full/blocked store shouldn't crash the run-end UI.
  }
  return { entries: trimmed, rank: rankIndex >= 0 && rankIndex < MAX_ENTRIES ? rankIndex + 1 : 0 };
}
