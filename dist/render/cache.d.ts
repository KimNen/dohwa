import type { DohwaNode } from '../types.js';
import { type ImageCache } from './render.js';
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
export declare function shouldCache(node: DohwaNode): boolean;
/**
 * A content hash that changes iff the node's *appearance* changes.
 * Deliberately excludes the node's transform and world position — those are
 * applied when blitting, so a moved/rotated node reuses the same bitmap.
 */
export declare function cacheKey(node: DohwaNode): string;
export declare class ObjectCache {
    private entries;
    private hits;
    private misses;
    /**
     * Draw `node` into `ctx`, using a cached bitmap when possible.
     * `ctx` must be in plain world space with NO node transform applied: the
     * bitmap is rendered over the node's world-space AABB (getAABB, which already
     * includes the transform), so it is blitted directly at its world origin.
     * Returns true if it handled drawing, false if the caller should renderNode directly.
     */
    draw(ctx: CanvasRenderingContext2D, node: DohwaNode, images: ImageCache, deviceScale: number): boolean;
    private render;
    invalidate(id: string): void;
    clear(): void;
    stats(): {
        hits: number;
        misses: number;
        size: number;
    };
}
//# sourceMappingURL=cache.d.ts.map