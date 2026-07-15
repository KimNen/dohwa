import {
  IDENTITY, multiply, compose, composeAll, applyToPoint, invert,
  rotation, scaling, translation, decompose, transformBBox, isIdentity, determinant,
} from '../dist/matrix.js';

const ok = (name, cond) => console.log(cond ? 'PASS' : 'FAIL', name);
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const pClose = (p, q, eps = 1e-9) => close(p.x, q.x, eps) && close(p.y, q.y, eps);

// identity
ok('identity maps point unchanged', pClose(applyToPoint(IDENTITY, { x: 3, y: 7 }), { x: 3, y: 7 }));
ok('isIdentity', isIdentity(IDENTITY) && !isIdentity(scaling(2)));

// translation
ok('translation', pClose(applyToPoint(translation(10, 20), { x: 1, y: 2 }), { x: 11, y: 22 }));

// scaling
ok('scaling', pClose(applyToPoint(scaling(2, 3), { x: 4, y: 5 }), { x: 8, y: 15 }));

// rotation 90° around origin: (1,0) -> (0,1)
ok('rotation 90', pClose(applyToPoint(rotation(Math.PI / 2), { x: 1, y: 0 }), { x: 0, y: 1 }, 1e-9));

// composition order: translate THEN rotate vs rotate THEN translate differ
const A = multiply(translation(10, 0), rotation(Math.PI / 2));
const B = multiply(rotation(Math.PI / 2), translation(10, 0));
ok('composition is order-sensitive',
  !pClose(applyToPoint(A, { x: 0, y: 0 }), applyToPoint(B, { x: 0, y: 0 })));

// compose() around parts — rotate a unit x-vector by 90 and translate
const m = compose({ translateX: 5, translateY: 5, angle: Math.PI / 2, scaleX: 2, scaleY: 2 });
// point (1,0): scale->(2,0), rotate90->(0,2), translate->(5,7)
ok('compose parts', pClose(applyToPoint(m, { x: 1, y: 0 }), { x: 5, y: 7 }, 1e-9));

// invert round-trips
const T = compose({ translateX: 13, translateY: -4, angle: 0.7, scaleX: 1.5, scaleY: 0.8, skewX: 0.2 });
const Tinv = invert(T);
const p0 = { x: 9, y: -3 };
ok('invert round-trips', pClose(applyToPoint(Tinv, applyToPoint(T, p0)), p0, 1e-9));

// invert of identity is identity
ok('invert identity', isIdentity(invert(IDENTITY)));

// degenerate matrix (det 0) doesn't NaN
const degen = invert([0, 0, 0, 0, 5, 5]);
ok('degenerate invert safe', degen.every(Number.isFinite));

// decompose recovers compose parts
const parts = { translateX: 3, translateY: 8, angle: 0.5, scaleX: 2, scaleY: 1.3, skewX: 0 };
const d = decompose(compose(parts));
ok('decompose angle', close(d.angle, parts.angle, 1e-9));
ok('decompose scaleX', close(d.scaleX, parts.scaleX, 1e-9));
ok('decompose scaleY', close(d.scaleY, parts.scaleY, 1e-9));
ok('decompose translate', close(d.translateX, 3) && close(d.translateY, 8));

// transformBBox: rotate a 100x20 box by 90° -> AABB 20x100
const bb = transformBBox(rotation(Math.PI / 2), { x: 0, y: 0, w: 100, h: 20 });
ok('transformBBox rotate 90', close(bb.w, 20, 1e-9) && close(bb.h, 100, 1e-9));

// composeAll chains
const chained = composeAll([translation(1, 1), scaling(2), translation(3, 0)]);
// point 0,0: +3,0 -> *2 -> +1,1 => (7,1)
ok('composeAll chain', pClose(applyToPoint(chained, { x: 0, y: 0 }), { x: 7, y: 1 }, 1e-9));

// determinant of pure rotation is 1
ok('det rotation = 1', close(determinant(rotation(1.234)), 1, 1e-9));
