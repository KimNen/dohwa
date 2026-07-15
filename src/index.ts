// ---------------------------------------------------------------- engine
export { Dohwa } from './dohwa.js';

// ---------------------------------------------------------------- pure geometry (DOM-free)
export {
  getBBox,
  rawBBox,
  getAABB,
  unionBBox,
  bboxCenter,
  bboxCorners,
  bboxIntersects,
  pointInBBox,
  translateNode,
  scaleNodeInto,
  flipNode,
  hitTestNode,
  rotatePoint,
  distToSegment,
  diamondPoints,
  trianglePoints,
  nodeMatrix,
  toLocalPoint,
  hasTransform,
} from './geometry.js';

// ---------------------------------------------------------------- affine matrix (DOM-free)
export {
  IDENTITY,
  multiply,
  composeAll,
  compose,
  translation,
  scaling,
  rotation,
  skewing,
  applyToPoint,
  invert,
  determinant,
  isIdentity,
  decompose,
  toCSS,
  transformBBox,
} from './matrix.js';
export type { Matrix, TransformParts, DecomposedTransform } from './matrix.js';

// ---------------------------------------------------------------- spatial index (DOM-free)
export { Quadtree } from './spatial.js';
export type { IndexedItem } from './spatial.js';

// ---------------------------------------------------------------- object cache (opt-in)
export { ObjectCache, shouldCache, cacheKey } from './cache.js';

// ---------------------------------------------------------------- rendering
export { renderScene, renderNode, tracePath, measureText, arrowHead, LINE_HEIGHT } from './render.js';
export type { ImageCache, RenderOptions } from './render.js';

// ---------------------------------------------------------------- serialization
export { sceneToSVG, nodeToSVG } from './svg.js';

// ---------------------------------------------------------------- primitives
export { History, Emitter } from './core.js';

// ---------------------------------------------------------------- types
export * from './types.js';
