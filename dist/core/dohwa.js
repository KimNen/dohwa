import { DEFAULT_STYLE } from '../types.js';
import { bboxCenter, bboxIntersects, flipNode, getAABB, getBBox, hitTestNode, rotatePoint, scaleNodeInto, translateNode, unionBBox, } from '../geometry/geometry.js';
import { LINE_HEIGHT, measureText, renderScene } from '../render/render.js';
import { sceneToSVG } from '../render/svg.js';
import { Emitter, History } from './core.js';
import { Quadtree } from '../geometry/spatial.js';
let idCounter = 0;
function genId() {
    idCounter += 1;
    return `n${Date.now().toString(36)}${idCounter.toString(36)}`;
}
function deepClone(v) {
    return JSON.parse(JSON.stringify(v));
}
/** handle factors: 0..7 → nw, n, ne, e, se, s, sw, w */
const HANDLES = [
    { hx: 0, hy: 0, cursor: 'nwse-resize' },
    { hx: 0.5, hy: 0, cursor: 'ns-resize' },
    { hx: 1, hy: 0, cursor: 'nesw-resize' },
    { hx: 1, hy: 0.5, cursor: 'ew-resize' },
    { hx: 1, hy: 1, cursor: 'nwse-resize' },
    { hx: 0.5, hy: 1, cursor: 'ns-resize' },
    { hx: 0, hy: 1, cursor: 'nesw-resize' },
    { hx: 0, hy: 0.5, cursor: 'ew-resize' },
];
const SELECTION_COLOR = '#4467ff';
const ROTATE_OFFSET = 26; // screen px above the frame
export class Dohwa {
    constructor(container, options = {}) {
        this.nodes = [];
        this.spatialIndex = null;
        this.spatialDirty = true;
        this.idToIndex = new Map();
        this.selection = new Set();
        this.tool = 'pen';
        this.style = { ...DEFAULT_STYLE };
        this.viewport = { x: 0, y: 0, scale: 1 };
        this.images = new Map();
        this.mode = { kind: 'none' };
        this.spaceDown = false;
        this.clipboard = [];
        this.editing = null;
        this.replaying = false;
        this.timeline = [];
        this.emitter = new Emitter();
        this.rafId = 0;
        this.disposed = false;
        this.detachFns = [];
        this.container = container;
        this.tool = options.tool ?? 'pen';
        this.style = { ...DEFAULT_STYLE, ...options.style };
        this.background = options.background ?? 'transparent';
        this.fontFamily = options.fontFamily ?? 'sans-serif';
        this.fontSize = options.fontSize ?? 28;
        this.minZoom = options.minZoom ?? 0.1;
        this.maxZoom = options.maxZoom ?? 8;
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.touchAction = 'none';
        container.appendChild(this.canvas);
        const ctx = this.canvas.getContext('2d');
        if (!ctx)
            throw new Error('dohwa: 2d context unavailable');
        this.ctx = ctx;
        const initial = this.serialize();
        this.history = new History(initial);
        this.timeline.push(initial);
        this.resizeObserver = new ResizeObserver(() => this.syncCanvasSize());
        this.resizeObserver.observe(container);
        this.syncCanvasSize();
        this.bindEvents();
        this.requestRender();
    }
    // ================================================================ events API
    on(event, fn) {
        return this.emitter.on(event, fn);
    }
    // ================================================================ tools / style
    getTool() {
        return this.tool;
    }
    setTool(tool) {
        if (this.tool === tool)
            return;
        this.finishTextEdit();
        this.tool = tool;
        if (tool !== 'select')
            this.clearSelection();
        this.updateCursor();
        this.emitter.emit('tool', tool);
        this.requestRender();
    }
    getStyle() {
        return { ...this.style };
    }
    /** Sets the style for new nodes AND applies it to the current selection. */
    setStyle(patch) {
        this.style = { ...this.style, ...patch };
        if (this.selection.size > 0) {
            const apply = (node) => {
                node.style = { ...node.style, ...patch };
                if (node.type === 'group')
                    node.children.forEach(apply);
            };
            this.selectedNodes().forEach(apply);
            this.commit();
        }
        this.requestRender();
    }
    // ================================================================ selection
    getNodes() {
        return deepClone(this.nodes);
    }
    getSelectedIds() {
        return [...this.selection];
    }
    selectAll() {
        this.selection = new Set(this.nodes.filter((n) => !n.locked).map((n) => n.id));
        this.emitSelection();
        this.requestRender();
    }
    clearSelection() {
        if (this.selection.size === 0)
            return;
        this.selection.clear();
        this.emitSelection();
        this.requestRender();
    }
    deleteSelection() {
        if (this.selection.size === 0)
            return;
        this.nodes = this.nodes.filter((n) => !this.selection.has(n.id));
        this.selection.clear();
        this.emitSelection();
        this.commit();
        this.requestRender();
    }
    duplicateSelection() {
        const clones = this.selectedNodes().map((n) => {
            const clone = deepClone(n);
            this.reassignIds(clone);
            translateNode(clone, 16, 16);
            return clone;
        });
        if (clones.length === 0)
            return;
        this.nodes.push(...clones);
        this.selection = new Set(clones.map((c) => c.id));
        this.emitSelection();
        this.commit();
        this.requestRender();
    }
    // ================================================================ clipboard
    copySelection() {
        if (this.selection.size === 0)
            return;
        this.clipboard = this.selectedNodes().map((n) => deepClone(n));
    }
    cutSelection() {
        if (this.selection.size === 0)
            return;
        this.copySelection();
        this.deleteSelection();
    }
    paste() {
        if (this.clipboard.length === 0)
            return;
        const clones = this.clipboard.map((n) => {
            const clone = deepClone(n);
            this.reassignIds(clone);
            translateNode(clone, 16, 16);
            return clone;
        });
        this.nodes.push(...clones);
        this.setTool('select');
        this.selection = new Set(clones.map((c) => c.id));
        this.emitSelection();
        this.commit();
        this.requestRender();
    }
    // ================================================================ group / order
    /** Group the current selection (2+ nodes) into one GroupNode. */
    group() {
        const selected = this.selectedNodes();
        if (selected.length < 2)
            return;
        const group = {
            id: genId(),
            type: 'group',
            style: { ...DEFAULT_STYLE, opacity: 1 },
            children: selected.map((n) => deepClone(n)),
        };
        const topIndex = Math.max(...selected.map((n) => this.nodes.indexOf(n)));
        this.nodes = this.nodes.filter((n) => !this.selection.has(n.id));
        const insertAt = Math.min(topIndex - (selected.length - 1), this.nodes.length);
        this.nodes.splice(Math.max(insertAt, 0), 0, group);
        this.selection = new Set([group.id]);
        this.emitSelection();
        this.commit();
        this.requestRender();
    }
    /** Ungroup any selected GroupNodes back into top-level nodes. */
    ungroup() {
        const next = [];
        const newSelection = new Set();
        let changed = false;
        for (const node of this.nodes) {
            if (this.selection.has(node.id) && node.type === 'group') {
                const r = node.rotation ?? 0;
                const c = bboxCenter(getBBox(node));
                for (const child of node.children) {
                    if (r !== 0) {
                        // bake the group's rotation into each child
                        const childCenter = bboxCenter(getBBox(child));
                        const moved = rotatePoint(childCenter, c, r);
                        translateNode(child, moved.x - childCenter.x, moved.y - childCenter.y);
                        child.rotation = (child.rotation ?? 0) + r;
                    }
                    next.push(child);
                    newSelection.add(child.id);
                }
                changed = true;
            }
            else {
                next.push(node);
                if (this.selection.has(node.id))
                    newSelection.add(node.id);
            }
        }
        if (!changed)
            return;
        this.nodes = next;
        this.selection = newSelection;
        this.emitSelection();
        this.commit();
        this.requestRender();
    }
    bringToFront() {
        this.reorder((selected, rest) => [...rest, ...selected]);
    }
    sendToBack() {
        this.reorder((selected, rest) => [...selected, ...rest]);
    }
    // ================================================================ flip / lock
    flipSelection(axis) {
        const selected = this.selectedNodes();
        if (selected.length === 0)
            return;
        const center = bboxCenter(unionBBox(selected.map(getAABB)));
        for (const n of selected)
            flipNode(n, axis, center);
        this.commit();
        this.requestRender();
    }
    lockSelection() {
        const selected = this.selectedNodes();
        if (selected.length === 0)
            return;
        for (const n of selected)
            n.locked = true;
        this.selection.clear();
        this.emitSelection();
        this.commit();
        this.requestRender();
    }
    unlockAll() {
        let changed = false;
        for (const n of this.nodes) {
            if (n.locked) {
                n.locked = false;
                changed = true;
            }
        }
        if (!changed)
            return;
        this.commit();
        this.requestRender();
    }
    hasLockedNodes() {
        return this.nodes.some((n) => n.locked);
    }
    // ================================================================ text
    /** Add a text node programmatically. */
    addText(text, at, fontSize) {
        const fs = fontSize ?? this.fontSize;
        const m = measureText(text, fs, this.fontFamily);
        const pos = at ?? this.viewCenterWorld();
        const node = {
            id: genId(),
            type: 'text',
            x: pos.x,
            y: pos.y,
            text,
            fontSize: fs,
            fontFamily: this.fontFamily,
            w: m.w,
            h: m.h,
            style: { ...this.style, fill: 'transparent' },
        };
        this.nodes.push(node);
        this.commit();
        this.requestRender();
        return node;
    }
    /** Begin inline editing for a text node (creates a floating textarea). */
    startTextEdit(node) {
        this.finishTextEdit();
        const el = document.createElement('textarea');
        const screen = this.worldToScreen({ x: node.x, y: node.y });
        const s = this.viewport.scale;
        Object.assign(el.style, {
            position: 'absolute',
            left: `${screen.x - 2}px`,
            top: `${screen.y - 2}px`,
            fontSize: `${node.fontSize * s}px`,
            lineHeight: String(LINE_HEIGHT),
            fontFamily: node.fontFamily,
            color: node.style.stroke === 'transparent' ? '#000' : node.style.stroke,
            background: 'transparent',
            border: `1px dashed ${SELECTION_COLOR}`,
            borderRadius: '3px',
            padding: '1px',
            margin: '0',
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            whiteSpace: 'pre',
            minWidth: '24px',
            zIndex: '10',
        });
        el.value = node.text;
        const autosize = () => {
            el.style.width = '0';
            el.style.height = '0';
            el.style.width = `${el.scrollWidth + node.fontSize * s}px`;
            el.style.height = `${el.scrollHeight}px`;
        };
        el.addEventListener('input', autosize);
        el.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                this.finishTextEdit();
            }
        });
        el.addEventListener('blur', () => this.finishTextEdit());
        el.addEventListener('pointerdown', (e) => e.stopPropagation());
        this.container.appendChild(el);
        this.editing = { node, el };
        requestAnimationFrame(() => {
            autosize();
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
        });
        this.emitter.emit('textedit', node.id);
        this.requestRender();
    }
    finishTextEdit() {
        if (!this.editing)
            return;
        const { node, el } = this.editing;
        this.editing = null;
        const text = el.value.replace(/\s+$/g, '');
        el.remove();
        if (text.trim() === '') {
            this.nodes = this.nodes.filter((n) => n.id !== node.id);
            this.selection.delete(node.id);
            this.emitSelection();
        }
        else {
            node.text = text;
            const m = measureText(text, node.fontSize, node.fontFamily);
            node.w = m.w;
            node.h = m.h;
        }
        this.commit();
        this.emitter.emit('textedit', null);
        this.requestRender();
    }
    // ================================================================ images
    /** Add an image from a URL or dataURL at the viewport center. */
    addImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.images.set(src, img);
                const maxSide = 480;
                const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
                const w = img.naturalWidth * ratio;
                const h = img.naturalHeight * ratio;
                const center = this.viewCenterWorld();
                const node = {
                    id: genId(),
                    type: 'image',
                    x: center.x - w / 2,
                    y: center.y - h / 2,
                    w,
                    h,
                    src,
                    style: { ...DEFAULT_STYLE, stroke: 'transparent' },
                };
                this.nodes.push(node);
                this.setTool('select');
                this.selection = new Set([node.id]);
                this.emitSelection();
                this.commit();
                this.requestRender();
                resolve(node);
            };
            img.onerror = () => reject(new Error('dohwa: failed to load image'));
            img.src = src;
        });
    }
    /** Add an image from a File (e.g. <input type=file> or drag & drop). */
    addImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                this.addImage(reader.result).then(resolve, reject);
            };
            reader.onerror = () => reject(new Error('dohwa: failed to read file'));
            reader.readAsDataURL(file);
        });
    }
    // ================================================================ history / replay
    undo() {
        this.finishTextEdit();
        const snapshot = this.history.undo();
        if (snapshot !== null)
            this.restore(snapshot);
    }
    redo() {
        const snapshot = this.history.redo();
        if (snapshot !== null)
            this.restore(snapshot);
    }
    getHistoryState() {
        return { canUndo: this.history.canUndo, canRedo: this.history.canRedo };
    }
    /** Append-only chronology of every committed state (true drawing order). */
    getTimeline() {
        return [...this.timeline];
    }
    /** id of the text node currently being edited inline, or null. */
    getEditingTextId() {
        return this.editing?.node.id ?? null;
    }
    isReplaying() {
        return this.replaying;
    }
    /** Replay the drawing chronology from the first stroke to now. */
    async replay(options = {}) {
        if (this.replaying || this.timeline.length < 2)
            return;
        this.finishTextEdit();
        this.replaying = true;
        this.emitter.emit('replay', true);
        const saved = this.serialize();
        const delay = 1000 / (options.fps ?? 5);
        for (const snap of this.timeline) {
            if (this.disposed)
                return;
            this.nodes = JSON.parse(snap).nodes;
            this.preloadImages(this.nodes);
            this.render();
            await new Promise((r) => setTimeout(r, delay));
        }
        this.nodes = JSON.parse(saved).nodes;
        this.replaying = false;
        this.emitter.emit('replay', false);
        this.requestRender();
    }
    clear() {
        if (this.nodes.length === 0)
            return;
        this.finishTextEdit();
        this.nodes = [];
        this.selection.clear();
        this.emitSelection();
        this.commit();
        this.requestRender();
    }
    // ================================================================ viewport
    getViewport() {
        return { ...this.viewport };
    }
    setZoom(scale, screenAnchor) {
        const anchor = screenAnchor ?? {
            x: this.canvas.clientWidth / 2,
            y: this.canvas.clientHeight / 2,
        };
        const before = this.screenToWorld(anchor);
        this.viewport.scale = Math.min(this.maxZoom, Math.max(this.minZoom, scale));
        const after = this.screenToWorld(anchor);
        this.viewport.x += (after.x - before.x) * this.viewport.scale;
        this.viewport.y += (after.y - before.y) * this.viewport.scale;
        this.emitter.emit('viewport', this.getViewport());
        this.requestRender();
    }
    zoomIn() {
        this.setZoom(this.viewport.scale * 1.2);
    }
    zoomOut() {
        this.setZoom(this.viewport.scale / 1.2);
    }
    resetView() {
        this.viewport = { x: 0, y: 0, scale: 1 };
        this.emitter.emit('viewport', this.getViewport());
        this.requestRender();
    }
    /** Fit all content into the view with padding. */
    zoomToFit(padding = 48) {
        if (this.nodes.length === 0) {
            this.resetView();
            return;
        }
        const box = unionBBox(this.nodes.map(getAABB));
        const cw = this.canvas.clientWidth;
        const ch = this.canvas.clientHeight;
        const scale = Math.min(this.maxZoom, Math.max(this.minZoom, Math.min((cw - padding * 2) / Math.max(box.w, 1), (ch - padding * 2) / Math.max(box.h, 1))));
        this.viewport = {
            scale,
            x: cw / 2 - (box.x + box.w / 2) * scale,
            y: ch / 2 - (box.y + box.h / 2) * scale,
        };
        this.emitter.emit('viewport', this.getViewport());
        this.requestRender();
    }
    // ================================================================ io
    toJSON() {
        return { app: 'dohwa', version: 1, nodes: deepClone(this.nodes) };
    }
    loadJSON(json) {
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        if (!data || !Array.isArray(data.nodes))
            throw new Error('dohwa: invalid scene JSON');
        this.finishTextEdit();
        this.nodes = deepClone(data.nodes);
        this.selection.clear();
        this.preloadImages(this.nodes);
        const snap = this.serialize();
        this.history.reset(snap);
        this.timeline = [snap];
        this.emitSelection();
        this.emitChange();
        this.requestRender();
    }
    /** Render content to a PNG dataURL. */
    exportPNG(options = {}) {
        const scale = options.scale ?? 2;
        const padding = options.padding ?? 24;
        const box = this.nodes.length > 0
            ? unionBBox(this.nodes.map(getAABB))
            : { x: 0, y: 0, w: this.canvas.clientWidth, h: this.canvas.clientHeight };
        const w = Math.max(1, Math.ceil((box.w + padding * 2) * scale));
        const h = Math.max(1, Math.ceil((box.h + padding * 2) * scale));
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const ctx = off.getContext('2d');
        if (!ctx)
            throw new Error('dohwa: 2d context unavailable');
        if (options.background) {
            ctx.fillStyle = options.background;
            ctx.fillRect(0, 0, w, h);
        }
        ctx.scale(scale, scale);
        ctx.translate(padding - box.x, padding - box.y);
        renderScene(ctx, this.nodes, this.images);
        return off.toDataURL('image/png');
    }
    /** Export the scene as a standalone SVG string. */
    exportSVG(options = {}) {
        return sceneToSVG(this.nodes, options);
    }
    destroy() {
        this.disposed = true;
        this.finishTextEdit();
        cancelAnimationFrame(this.rafId);
        this.resizeObserver.disconnect();
        this.detachFns.forEach((fn) => fn());
        this.emitter.clear();
        this.canvas.remove();
    }
    // ================================================================ internals
    viewCenterWorld() {
        return this.screenToWorld({
            x: this.canvas.clientWidth / 2,
            y: this.canvas.clientHeight / 2,
        });
    }
    selectedNodes() {
        return this.nodes.filter((n) => this.selection.has(n.id));
    }
    reorder(fn) {
        if (this.selection.size === 0)
            return;
        const selected = this.selectedNodes();
        const rest = this.nodes.filter((n) => !this.selection.has(n.id));
        this.nodes = fn(selected, rest);
        this.commit();
        this.requestRender();
    }
    reassignIds(node) {
        node.id = genId();
        if (node.type === 'group')
            node.children.forEach((c) => this.reassignIds(c));
    }
    preloadImages(nodes) {
        for (const node of nodes) {
            if (node.type === 'image' && !this.images.has(node.src)) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => this.requestRender();
                img.src = node.src;
                this.images.set(node.src, img);
            }
            else if (node.type === 'group') {
                this.preloadImages(node.children);
            }
        }
    }
    remeasureTexts(nodes) {
        for (const node of nodes) {
            if (node.type === 'text') {
                const m = measureText(node.text, node.fontSize, node.fontFamily);
                node.w = m.w;
                node.h = m.h;
            }
            else if (node.type === 'group') {
                this.remeasureTexts(node.children);
            }
        }
    }
    serialize() {
        return JSON.stringify({ app: 'dohwa', version: 1, nodes: this.nodes });
    }
    restore(snapshot) {
        const data = JSON.parse(snapshot);
        this.nodes = data.nodes;
        this.invalidateIndex();
        this.selection = new Set([...this.selection].filter((id) => this.nodes.some((n) => n.id === id)));
        this.preloadImages(this.nodes);
        this.emitSelection();
        this.emitChange();
        this.requestRender();
    }
    /** Record the current state into history + timeline and notify listeners. */
    commit() {
        this.remeasureTexts(this.nodes);
        this.invalidateIndex();
        const snap = this.serialize();
        this.history.push(snap);
        if (this.timeline[this.timeline.length - 1] !== snap) {
            this.timeline.push(snap);
            if (this.timeline.length > 600)
                this.timeline.shift();
        }
        this.emitChange();
    }
    emitChange() {
        this.emitter.emit('change');
        this.emitter.emit('history', this.getHistoryState());
    }
    emitSelection() {
        this.emitter.emit('selection', this.getSelectedIds());
    }
    // ---------------------------------------------------------------- coords
    screenToWorld(p) {
        return {
            x: (p.x - this.viewport.x) / this.viewport.scale,
            y: (p.y - this.viewport.y) / this.viewport.scale,
        };
    }
    worldToScreen(p) {
        return {
            x: p.x * this.viewport.scale + this.viewport.x,
            y: p.y * this.viewport.scale + this.viewport.y,
        };
    }
    pointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.x, y: e.clientY - rect.y };
    }
    // ---------------------------------------------------------------- canvas / loop
    syncCanvasSize() {
        const dpr = window.devicePixelRatio || 1;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        if (w === 0 || h === 0)
            return;
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        this.requestRender();
    }
    requestRender() {
        if (this.rafId || this.disposed)
            return;
        this.rafId = requestAnimationFrame(() => {
            this.rafId = 0;
            this.render();
        });
    }
    render() {
        const dpr = window.devicePixelRatio || 1;
        const ctx = this.ctx;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
        if (this.background !== 'transparent') {
            ctx.fillStyle = this.background;
            ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
        }
        ctx.save();
        ctx.translate(this.viewport.x, this.viewport.y);
        ctx.scale(this.viewport.scale, this.viewport.scale);
        const visible = this.visibleNodes();
        renderScene(ctx, visible, this.images, { skipId: this.editing?.node.id ?? null });
        ctx.restore();
        if (!this.replaying)
            this.renderOverlay(ctx);
    }
    /**
     * Viewport culling: only nodes whose world AABB overlaps the visible region.
     * On an infinite canvas most content is usually off-screen, so this bounds
     * per-frame cost by what's actually in view rather than the scene size.
     * Below a threshold the cull isn't worth the AABB math, so we skip it.
     */
    visibleNodes() {
        if (this.nodes.length < 200)
            return this.nodes;
        // During an active drag the index is intentionally stale; rebuilding it
        // every frame would cost more than culling saves, so draw everything.
        if (this.mode.kind === 'move' || this.mode.kind === 'resize' || this.mode.kind === 'rotate') {
            return this.nodes;
        }
        const inv = 1 / this.viewport.scale;
        const margin = 32 * inv;
        const view = {
            x: -this.viewport.x * inv - margin,
            y: -this.viewport.y * inv - margin,
            w: this.canvas.clientWidth * inv + margin * 2,
            h: this.canvas.clientHeight * inv + margin * 2,
        };
        const ids = this.ensureIndex().queryBox(view);
        // preserve z-order by filtering the original array
        return this.nodes.filter((n) => ids.has(n.id));
    }
    // ---------------------------------------------------------------- selection frame
    /** Selection frame: single node → its rotated local box; multi → union AABB. */
    selectionFrame() {
        const selected = this.selectedNodes();
        if (selected.length === 0)
            return null;
        if (selected.length === 1) {
            const box = getBBox(selected[0]);
            return { box, rotation: selected[0].rotation ?? 0, center: bboxCenter(box) };
        }
        const box = unionBBox(selected.map(getAABB));
        return { box, rotation: 0, center: bboxCenter(box) };
    }
    /** Screen-space positions of the 8 resize handles + rotation handle. */
    framePoints(frame) {
        const pad = 4 / this.viewport.scale;
        const b = {
            x: frame.box.x - pad,
            y: frame.box.y - pad,
            w: frame.box.w + pad * 2,
            h: frame.box.h + pad * 2,
        };
        const local = (hx, hy) => ({ x: b.x + b.w * hx, y: b.y + b.h * hy });
        const toScreen = (p) => this.worldToScreen(rotatePoint(p, frame.center, frame.rotation));
        const handles = HANDLES.map((h) => toScreen(local(h.hx, h.hy)));
        const rotate = toScreen({ x: b.x + b.w / 2, y: b.y - ROTATE_OFFSET / this.viewport.scale });
        const corners = [local(0, 0), local(1, 0), local(1, 1), local(0, 1)].map(toScreen);
        return { handles, rotate, corners };
    }
    renderOverlay(ctx) {
        const frame = this.selectionFrame();
        if (frame) {
            const { handles, rotate, corners } = this.framePoints(frame);
            ctx.save();
            ctx.strokeStyle = SELECTION_COLOR;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < 4; i++)
                ctx.lineTo(corners[i].x, corners[i].y);
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
            if (this.tool === 'select') {
                for (const h of handles) {
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.rect(h.x - 4, h.y - 4, 8, 8);
                    ctx.fill();
                    ctx.stroke();
                }
                // rotation handle
                const topMid = { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 };
                ctx.beginPath();
                ctx.moveTo(topMid.x, topMid.y);
                ctx.lineTo(rotate.x, rotate.y);
                ctx.stroke();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(rotate.x, rotate.y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        }
        if (this.mode.kind === 'marquee') {
            const a = this.worldToScreen(this.mode.start);
            const b = this.worldToScreen(this.mode.current);
            const x = Math.min(a.x, b.x);
            const y = Math.min(a.y, b.y);
            const w = Math.abs(b.x - a.x);
            const h = Math.abs(b.y - a.y);
            ctx.save();
            ctx.fillStyle = 'rgba(68, 103, 255, 0.08)';
            ctx.strokeStyle = SELECTION_COLOR;
            ctx.lineWidth = 1;
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
            ctx.restore();
        }
    }
    // ---------------------------------------------------------------- interaction
    bindEvents() {
        const c = this.canvas;
        const onDown = (e) => this.onPointerDown(e);
        const onMove = (e) => this.onPointerMove(e);
        const onUp = (e) => this.onPointerUp(e);
        const onDbl = (e) => this.onDoubleClick(e);
        const onWheel = (e) => this.onWheel(e);
        const onKeyDown = (e) => this.onKeyDown(e);
        const onKeyUp = (e) => this.onKeyUp(e);
        const onDragOver = (e) => e.preventDefault();
        const onDrop = (e) => {
            e.preventDefault();
            const file = e.dataTransfer?.files?.[0];
            if (file && file.type.startsWith('image/'))
                void this.addImageFromFile(file);
        };
        c.addEventListener('pointerdown', onDown);
        c.addEventListener('pointermove', onMove);
        c.addEventListener('pointerup', onUp);
        c.addEventListener('pointercancel', onUp);
        c.addEventListener('dblclick', onDbl);
        c.addEventListener('wheel', onWheel, { passive: false });
        c.addEventListener('dragover', onDragOver);
        c.addEventListener('drop', onDrop);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        this.detachFns.push(() => {
            c.removeEventListener('pointerdown', onDown);
            c.removeEventListener('pointermove', onMove);
            c.removeEventListener('pointerup', onUp);
            c.removeEventListener('pointercancel', onUp);
            c.removeEventListener('dblclick', onDbl);
            c.removeEventListener('wheel', onWheel);
            c.removeEventListener('dragover', onDragOver);
            c.removeEventListener('drop', onDrop);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        });
        this.updateCursor();
    }
    hitTolerance() {
        return 4 / this.viewport.scale;
    }
    /** Mark the spatial index stale — rebuilt lazily on the next query. */
    invalidateIndex() {
        this.spatialDirty = true;
    }
    /** Rebuild the index from current node AABBs if it's stale. */
    ensureIndex() {
        if (this.spatialDirty || !this.spatialIndex) {
            this.idToIndex = new Map(this.nodes.map((n, i) => [n.id, i]));
            this.spatialIndex = Quadtree.build(this.nodes.map((n) => ({ id: n.id, box: getAABB(n) })));
            this.spatialDirty = false;
        }
        return this.spatialIndex;
    }
    /**
     * Broad-phase: ids whose AABB is near a point. For small scenes the index
     * overhead isn't worth it, so we only consult it past a threshold and fall
     * back to the full list otherwise. Either way the caller does the precise
     * (transform-aware) hitTestNode on the returned candidates.
     */
    candidatesAtPoint(world) {
        if (this.nodes.length < 64)
            return null; // full scan is fine
        return this.ensureIndex().queryPoint(world.x, world.y, this.hitTolerance());
    }
    hitTopmost(world) {
        const candidates = this.candidatesAtPoint(world);
        if (candidates) {
            // Walk only candidates, topmost-first by z-order — no full-array scan.
            const idxs = [];
            for (const id of candidates) {
                const i = this.idToIndex.get(id);
                if (i !== undefined && !this.nodes[i].locked)
                    idxs.push(i);
            }
            idxs.sort((a, b) => b - a);
            for (const i of idxs) {
                if (hitTestNode(this.nodes[i], world, this.hitTolerance()))
                    return this.nodes[i];
            }
            return null;
        }
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            if (node.locked)
                continue;
            if (hitTestNode(node, world, this.hitTolerance()))
                return node;
        }
        return null;
    }
    /** Which handle (if any) is under a screen point. */
    handleAt(screen) {
        if (this.tool !== 'select')
            return null;
        const frame = this.selectionFrame();
        if (!frame)
            return null;
        const { handles, rotate } = this.framePoints(frame);
        if (Math.hypot(screen.x - rotate.x, screen.y - rotate.y) <= 8)
            return { kind: 'rotate' };
        for (let i = 0; i < handles.length; i++) {
            if (Math.abs(screen.x - handles[i].x) <= 6 && Math.abs(screen.y - handles[i].y) <= 6) {
                return { kind: 'resize', index: i };
            }
        }
        return null;
    }
    cloneSelection() {
        const map = new Map();
        for (const n of this.selectedNodes())
            map.set(n.id, deepClone(n));
        return map;
    }
    onPointerDown(e) {
        if (this.replaying)
            return;
        if (e.button !== 0 && e.button !== 1)
            return;
        this.finishTextEdit();
        this.canvas.setPointerCapture(e.pointerId);
        const screen = this.pointerPos(e);
        const world = this.screenToWorld(screen);
        // pan: middle button / space / pan tool
        if (e.button === 1 || this.spaceDown || this.tool === 'pan') {
            this.mode = { kind: 'pan', lastScreen: screen };
            this.canvas.style.cursor = 'grabbing';
            return;
        }
        switch (this.tool) {
            case 'select': {
                const handle = this.handleAt(screen);
                if (handle) {
                    const frame = this.selectionFrame();
                    if (!frame)
                        return;
                    if (handle.kind === 'rotate') {
                        this.mode = {
                            kind: 'rotate',
                            center: frame.center,
                            startAngle: Math.atan2(world.y - frame.center.y, world.x - frame.center.x),
                            originals: this.cloneSelection(),
                        };
                    }
                    else {
                        this.mode = {
                            kind: 'resize',
                            handle: handle.index,
                            from: frame.box,
                            rotation: frame.rotation,
                            center: frame.center,
                            originals: this.cloneSelection(),
                        };
                    }
                    return;
                }
                const hit = this.hitTopmost(world);
                if (hit) {
                    if (e.shiftKey) {
                        if (this.selection.has(hit.id))
                            this.selection.delete(hit.id);
                        else
                            this.selection.add(hit.id);
                        this.emitSelection();
                        this.requestRender();
                        this.mode = { kind: 'none' };
                        return;
                    }
                    if (!this.selection.has(hit.id)) {
                        this.selection = new Set([hit.id]);
                        this.emitSelection();
                    }
                    this.mode = { kind: 'move', last: world, moved: false };
                }
                else {
                    const base = e.shiftKey ? [...this.selection] : [];
                    if (!e.shiftKey && this.selection.size > 0) {
                        this.selection.clear();
                        this.emitSelection();
                    }
                    this.mode = { kind: 'marquee', start: world, current: world, base };
                }
                this.requestRender();
                break;
            }
            case 'pen': {
                const node = {
                    id: genId(),
                    type: 'path',
                    points: [world],
                    style: { ...this.style, fill: 'transparent' },
                };
                this.nodes.push(node);
                this.mode = { kind: 'draw', node, start: world };
                this.requestRender();
                break;
            }
            case 'rect':
            case 'ellipse':
            case 'diamond':
            case 'triangle': {
                const node = {
                    id: genId(),
                    type: this.tool,
                    x: world.x,
                    y: world.y,
                    w: 0,
                    h: 0,
                    style: { ...this.style },
                };
                this.nodes.push(node);
                this.mode = { kind: 'draw', node, start: world };
                break;
            }
            case 'line':
            case 'arrow': {
                const node = {
                    id: genId(),
                    type: 'line',
                    x1: world.x,
                    y1: world.y,
                    x2: world.x,
                    y2: world.y,
                    arrow: this.tool === 'arrow',
                    style: { ...this.style },
                };
                this.nodes.push(node);
                this.mode = { kind: 'draw', node, start: world };
                break;
            }
            case 'text': {
                const node = {
                    id: genId(),
                    type: 'text',
                    x: world.x,
                    y: world.y,
                    text: '',
                    fontSize: this.fontSize,
                    fontFamily: this.fontFamily,
                    w: this.fontSize,
                    h: this.fontSize * LINE_HEIGHT,
                    style: { ...this.style, fill: 'transparent' },
                };
                this.nodes.push(node);
                this.mode = { kind: 'none' };
                this.startTextEdit(node);
                break;
            }
            case 'eraser': {
                this.mode = { kind: 'erase', erased: false };
                this.eraseAt(world);
                break;
            }
        }
    }
    eraseAt(world) {
        const hit = this.hitTopmost(world);
        if (hit && this.mode.kind === 'erase') {
            this.nodes = this.nodes.filter((n) => n.id !== hit.id);
            this.selection.delete(hit.id);
            this.mode.erased = true;
            this.requestRender();
        }
    }
    onPointerMove(e) {
        if (this.replaying)
            return;
        const screen = this.pointerPos(e);
        const world = this.screenToWorld(screen);
        const mode = this.mode;
        switch (mode.kind) {
            case 'none': {
                if (this.tool === 'select') {
                    const handle = this.handleAt(screen);
                    if (handle?.kind === 'rotate')
                        this.canvas.style.cursor = 'grab';
                    else if (handle?.kind === 'resize')
                        this.canvas.style.cursor = HANDLES[handle.index].cursor;
                    else
                        this.canvas.style.cursor = this.hitTopmost(world) ? 'move' : 'default';
                }
                return;
            }
            case 'pan': {
                this.viewport.x += screen.x - mode.lastScreen.x;
                this.viewport.y += screen.y - mode.lastScreen.y;
                mode.lastScreen = screen;
                this.emitter.emit('viewport', this.getViewport());
                this.requestRender();
                return;
            }
            case 'draw': {
                const node = mode.node;
                if (node.type === 'path') {
                    const last = node.points[node.points.length - 1];
                    const distScreen = Math.hypot(world.x - last.x, world.y - last.y) * this.viewport.scale;
                    if (distScreen >= 1.5)
                        node.points.push(world);
                }
                else if (node.type === 'rect' ||
                    node.type === 'ellipse' ||
                    node.type === 'diamond' ||
                    node.type === 'triangle') {
                    let x0 = mode.start.x, y0 = mode.start.y, x1 = world.x, y1 = world.y;
                    if (e.shiftKey) {
                        const side = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
                        x1 = x0 + Math.sign(x1 - x0 || 1) * side;
                        y1 = y0 + Math.sign(y1 - y0 || 1) * side;
                    }
                    node.x = Math.min(x0, x1);
                    node.y = Math.min(y0, y1);
                    node.w = Math.abs(x1 - x0);
                    node.h = Math.abs(y1 - y0);
                }
                else if (node.type === 'line') {
                    node.x2 = world.x;
                    node.y2 = world.y;
                    if (e.shiftKey) {
                        const dx = node.x2 - node.x1;
                        const dy = node.y2 - node.y1;
                        const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
                        const len = Math.hypot(dx, dy);
                        node.x2 = node.x1 + Math.cos(angle) * len;
                        node.y2 = node.y1 + Math.sin(angle) * len;
                    }
                }
                this.requestRender();
                return;
            }
            case 'move': {
                const dx = world.x - mode.last.x;
                const dy = world.y - mode.last.y;
                if (dx !== 0 || dy !== 0) {
                    for (const n of this.selectedNodes())
                        translateNode(n, dx, dy);
                    mode.last = world;
                    mode.moved = true;
                    this.invalidateIndex();
                    this.requestRender();
                }
                return;
            }
            case 'resize': {
                const h = HANDLES[mode.handle];
                const from = mode.from;
                // map the pointer into the frame's local (unrotated) space
                const local = mode.rotation === 0 ? world : rotatePoint(world, mode.center, -mode.rotation);
                let { x, y, w, h: hh } = from;
                if (h.hx === 0) {
                    const right = from.x + from.w;
                    x = Math.min(local.x, right - 1);
                    w = right - x;
                }
                else if (h.hx === 1) {
                    w = Math.max(1, local.x - from.x);
                }
                if (h.hy === 0) {
                    const bottom = from.y + from.h;
                    y = Math.min(local.y, bottom - 1);
                    hh = bottom - y;
                }
                else if (h.hy === 1) {
                    hh = Math.max(1, local.y - from.y);
                }
                if (e.shiftKey && h.hx !== 0.5 && h.hy !== 0.5 && from.w > 0 && from.h > 0) {
                    const ratio = from.w / from.h;
                    if (w / Math.max(hh, 1) > ratio)
                        w = hh * ratio;
                    else
                        hh = w / ratio;
                    if (h.hx === 0)
                        x = from.x + from.w - w;
                    if (h.hy === 0)
                        y = from.y + from.h - hh;
                }
                const to = { x, y, w, h: hh };
                for (const n of this.selectedNodes()) {
                    const original = mode.originals.get(n.id);
                    if (!original)
                        continue;
                    const fresh = deepClone(original);
                    scaleNodeInto(fresh, from, to);
                    Object.assign(n, fresh);
                }
                this.requestRender();
                return;
            }
            case 'rotate': {
                const angle = Math.atan2(world.y - mode.center.y, world.x - mode.center.x);
                const delta = angle - mode.startAngle;
                for (const n of this.selectedNodes()) {
                    const original = mode.originals.get(n.id);
                    if (!original)
                        continue;
                    const fresh = deepClone(original);
                    let rot = (original.rotation ?? 0) + delta;
                    if (e.shiftKey)
                        rot = Math.round(rot / (Math.PI / 12)) * (Math.PI / 12);
                    const applied = rot - (original.rotation ?? 0);
                    fresh.rotation = rot;
                    // orbit the node's center around the shared pivot
                    const c0 = bboxCenter(getBBox(original));
                    const c1 = rotatePoint(c0, mode.center, applied);
                    translateNode(fresh, c1.x - c0.x, c1.y - c0.y);
                    Object.assign(n, fresh);
                }
                this.requestRender();
                return;
            }
            case 'marquee': {
                mode.current = world;
                const rect = {
                    x: Math.min(mode.start.x, world.x),
                    y: Math.min(mode.start.y, world.y),
                    w: Math.abs(world.x - mode.start.x),
                    h: Math.abs(world.y - mode.start.y),
                };
                const candidates = this.nodes.length >= 64 ? this.ensureIndex().queryBox(rect) : null;
                const inside = this.nodes
                    .filter((n) => !n.locked &&
                    (!candidates || candidates.has(n.id)) &&
                    bboxIntersects(getAABB(n), rect))
                    .map((n) => n.id);
                this.selection = new Set([...mode.base, ...inside]);
                this.emitSelection();
                this.requestRender();
                return;
            }
            case 'erase':
                this.eraseAt(world);
                return;
        }
    }
    onPointerUp(e) {
        if (this.canvas.hasPointerCapture(e.pointerId)) {
            this.canvas.releasePointerCapture(e.pointerId);
        }
        const mode = this.mode;
        this.mode = { kind: 'none' };
        switch (mode.kind) {
            case 'draw': {
                const node = mode.node;
                const box = getBBox(node);
                const tooSmall = node.type !== 'path' && box.w < 2 && box.h < 2;
                if (tooSmall) {
                    this.nodes = this.nodes.filter((n) => n.id !== node.id);
                    this.requestRender();
                }
                else {
                    this.commit();
                }
                break;
            }
            case 'move':
                if (mode.moved)
                    this.commit();
                break;
            case 'resize':
            case 'rotate':
                this.commit();
                break;
            case 'erase':
                if (mode.erased)
                    this.commit();
                break;
            case 'pan':
                this.updateCursor();
                break;
            case 'marquee':
                this.requestRender();
                break;
            case 'none':
                break;
        }
    }
    onDoubleClick(e) {
        if (this.replaying || this.tool !== 'select')
            return;
        const rect = this.canvas.getBoundingClientRect();
        const world = this.screenToWorld({ x: e.clientX - rect.x, y: e.clientY - rect.y });
        const hit = this.hitTopmost(world);
        if (hit && hit.type === 'text') {
            this.selection = new Set([hit.id]);
            this.emitSelection();
            this.startTextEdit(hit);
        }
    }
    onWheel(e) {
        if (this.replaying)
            return;
        e.preventDefault();
        this.finishTextEdit();
        const screen = this.pointerPos(e);
        if (e.ctrlKey || e.metaKey) {
            this.setZoom(this.viewport.scale * Math.exp(-e.deltaY * 0.01), screen);
        }
        else {
            this.setZoom(this.viewport.scale * Math.exp(-e.deltaY * 0.0015), screen);
        }
    }
    isEditableTarget(e) {
        const t = e.target;
        if (!t)
            return false;
        return (t.tagName === 'INPUT' ||
            t.tagName === 'TEXTAREA' ||
            t.tagName === 'SELECT' ||
            t.isContentEditable);
    }
    onKeyDown(e) {
        if (this.replaying || this.isEditableTarget(e))
            return;
        const mod = e.ctrlKey || e.metaKey;
        if (e.code === 'Space') {
            this.spaceDown = true;
            if (this.mode.kind === 'none')
                this.canvas.style.cursor = 'grab';
            e.preventDefault();
            return;
        }
        if (mod) {
            const key = e.key.toLowerCase();
            switch (key) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey)
                        this.redo();
                    else
                        this.undo();
                    return;
                case 'y':
                    e.preventDefault();
                    this.redo();
                    return;
                case 'a':
                    e.preventDefault();
                    this.selectAll();
                    return;
                case 'g':
                    e.preventDefault();
                    if (e.shiftKey)
                        this.ungroup();
                    else
                        this.group();
                    return;
                case 'd':
                    e.preventDefault();
                    this.duplicateSelection();
                    return;
                case 'c':
                    this.copySelection();
                    return;
                case 'x':
                    this.cutSelection();
                    return;
                case 'v':
                    this.paste();
                    return;
            }
            return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            this.deleteSelection();
            return;
        }
        if (e.key === 'Escape') {
            this.clearSelection();
            return;
        }
        // arrow-key nudge
        if (e.key.startsWith('Arrow') && this.selection.size > 0) {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
            const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
            for (const n of this.selectedNodes())
                translateNode(n, dx, dy);
            this.commit();
            this.requestRender();
            return;
        }
        // tool shortcuts
        const map = {
            v: 'select',
            p: 'pen',
            r: 'rect',
            o: 'ellipse',
            d: 'diamond',
            l: 'line',
            a: 'arrow',
            t: 'text',
            e: 'eraser',
            h: 'pan',
        };
        const tool = map[e.key.toLowerCase()];
        if (tool)
            this.setTool(tool);
    }
    onKeyUp(e) {
        if (e.code === 'Space') {
            this.spaceDown = false;
            if (this.mode.kind === 'none')
                this.updateCursor();
        }
    }
    updateCursor() {
        const map = {
            select: 'default',
            pen: 'crosshair',
            rect: 'crosshair',
            ellipse: 'crosshair',
            diamond: 'crosshair',
            triangle: 'crosshair',
            line: 'crosshair',
            arrow: 'crosshair',
            text: 'text',
            eraser: 'crosshair',
            pan: 'grab',
        };
        this.canvas.style.cursor = map[this.tool];
    }
}
//# sourceMappingURL=dohwa.js.map