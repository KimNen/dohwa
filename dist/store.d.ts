import type { Dohwa } from './core/dohwa.js';
import type { Style, Tool, Viewport } from './types.js';
import { type ActionKey } from './tools.js';
/**
 * A framework-agnostic snapshot of everything a toolbar needs.
 * The engine emits granular events; this collapses them into one
 * immutable object with a subscribe/getSnapshot pair — exactly the
 * shape React's useSyncExternalStore wants, and trivially adaptable
 * to Zustand, Vue reactive, Svelte stores, or a plain callback.
 */
export interface DohwaUIState {
    tool: Tool;
    style: Style;
    selectedIds: string[];
    selectionCount: number;
    canUndo: boolean;
    canRedo: boolean;
    viewport: Viewport;
    zoomPercent: number;
    editingTextId: string | null;
    isReplaying: boolean;
    hasLockedNodes: boolean;
    /** true if a replay is possible (2+ timeline frames) */
    canReplay: boolean;
    /** true while the interactive image-crop editor is open */
    isCropping: boolean;
    /** true when exactly one unlocked image is selected */
    canCrop: boolean;
}
export type Unsubscribe = () => void;
export declare class DohwaStore {
    private app;
    private listeners;
    private state;
    private offs;
    constructor(app: Dohwa);
    /** For React: useSyncExternalStore(store.subscribe, store.getSnapshot) */
    subscribe: (fn: () => void) => Unsubscribe;
    getSnapshot: () => DohwaUIState;
    /** Whether an action is currently available (for disabling buttons). */
    canRun: (key: ActionKey) => boolean;
    /** Run any toolbar action by key — one switch instead of 20 wired handlers. */
    run: (key: ActionKey) => void;
    destroy(): void;
    private read;
}
/** Convenience: create a store bound to an engine instance. */
export declare function createStore(app: Dohwa): DohwaStore;
//# sourceMappingURL=store.d.ts.map