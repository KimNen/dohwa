import type { Point } from '../types.js';
/**
 * 2D affine transform, stored as [a, b, c, d, e, f] — the same 6-element
 * convention as CanvasRenderingContext2D.transform() and SVG matrix():
 *
 *   | a  c  e |     x' = a·x + c·y + e
 *   | b  d  f |     y' = b·x + d·y + f
 *   | 0  0  1 |
 *
 * This lets a node carry translate + rotate + scale + skew in one object,
 * compose parent/child transforms by multiplication, and invert to map a
 * world point back into a node's local space (for hit-testing).
 */
export type Matrix = [number, number, number, number, number, number];
export declare const IDENTITY: Matrix;
export declare function multiply(m1: Matrix, m2: Matrix): Matrix;
/**
 * Multiply a chain in array order: composeAll([A, B, C]) = A·B·C. Because
 * matrices act on points from the right, the LAST matrix is applied to a
 * point first — composeAll([A, B, C]) applied to p is A(B(C(p))), i.e. C,
 * then B, then A.
 */
export declare function composeAll(matrices: Matrix[]): Matrix;
export declare function translation(x: number, y: number): Matrix;
export declare function scaling(sx: number, sy?: number): Matrix;
export declare function rotation(angle: number): Matrix;
/** Skew given in radians. */
export declare function skewing(skewX: number, skewY: number): Matrix;
/**
 * Build a transform as translate · rotate · skew · scale, so that a point is
 * scaled first, then skewed, then rotated, then translated. Pivoting around a
 * node's bbox center is handled separately by nodeMatrix(), not here.
 */
export interface TransformParts {
    translateX?: number;
    translateY?: number;
    angle?: number;
    scaleX?: number;
    scaleY?: number;
    skewX?: number;
    skewY?: number;
}
export declare function compose(parts: TransformParts): Matrix;
export declare function applyToPoint(m: Matrix, p: Point): Point;
export declare function determinant(m: Matrix): number;
export declare function invert(m: Matrix): Matrix;
export declare function isIdentity(m: Matrix): boolean;
/**
 * Decompose a matrix back into human-meaningful parts. Useful for UI
 * (showing rotation in degrees) and for serialization sanity.
 */
export interface DecomposedTransform {
    translateX: number;
    translateY: number;
    angle: number;
    scaleX: number;
    scaleY: number;
    skewX: number;
}
export declare function decompose(m: Matrix): DecomposedTransform;
/** Format for CSS/Canvas: "matrix(a,b,c,d,e,f)". */
export declare function toCSS(m: Matrix): string;
/** Transform an axis-aligned box, returning the AABB of the 4 mapped corners. */
export declare function transformBBox(m: Matrix, box: {
    x: number;
    y: number;
    w: number;
    h: number;
}): {
    x: number;
    y: number;
    w: number;
    h: number;
};
//# sourceMappingURL=matrix.d.ts.map