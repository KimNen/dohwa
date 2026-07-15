import type { BBox } from './types.js';
/**
 * A quadtree over world-space AABBs. The engine currently scans every node
 * on each hit-test / marquee; that's fine for dozens of nodes and quadratic
 * for thousands. This index turns broad-phase queries into O(log n + k),
 * where k is the number of candidates actually overlapping the query.
 *
 * It stores ids + boxes only (not nodes), so it stays a pure, testable
 * structure the engine rebuilds or updates as the scene changes.
 */
export interface IndexedItem {
    id: string;
    box: BBox;
}
export declare class Quadtree {
    private bounds;
    private depth;
    private items;
    private nodes;
    constructor(bounds: BBox, depth?: number);
    clear(): void;
    insert(item: IndexedItem): void;
    /** All ids whose box intersects the query box. */
    queryBox(box: BBox, out?: Set<string>): Set<string>;
    /** All ids whose box contains the point (with optional padding). */
    queryPoint(x: number, y: number, pad?: number, out?: Set<string>): Set<string>;
    private split;
    /** Which child quadrant fully contains the box, or -1 if it straddles. */
    private quadrantFor;
    /** Build an index sized to fit all items (with a margin). */
    static build(items: IndexedItem[], margin?: number): Quadtree;
}
//# sourceMappingURL=spatial.d.ts.map