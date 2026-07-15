import { bboxIntersects, pointInBBox } from './geometry.js';
const MAX_ITEMS = 8; // split threshold
const MAX_DEPTH = 8;
export class Quadtree {
    constructor(bounds, depth = 0) {
        this.items = [];
        this.nodes = null;
        this.bounds = bounds;
        this.depth = depth;
    }
    clear() {
        this.items = [];
        this.nodes = null;
    }
    insert(item) {
        if (this.nodes) {
            const i = this.quadrantFor(item.box);
            if (i !== -1) {
                this.nodes[i].insert(item);
                return;
            }
        }
        this.items.push(item);
        if (this.items.length > MAX_ITEMS && this.depth < MAX_DEPTH) {
            if (!this.nodes)
                this.split();
            // redistribute items that fit cleanly into a child quadrant
            const kept = [];
            for (const it of this.items) {
                const i = this.quadrantFor(it.box);
                if (i !== -1 && this.nodes)
                    this.nodes[i].insert(it);
                else
                    kept.push(it);
            }
            this.items = kept;
        }
    }
    /** All ids whose box intersects the query box. */
    queryBox(box, out = new Set()) {
        if (!bboxIntersects(this.bounds, box))
            return out;
        for (const it of this.items) {
            if (bboxIntersects(it.box, box))
                out.add(it.id);
        }
        if (this.nodes) {
            for (const child of this.nodes)
                child.queryBox(box, out);
        }
        return out;
    }
    /** All ids whose box contains the point (with optional padding). */
    queryPoint(x, y, pad = 0, out = new Set()) {
        const p = { x, y };
        if (!pointInBBox(p, this.bounds, pad))
            return out;
        for (const it of this.items) {
            if (pointInBBox(p, it.box, pad))
                out.add(it.id);
        }
        if (this.nodes) {
            for (const child of this.nodes)
                child.queryPoint(x, y, pad, out);
        }
        return out;
    }
    split() {
        const { x, y, w, h } = this.bounds;
        const hw = w / 2;
        const hh = h / 2;
        const d = this.depth + 1;
        this.nodes = [
            new Quadtree({ x, y, w: hw, h: hh }, d), // NW
            new Quadtree({ x: x + hw, y, w: hw, h: hh }, d), // NE
            new Quadtree({ x, y: y + hh, w: hw, h: hh }, d), // SW
            new Quadtree({ x: x + hw, y: y + hh, w: hw, h: hh }, d), // SE
        ];
    }
    /** Which child quadrant fully contains the box, or -1 if it straddles. */
    quadrantFor(box) {
        if (!this.nodes)
            return -1;
        for (let i = 0; i < 4; i++) {
            const b = this.nodes[i].bounds;
            if (box.x >= b.x && box.x + box.w <= b.x + b.w &&
                box.y >= b.y && box.y + box.h <= b.y + b.h) {
                return i;
            }
        }
        return -1;
    }
    /** Build an index sized to fit all items (with a margin). */
    static build(items, margin = 100) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const it of items) {
            minX = Math.min(minX, it.box.x);
            minY = Math.min(minY, it.box.y);
            maxX = Math.max(maxX, it.box.x + it.box.w);
            maxY = Math.max(maxY, it.box.y + it.box.h);
        }
        if (!Number.isFinite(minX)) {
            minX = 0;
            minY = 0;
            maxX = 1;
            maxY = 1;
        }
        const bounds = {
            x: minX - margin,
            y: minY - margin,
            w: maxX - minX + margin * 2,
            h: maxY - minY + margin * 2,
        };
        const tree = new Quadtree(bounds);
        for (const it of items)
            tree.insert(it);
        return tree;
    }
}
//# sourceMappingURL=spatial.js.map