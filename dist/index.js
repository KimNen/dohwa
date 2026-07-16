// ---------------------------------------------------------------- engine
export { Dohwa } from './core/dohwa.js';
// ---------------------------------------------------------------- pure geometry (DOM-free)
export { getBBox, rawBBox, getAABB, unionBBox, bboxCenter, bboxCorners, bboxIntersects, pointInBBox, translateNode, scaleNodeInto, flipNode, hitTestNode, rotatePoint, distToSegment, diamondPoints, trianglePoints, nodeMatrix, toLocalPoint, hasTransform, cropFullRect, cropFromRects, } from './geometry/geometry.js';
// ---------------------------------------------------------------- affine matrix (DOM-free)
export { IDENTITY, multiply, composeAll, compose, translation, scaling, rotation, skewing, applyToPoint, invert, determinant, isIdentity, decompose, toCSS, transformBBox, } from './geometry/matrix.js';
// ---------------------------------------------------------------- spatial index (DOM-free)
export { Quadtree } from './geometry/spatial.js';
// ---------------------------------------------------------------- object cache (opt-in)
export { ObjectCache, shouldCache, cacheKey } from './render/cache.js';
// ---------------------------------------------------------------- rendering
export { renderScene, renderNode, tracePath, measureText, arrowHead, LINE_HEIGHT } from './render/render.js';
// ---------------------------------------------------------------- serialization
export { sceneToSVG, nodeToSVG } from './render/svg.js';
// ---------------------------------------------------------------- primitives
export { History, Emitter } from './core/core.js';
// ---------------------------------------------------------------- types
export * from './types.js';
//# sourceMappingURL=index.js.map