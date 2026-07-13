// A persistent, append-only log of notable events (recipe unlocks, level-ups,
// etc.). Kept as plain data so the UI can render/scroll it and a future
// save/load can persist it. Listeners fire on each new entry so the UI can
// pop a toast + refresh.
export type LogKind = "recipe" | "material" | "levelup" | "info" | "combat" | "biome" | "poi";

export interface LogEntry {
  id: number;
  kind: LogKind;
  message: string;
  icon?: string; // texture key, shown on the recipe-unlock toast
  // Skips the popup toast (recipe/material queue or center stack) — the
  // entry still lands in the persistent scrollable log. Used where a
  // separate, dedicated visual already covers the same event (e.g. the
  // Player-Level-Up banner), so the generic toast would just be a redundant
  // duplicate competing for the same screen space.
  silent?: boolean;
}

export class EventLog {
  private entries: LogEntry[] = [];
  private seq = 0;
  private listeners: ((entry: LogEntry) => void)[] = [];

  add(kind: LogKind, message: string, icon?: string, silent?: boolean): LogEntry {
    const entry: LogEntry = { id: this.seq++, kind, message, icon, silent };
    this.entries.push(entry);
    for (const cb of this.listeners) cb(entry);
    return entry;
  }

  all(): ReadonlyArray<LogEntry> {
    return this.entries;
  }

  onAdd(cb: (entry: LogEntry) => void): void {
    this.listeners.push(cb);
  }
}
