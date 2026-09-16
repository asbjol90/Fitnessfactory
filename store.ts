import { reduce, SAVE_KEY, V1_SAVE_KEY, loadState, type Action, type GameEvent, type State } from '../engine';

type Listener = (s: State, events: GameEvent[], action: Action | null) => void;

class Store {
  state: State;
  migrated: boolean;
  private listeners = new Set<Listener>();

  constructor() {
    const { state, migrated } = loadState(localStorage, Date.now());
    this.state = state;
    this.migrated = migrated;
    // Catch up on time immediately (drain, belts, weekly reset).
    const r = reduce(this.state, { type: 'tick' }, this.ctx());
    this.state = r.state;
    this.persist();
    setTimeout(() => this.emit(r.events, null), 0);
  }

  private ctx() { return { now: Date.now(), rng: Math.random }; }

  /** Returns the error message if the action was refused, else null. */
  dispatch(action: Action): string | null {
    const r = reduce(this.state, action, this.ctx());
    if (r.error) return r.error;
    this.state = r.state;
    this.persist();
    this.emit(r.events, action);
    return null;
  }

  /** Dry run: would this action be accepted? */
  can(action: Action): boolean {
    return reduce(this.state, action, this.ctx()).error === null;
  }

  /** Re-render without changing state (UI-local form changes). */
  refresh() { this.emit([], null); }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(events: GameEvent[], action: Action | null) {
    for (const l of this.listeners) l(this.state, events, action);
  }
  private persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch { /* quota or private mode */ }
  }
  /** Full reset: current save, the migrated v1 save (else it would come back on reload), and UI flags. */
  reset() {
    for (const k of [SAVE_KEY, V1_SAVE_KEY, 'fitnessfactory_seen_raid']) localStorage.removeItem(k);
    location.reload();
  }
  export(): string { return JSON.stringify(this.state); }
  import(json: string): boolean {
    try {
      const s = JSON.parse(json) as State;
      if (s.version !== this.state.version) return false;
      this.state = s; this.persist(); this.emit([], null); return true;
    } catch { return false; }
  }
}

export const store = new Store();
