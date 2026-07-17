import { getAABB, hitTestNode, nodeMatrix, toLocalPoint, hasTransform, flipNode } from '../dist/geometry/geometry.js';
import { compose, composeAll, rotation, scaling, translation, applyToPoint, decompose } from '../dist/geometry/matrix.js';

const ok = (name, cond) => console.log(cond ? 'PASS' : 'FAIL', name);
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const style = { stroke: '#000', fill: '#f00', strokeWidth: 0, opacity: 1 };

// --- legacy rotation still produces correct AABB
const legacy = { id: 'l', type: 'rect', x: 0, y: 0, w: 100, h: 20, rotation: Math.PI / 2, style };
ok('legacy rotation AABB', close(getAABB(legacy).w, 20) && close(getAABB(legacy).h, 100));

// --- new transform: non-uniform scale (2x wide, 3x tall) around center
const scaled = {
  id: 's', type: 'rect', x: -50, y: -10, w: 100, h: 20,
  transform: compose({ scaleX: 2, scaleY: 3 }), style,
};
const sb = getAABB(scaled);
ok('non-uniform scale AABB', close(sb.w, 200) && close(sb.h, 60));

// --- new transform: skew (something the old model literally could not represent)
const skewed = {
  id: 'k', type: 'rect', x: 0, y: 0, w: 100, h: 100,
  transform: compose({ skewX: Math.PI / 6 }), style, // 30° x-skew
};
ok('skew widens AABB', getAABB(skewed).w > 100);
ok('skew keeps height', close(getAABB(skewed).h, 100));

// --- transform hit-testing: point that's only inside AFTER skew
// filled rect, skewed; a point past the original right edge should now hit
const skewHitPoint = { x: 120, y: 90 }; // outside original 100x100, inside skewed top region? test via local
const localP = toLocalPoint(skewed, skewHitPoint);
ok('toLocalPoint inverts transform', hitTestNode(skewed, skewHitPoint, 1) === (localP.x >= -1 && localP.x <= 101 && localP.y >= -1 && localP.y <= 101));

// --- combined rotate + scale + translate, hit test the transformed center
const combo = {
  id: 'c', type: 'ellipse', x: 0, y: 0, w: 40, h: 40,
  transform: compose({ translateX: 100, translateY: 50, angle: 0.9, scaleX: 2, scaleY: 0.5 }),
  style,
};
// the node's bbox center is (20,20); after transform it moves — its image should be hit
const center = applyToPoint(nodeMatrix(combo), { x: 20, y: 20 });
ok('combined transform hit at mapped center', hitTestNode(combo, center, 1) === true);
ok('combined transform miss at original center', hitTestNode(combo, { x: 20, y: 20 }, 1) === false);

// --- transform takes precedence over legacy rotation when both present
const both = {
  id: 'b', type: 'rect', x: 0, y: 0, w: 100, h: 20,
  rotation: 0, transform: compose({ angle: Math.PI / 2 }), style,
};
ok('transform precedence over rotation', close(getAABB(both).w, 20) && close(getAABB(both).h, 100));

// --- hasTransform correctness
ok('hasTransform: none', hasTransform({ id:'x', type:'rect', x:0,y:0,w:1,h:1, style }) === false);
ok('hasTransform: legacy', hasTransform({ id:'x', type:'rect', x:0,y:0,w:1,h:1, rotation: 0.1, style }) === true);
ok('hasTransform: matrix', hasTransform({ id:'x', type:'rect', x:0,y:0,w:1,h:1, transform: compose({ scaleX: 2 }), style }) === true);

// --- decompose a live node matrix back to angle
const rotNode = { id:'r', type:'rect', x:0,y:0,w:10,h:10, transform: compose({ angle: 0.6 }), style };
ok('decompose node angle', close(decompose(rotNode.transform).angle, 0.6));

// --- flipNode mirrors a matrix `transform`, not just the legacy rotation field.
// A +θ rotation flipped horizontally must behave like a −θ rotation: the b (sin)
// component negates, and hit-testing must match the legacy-rotation equivalent.
{
  const probe = { x: 12, y: 30 };
  const filled = { ...style, fill: '#f00' };
  const viaMatrix = { id:'fm', type:'rect', x:0,y:0,w:100,h:40, transform: compose({ angle: 0.5236 }), style: filled };
  const viaLegacy = { id:'fl', type:'rect', x:0,y:0,w:100,h:40, rotation: 0.5236, style: filled };
  flipNode(viaMatrix, 'h', { x: 50, y: 20 });
  flipNode(viaLegacy, 'h', { x: 50, y: 20 });
  ok('flip mirrors matrix transform (sin negated)', close(viaMatrix.transform[1], -0.5, 1e-3));
  ok('flipped matrix hit matches flipped legacy',
    hitTestNode(viaMatrix, probe, 2) === hitTestNode(viaLegacy, probe, 2));
  // flipping again restores the original orientation
  flipNode(viaMatrix, 'h', { x: 50, y: 20 });
  ok('double flip restores transform', close(viaMatrix.transform[1], 0.5, 1e-3));
}

// --- composeAll applies matrices right-to-left (last element hits a point first)
{
  const m = composeAll([translation(10, 0), scaling(2)]);
  // scaling(2) is last -> applied first: (1,0)->(2,0); then translation -> (12,0)
  const p = applyToPoint(m, { x: 1, y: 0 });
  ok('composeAll is right-to-left', close(p.x, 12) && close(p.y, 0));
}
