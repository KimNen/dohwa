type Listener = (payload?: unknown) => void;
export declare class Emitter<E extends string> {
    private listeners;
    on(event: E, fn: Listener): () => void;
    off(event: E, fn: Listener): void;
    emit(event: E, payload?: unknown): void;
    clear(): void;
}
/**
 * Snapshot-based undo/redo. Snapshots are JSON strings of the scene.
 * Simple and bulletproof for v0.1 — can move to command pattern later.
 */
export declare class History {
    private stack;
    private index;
    private readonly limit;
    constructor(initial: string, limit?: number);
    /** Record a new state. Drops any redo branch. */
    push(snapshot: string): void;
    undo(): string | null;
    redo(): string | null;
    get canUndo(): boolean;
    get canRedo(): boolean;
    reset(initial: string): void;
}
export {};
//# sourceMappingURL=core.d.ts.map