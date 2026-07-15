import type { BBox, DohwaNode, Point } from './types.js';
import type { Matrix } from './matrix.js';
/**
 * The node's effective affine transform, expressed around the WORLD origin
 * but pivoting on the node's own (untransformed) bbox center — so a pure
 * rotation/scale spins the node in place.
 *
 * Precedence: explicit `transform` first, else legacy `rotation`, else identity.
 * This is the single bridge between the old rotation-field scenes and the
 * new matrix model; every geometry op routes through it.
 */
export declare function nodeMatrix(node: DohwaNode): Matrix;
/** True when the node has any non-identity transform. */
export declare function hasTransform(node: DohwaNode): boolean;
/** Map a world point into the node's local (untransformed) space. */
export declare function toLocalPoint(node: DohwaNode, p: Point): Point;
export declare function rotatePoint(p: Point, c: Point, angle: number): Point;
export declare function bboxCenter(b: BBox): Point;
export declare function bboxCorners(b: BBox): [Point, Point, Point, Point];
/**
 * The node's own local bounding box, IGNORING its transform.
 * For groups, this is the union of children's transformed AABBs (in the
 * group's local space), so a group box tightly wraps its contents.
 */
export declare function rawBBox(node: DohwaNode): BBox;
/**
 * Local bounding box. Kept as an alias of rawBBox for backward compatibility
 * (callers that predate the transform model). Prefer rawBBox for the untransformed
 * box and getAABB for the world-space, transform-aware box.
 */
export declare function getBBox(node: DohwaNode): BBox;
/** World-space axis-aligned bounding box, including the node's full transform. */
export declare function getAABB(node: DohwaNode): BBox;
export declare function unionBBox(boxes: BBox[]): BBox;
export declare function bboxIntersects(a: BBox, b: BBox): boolean;
export declare function pointInBBox(p: Point, b: BBox, pad?: number): boolean;
export declare function diamondPoints(b: BBox): Point[];
export declare function trianglePoints(b: BBox, flipY?: boolean): Point[];
/** Translate a node (and its children) in place. */
export declare function translateNode(node: DohwaNode, dx: number, dy: number): void;
/**
 * Rescale `node` so that geometry expressed relative to `from` maps into `to`.
 * `node` should hold the ORIGINAL (pre-resize) geometry; it is mutated in place.
 * Text scales its fontSize; the engine re-measures w/h afterwards.
 */
export declare function scaleNodeInto(node: DohwaNode, from: BBox, to: BBox): void;
/** Mirror a node across a vertical (axis='h') or horizontal (axis='v') line. */
export declare function flipNode(node: DohwaNode, axis: 'h' | 'v', center: Point): void;
export declare function distToSegment(p: Point, a: Point, b: Point): number;
/**
 * @param tolerance hit slop in world units (scale-aware value should be passed by caller)
 */
export declare function hitTestNode(node: DohwaNode, point: Point, tolerance: number): boolean;
//# sourceMappingURL=geometry.d.ts.map