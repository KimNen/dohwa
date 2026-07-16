import type { DiamondNode, DohwaNode, EllipseNode, GroupNode, ImageNode, LineNode, PathNode, Point, RectNode, SceneJSON, Style, TextNode, TriangleNode } from './types.js';
import type { Matrix } from './geometry/matrix.js';
export declare function createId(prefix?: string): string;
export interface BoxInit {
    x: number;
    y: number;
    w: number;
    h: number;
    style?: Partial<Style>;
    /** affine transform [a,b,c,d,e,f] around the node's bbox center */
    transform?: Matrix;
    /** @deprecated legacy rotation (radians); prefer transform */
    rotation?: number;
    locked?: boolean;
}
export declare function rect(init: BoxInit & {
    rx?: number;
}): RectNode;
export declare function ellipse(init: BoxInit): EllipseNode;
export declare function diamond(init: BoxInit): DiamondNode;
export declare function triangle(init: BoxInit & {
    flipY?: boolean;
}): TriangleNode;
export declare function line(init: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    arrow?: boolean;
    arrowStart?: boolean;
    style?: Partial<Style>;
    rotation?: number;
    locked?: boolean;
}): LineNode;
export declare function arrow(init: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    /** arrowhead on both ends (양방향) */
    both?: boolean;
    style?: Partial<Style>;
    rotation?: number;
    locked?: boolean;
}): LineNode;
export declare function path(init: {
    points: Point[];
    style?: Partial<Style>;
    rotation?: number;
    locked?: boolean;
}): PathNode;
/**
 * Text w/h are measured by the engine on load; the estimates here keep
 * server-built scenes usable for bbox math before they hit a browser.
 */
export declare function text(init: {
    x: number;
    y: number;
    text: string;
    fontSize?: number;
    fontFamily?: string;
    style?: Partial<Style>;
    rotation?: number;
    locked?: boolean;
}): TextNode;
export declare function image(init: BoxInit & {
    src: string;
    flipX?: boolean;
    flipY?: boolean;
    /** visible source window, fractions 0..1 of the original image */
    crop?: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
}): ImageNode;
export declare function group(children: DohwaNode[], init?: {
    style?: Partial<Style>;
    rotation?: number;
    locked?: boolean;
}): GroupNode;
/** Wrap nodes into a valid scene object. */
export declare function scene(nodes: DohwaNode[]): SceneJSON;
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
/** Validate an untrusted scene (e.g. LLM output, user upload) before loading it. */
export declare function validateScene(input: unknown): ValidationResult;
//# sourceMappingURL=factory.d.ts.map