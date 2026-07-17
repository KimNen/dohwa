import { getAABB } from '../geometry/geometry.js';
import { renderNode } from './render.js';
/**
 * Per-object bitmap caching, à la Fabric's objectCaching.
 *
 * Rendering a complex path or a deep group every frame is wasteful when the
 * node hasn't changed. We render it once to an offscreen canvas keyed by a
 * cheap content hash, then blit that bitmap with drawImage on subsequent
 * frames. When the node's content changes, the hash changes and we re-render.
 *
 * The cache-key logic is a pure function (testable without a DOM); the bitmap
 * store is a thin Map that only runs in the browser.
 */
/** Nodes cheap to draw directly aren't worth caching. */
export function shouldCache(node) {
    switch (node.type) {
        case 'path':
            return node.points.length > 24; // long freehand strokes
        case 'group':
            return countLeaves(node) > 6; // non-trivial groups
        default:
            return false;
    }
}
function countLeaves(node) {
    if (node.type !== 'group')
        return 1;
    return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
}
/**
 * A content hash that changes iff the node's *appearance* changes.
 * Deliberately excludes the node's transform and world position — those are
 * applied when blitting, so a moved/rotated node reuses the same bitmap.
 */
export function cacheKey(node) {
    const s = node.style;
    const base = `${s.stroke}|${s.fill}|${s.strokeWidth}|${s.opacity}`;
    switch (node.type) {
        case 'path': {
            // sample a few points + count; full point list would be costly and
            // is unnecessary — any edit changes count or a sampled coordinate.
            const p = node.points;
            const n = p.length;
            const sample = [0, n >> 2, n >> 1, (3 * n) >> 2, n - 1]
                .map((i) => p[i])
                .filter(Boolean)
                .map((pt) => `${Math.round(pt.x)},${Math.round(pt.y)}`)
                .join(';');
            return `path:${n}:${sample}:${base}`;
        }
        case 'group':
            return `group:${node.children.map(cacheKey).join('/')}:${base}`;
        case 'image': {
            const c = node.crop;
            const crop = c ? `${c.x},${c.y},${c.w},${c.h}` : '';
            return `image:${node.flipX ? 1 : 0}${node.flipY ? 1 : 0}:${crop}:${base}`;
        }
        default:
            return `${node.type}:${base}`;
    }
}
export class ObjectCache {
    constructor() {
        this.entries = new Map();
        this.hits = 0;
        this.misses = 0;
    }
    /**
     * Draw `node` into `ctx`, using a cached bitmap when possible.
     * `ctx` must be in plain world space with NO node transform applied: the
     * bitmap is rendered over the node's world-space AABB (getAABB, which already
     * includes the transform), so it is blitted directly at its world origin.
     * Returns true if it handled drawing, false if the caller should renderNode directly.
     */
    draw(ctx, node, images, deviceScale) {
        if (!shouldCache(node))
            return false;
        const key = cacheKey(node);
        let entry = this.entries.get(node.id);
        if (!entry || entry.key !== key || entry.scale !== deviceScale) {
            const fresh = this.render(node, images, deviceScale);
            if (!fresh)
                return false;
            entry = fresh;
            this.entries.set(node.id, entry);
            this.misses++;
        }
        else {
            this.hits++;
        }
        // Blit the cached bitmap at its world-space origin. The transform is
        // already baked into the bitmap (rendered over getAABB), so `ctx` stays in
        // plain world space here — no transform is re-applied.
        ctx.drawImage(entry.canvas, entry.originX, entry.originY, entry.w, entry.h);
        return true;
    }
    render(node, images, deviceScale) {
        if (typeof document === 'undefined')
            return null;
        const box = getAABB(node);
        const pad = node.style.strokeWidth + 2;
        const w = Math.ceil((box.w + pad * 2) * deviceScale);
        const h = Math.ceil((box.h + pad * 2) * deviceScale);
        if (w <= 0 || h <= 0 || w > 4096 || h > 4096)
            return null; // too big to cache
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const octx = canvas.getContext('2d');
        if (!octx)
            return null;
        octx.scale(deviceScale, deviceScale);
        octx.translate(-(box.x - pad), -(box.y - pad));
        renderNode(octx, node, images);
        return {
            key: cacheKey(node),
            canvas,
            scale: deviceScale,
            originX: box.x - pad,
            originY: box.y - pad,
            w: box.w + pad * 2,
            h: box.h + pad * 2,
        };
    }
    invalidate(id) {
        this.entries.delete(id);
    }
    clear() {
        this.entries.clear();
    }
    stats() {
        return { hits: this.hits, misses: this.misses, size: this.entries.size };
    }
}
//# sourceMappingURL=cache.js.map