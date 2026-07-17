import { ACTION_METAS } from './tools.js';
export class DohwaStore {
    constructor(app) {
        this.listeners = new Set();
        this.offs = [];
        /** For React: useSyncExternalStore(store.subscribe, store.getSnapshot) */
        this.subscribe = (fn) => {
            this.listeners.add(fn);
            return () => this.listeners.delete(fn);
        };
        this.getSnapshot = () => this.state;
        /** Whether an action is currently available (for disabling buttons). */
        this.canRun = (key) => {
            const meta = ACTION_METAS.find((a) => a.key === key);
            if (!meta)
                return false;
            const s = this.state;
            if (s.isReplaying)
                return false;
            if (key === 'crop')
                return s.canCrop;
            if (meta.minSelection)
                return s.selectionCount >= meta.minSelection;
            if (meta.needsMultiSelection)
                return s.selectionCount >= 2;
            if (meta.needsSelection)
                return s.selectionCount >= 1;
            if (key === 'undo')
                return s.canUndo;
            if (key === 'redo')
                return s.canRedo;
            if (key === 'replay')
                return s.canReplay;
            return true;
        };
        /** Run any toolbar action by key — one switch instead of 20 wired handlers. */
        this.run = (key) => {
            const app = this.app;
            switch (key) {
                case 'undo':
                    app.undo();
                    break;
                case 'redo':
                    app.redo();
                    break;
                case 'group':
                    app.group();
                    break;
                case 'ungroup':
                    app.ungroup();
                    break;
                case 'bringToFront':
                    app.bringToFront();
                    break;
                case 'sendToBack':
                    app.sendToBack();
                    break;
                case 'bringForward':
                    app.bringForward();
                    break;
                case 'sendBackward':
                    app.sendBackward();
                    break;
                case 'alignLeft':
                    app.alignSelection('left');
                    break;
                case 'alignHCenter':
                    app.alignSelection('hcenter');
                    break;
                case 'alignRight':
                    app.alignSelection('right');
                    break;
                case 'alignTop':
                    app.alignSelection('top');
                    break;
                case 'alignVCenter':
                    app.alignSelection('vcenter');
                    break;
                case 'alignBottom':
                    app.alignSelection('bottom');
                    break;
                case 'distributeH':
                    app.distributeSelection('horizontal');
                    break;
                case 'distributeV':
                    app.distributeSelection('vertical');
                    break;
                case 'flipH':
                    app.flipSelection('h');
                    break;
                case 'flipV':
                    app.flipSelection('v');
                    break;
                case 'crop':
                    app.startCrop();
                    break;
                case 'lock':
                    app.lockSelection();
                    break;
                case 'duplicate':
                    app.duplicateSelection();
                    break;
                case 'copy':
                    app.copySelection();
                    break;
                case 'cut':
                    app.cutSelection();
                    break;
                case 'paste':
                    app.paste();
                    break;
                case 'delete':
                    app.deleteSelection();
                    break;
                case 'selectAll':
                    app.selectAll();
                    break;
                case 'replay':
                    void app.replay();
                    break;
                case 'zoomIn':
                    app.zoomIn();
                    break;
                case 'zoomOut':
                    app.zoomOut();
                    break;
                case 'zoomToFit':
                    app.zoomToFit();
                    break;
                case 'clear':
                    app.clear();
                    break;
            }
        };
        this.app = app;
        this.state = this.read();
        const refresh = () => {
            const next = this.read();
            // shallow-compare so identical snapshots don't re-render
            if (!shallowEqual(next, this.state)) {
                this.state = next;
                this.listeners.forEach((fn) => fn());
            }
        };
        for (const event of [
            'tool',
            'selection',
            'history',
            'viewport',
            'change',
            'textedit',
            'crop',
            'replay',
        ]) {
            this.offs.push(app.on(event, refresh));
        }
    }
    destroy() {
        this.offs.forEach((off) => off());
        this.offs = [];
        this.listeners.clear();
    }
    read() {
        const app = this.app;
        const ids = app.getSelectedIds();
        const vp = app.getViewport();
        const history = app.getHistoryState();
        return {
            tool: app.getTool(),
            style: app.getStyle(),
            selectedIds: ids,
            selectionCount: ids.length,
            canUndo: history.canUndo,
            canRedo: history.canRedo,
            viewport: vp,
            zoomPercent: Math.round(vp.scale * 100),
            editingTextId: app.getEditingTextId(),
            isReplaying: app.isReplaying(),
            hasLockedNodes: app.hasLockedNodes(),
            canReplay: app.getTimeline().length >= 2,
            isCropping: app.isCropping(),
            canCrop: app.canCrop(),
        };
    }
}
function shallowEqual(a, b) {
    return (a.tool === b.tool &&
        a.selectionCount === b.selectionCount &&
        a.selectedIds.join(',') === b.selectedIds.join(',') &&
        a.canUndo === b.canUndo &&
        a.canRedo === b.canRedo &&
        a.zoomPercent === b.zoomPercent &&
        a.viewport.x === b.viewport.x &&
        a.viewport.y === b.viewport.y &&
        a.editingTextId === b.editingTextId &&
        a.isReplaying === b.isReplaying &&
        a.hasLockedNodes === b.hasLockedNodes &&
        a.canReplay === b.canReplay &&
        a.isCropping === b.isCropping &&
        a.canCrop === b.canCrop &&
        a.style.stroke === b.style.stroke &&
        a.style.fill === b.style.fill &&
        a.style.strokeWidth === b.style.strokeWidth &&
        a.style.opacity === b.style.opacity);
}
/** Convenience: create a store bound to an engine instance. */
export function createStore(app) {
    return new DohwaStore(app);
}
//# sourceMappingURL=store.js.map