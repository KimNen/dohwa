/**
 * Pure node factories + scene validation. Import from 'dohwa/nodes'.
 * DOM-free: build and verify scenes on a server, in tests, or from LLM output.
 */
export { createId, rect, ellipse, diamond, triangle, line, arrow, path, text, image, group, scene, validateScene, } from './factory.js';
export type { BoxInit, ValidationResult } from './factory.js';
export { compose, composeAll, multiply, rotation, scaling, translation, skewing, IDENTITY, } from './geometry/matrix.js';
export type { Matrix, TransformParts } from './geometry/matrix.js';
//# sourceMappingURL=nodes.d.ts.map