import type { DohwaEvent, DohwaNode, DohwaOptions, ExportPNGOptions, ExportSVGOptions, HistoryState, ImageNode, Point, ReplayOptions, SceneJSON, Style, TextNode, Tool, Viewport } from '../types.js';
export declare class Dohwa {
    readonly container: HTMLElement;
    readonly canvas: HTMLCanvasElement;
    private ctx;
    private nodes;
    private spatialIndex;
    private spatialDirty;
    private idToIndex;
    private selection;
    private tool;
    private style;
    private viewport;
    private images;
    private mode;
    private spaceDown;
    private background;
    private fontFamily;
    private fontSize;
    private minZoom;
    private maxZoom;
    private clipboard;
    private editing;
    private replaying;
    private timeline;
    private emitter;
    private history;
    private rafId;
    private resizeObserver;
    private disposed;
    private detachFns;
    constructor(container: HTMLElement, options?: DohwaOptions);
    on(event: DohwaEvent, fn: (payload?: unknown) => void): () => void;
    getTool(): Tool;
    setTool(tool: Tool): void;
    getStyle(): Style;
    /** Sets the style for new nodes AND applies it to the current selection. */
    setStyle(patch: Partial<Style>): void;
    getNodes(): DohwaNode[];
    getSelectedIds(): string[];
    selectAll(): void;
    clearSelection(): void;
    deleteSelection(): void;
    duplicateSelection(): void;
    copySelection(): void;
    cutSelection(): void;
    paste(): void;
    /** Group the current selection (2+ nodes) into one GroupNode. */
    group(): void;
    /** Ungroup any selected GroupNodes back into top-level nodes. */
    ungroup(): void;
    bringToFront(): void;
    sendToBack(): void;
    flipSelection(axis: 'h' | 'v'): void;
    lockSelection(): void;
    unlockAll(): void;
    hasLockedNodes(): boolean;
    /** Add a text node programmatically. */
    addText(text: string, at?: Point, fontSize?: number): TextNode;
    /** Begin inline editing for a text node (creates a floating textarea). */
    startTextEdit(node: TextNode): void;
    finishTextEdit(): void;
    /** Add an image from a URL or dataURL at the viewport center. */
    addImage(src: string): Promise<ImageNode>;
    /** Add an image from a File (e.g. <input type=file> or drag & drop). */
    addImageFromFile(file: File): Promise<ImageNode>;
    undo(): void;
    redo(): void;
    getHistoryState(): HistoryState;
    /** Append-only chronology of every committed state (true drawing order). */
    getTimeline(): string[];
    /** id of the text node currently being edited inline, or null. */
    getEditingTextId(): string | null;
    isReplaying(): boolean;
    /** Replay the drawing chronology from the first stroke to now. */
    replay(options?: ReplayOptions): Promise<void>;
    clear(): void;
    getViewport(): Viewport;
    setZoom(scale: number, screenAnchor?: Point): void;
    zoomIn(): void;
    zoomOut(): void;
    resetView(): void;
    /** Fit all content into the view with padding. */
    zoomToFit(padding?: number): void;
    toJSON(): SceneJSON;
    loadJSON(json: SceneJSON | string): void;
    /** Render content to a PNG dataURL. */
    exportPNG(options?: ExportPNGOptions): string;
    /** Export the scene as a standalone SVG string. */
    exportSVG(options?: ExportSVGOptions): string;
    destroy(): void;
    private viewCenterWorld;
    private selectedNodes;
    private reorder;
    private reassignIds;
    private preloadImages;
    private remeasureTexts;
    private serialize;
    private restore;
    /** Record the current state into history + timeline and notify listeners. */
    private commit;
    private emitChange;
    private emitSelection;
    screenToWorld(p: Point): Point;
    worldToScreen(p: Point): Point;
    private pointerPos;
    private syncCanvasSize;
    private requestRender;
    private render;
    /**
     * Viewport culling: only nodes whose world AABB overlaps the visible region.
     * On an infinite canvas most content is usually off-screen, so this bounds
     * per-frame cost by what's actually in view rather than the scene size.
     * Below a threshold the cull isn't worth the AABB math, so we skip it.
     */
    private visibleNodes;
    /** Selection frame: single node → its rotated local box; multi → union AABB. */
    private selectionFrame;
    /** Screen-space positions of the 8 resize handles + rotation handle. */
    private framePoints;
    private renderOverlay;
    private bindEvents;
    private hitTolerance;
    /** Mark the spatial index stale — rebuilt lazily on the next query. */
    private invalidateIndex;
    /** Rebuild the index from current node AABBs if it's stale. */
    private ensureIndex;
    /**
     * Broad-phase: ids whose AABB is near a point. For small scenes the index
     * overhead isn't worth it, so we only consult it past a threshold and fall
     * back to the full list otherwise. Either way the caller does the precise
     * (transform-aware) hitTestNode on the returned candidates.
     */
    private candidatesAtPoint;
    private hitTopmost;
    /** Which handle (if any) is under a screen point. */
    private handleAt;
    private cloneSelection;
    private onPointerDown;
    private eraseAt;
    private onPointerMove;
    private onPointerUp;
    private onDoubleClick;
    private onWheel;
    private isEditableTarget;
    private onKeyDown;
    private onKeyUp;
    private updateCursor;
}
//# sourceMappingURL=dohwa.d.ts.map