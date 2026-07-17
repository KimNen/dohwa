import type { CropRect, DohwaEvent, DohwaNode, DohwaOptions, ExportPNGOptions, ExportSVGOptions, HistoryState, ImageNode, Point, ReplayOptions, SceneJSON, Style, TextNode, Tool, Viewport } from '../types.js';
import { type AlignMode, type DistributeAxis } from '../geometry/geometry.js';
import { type Matrix } from '../geometry/matrix.js';
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
    private snapEnabled;
    private pressureEnabled;
    private clipboard;
    private editing;
    private cropping;
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
    /** Whether moves snap to other objects' edges/centers. */
    isSnapEnabled(): boolean;
    setSnapEnabled(on: boolean): void;
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
    /** Move the selection one step toward the front (later in z-order). */
    bringForward(): void;
    /** Move the selection one step toward the back (earlier in z-order). */
    sendBackward(): void;
    private reorderStep;
    /** Align every selected node to the selection's shared edge or center. */
    alignSelection(mode: AlignMode): void;
    /** Spread the selection so gaps between consecutive nodes are equal. */
    distributeSelection(axis: DistributeAxis): void;
    /** A node's local (pre-pivot) transform: explicit matrix, else legacy rotation, else identity. */
    private localMatrix;
    /**
     * Compose `m` onto the selection's transforms, pivoting around `pivot`.
     * nodeMatrix() pivots each node on its OWN bbox center, so `m` is re-based
     * per node: L' = T(pivot−c) · m · T(c−pivot) · L. Legacy `rotation` is folded
     * into the resulting matrix.
     */
    private applyMatrixToSelection;
    /** Apply an affine matrix to the selection, pivoting on the selection center. */
    transformSelection(m: Matrix, pivot?: Point): void;
    /** Skew the selection by the given angles (radians) around its center. */
    skewSelection(skewX: number, skewY?: number): void;
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
    /** True when exactly one unlocked image is selected (crop can start). */
    canCrop(): boolean;
    /** True while the interactive crop editor is open. */
    isCropping(): boolean;
    /** id of the image being cropped, or null. */
    getCroppingId(): string | null;
    /**
     * Enter interactive crop mode on the selected image (also reachable by
     * double-clicking an image). Drag the handles to trim, drag inside to
     * slide the image behind the window; Enter applies, Shift+Enter lifts the
     * window out as a separate piece (see extractCrop), Esc cancels.
     */
    startCrop(): boolean;
    /** Commit the pending crop and leave crop mode. No-op when not cropping. */
    applyCrop(): void;
    /** Discard the pending crop, restoring the image as it was. */
    /** True while the crop editor is open, so the window can be lifted out. */
    canExtractCrop(): boolean;
    /**
     * Finish cropping by lifting the crop window out as a NEW image piece and
     * leaving the source untouched — cut a piece off and drag it away.
     *
     * The piece is the same `src` carrying its own crop window, so nothing is
     * copied or rasterized: it stays a real image node (vector-clean through
     * exportSVG) and the original keeps every pixel. Returns the new node, or
     * null when the crop editor isn't open.
     */
    extractCrop(): ImageNode | null;
    cancelCrop(): void;
    /** Set (or clear, with null) an image's crop window programmatically. */
    setImageCrop(id: string, crop: CropRect | null): boolean;
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
    /** Crop editor frame: the image's own rect, rotation-aware. */
    private cropFrame;
    /**
     * While cropping: the full (uncropped) image as a ghost behind the scene,
     * plus a crisp re-draw of the cropped node on top. Runs in world space.
     */
    private renderCropGhost;
    /** Screen-space crop window border + handles (solid, unlike selection). */
    private renderCropOverlay;
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
    /**
     * A freehand sample. Stylus force is recorded only for a real pen that
     * reports it — mouse and touch strokes stay uniform-width, exactly as before.
     */
    private strokePoint;
    /** Map a world point into the frame's local (unrotated) space. */
    private toFrameLocal;
    private cloneSelection;
    private onPointerDown;
    /** Pointer-down routing while the crop editor is open. */
    private onCropPointerDown;
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