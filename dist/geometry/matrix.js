export const IDENTITY = [1, 0, 0, 1, 0, 0];
export function multiply(m1, m2) {
    const [a1, b1, c1, d1, e1, f1] = m1;
    const [a2, b2, c2, d2, e2, f2] = m2;
    return [
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    ];
}
/**
 * Multiply a chain in array order: composeAll([A, B, C]) = A·B·C. Because
 * matrices act on points from the right, the LAST matrix is applied to a
 * point first — composeAll([A, B, C]) applied to p is A(B(C(p))), i.e. C,
 * then B, then A.
 */
export function composeAll(matrices) {
    let acc = IDENTITY;
    for (const m of matrices)
        acc = multiply(acc, m);
    return acc;
}
export function translation(x, y) {
    return [1, 0, 0, 1, x, y];
}
export function scaling(sx, sy = sx) {
    return [sx, 0, 0, sy, 0, 0];
}
export function rotation(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [cos, sin, -sin, cos, 0, 0];
}
/** Skew given in radians. */
export function skewing(skewX, skewY) {
    return [1, Math.tan(skewY), Math.tan(skewX), 1, 0, 0];
}
export function compose(parts) {
    const { translateX = 0, translateY = 0, angle = 0, scaleX = 1, scaleY = 1, skewX = 0, skewY = 0, } = parts;
    let m = translation(translateX, translateY);
    if (angle !== 0)
        m = multiply(m, rotation(angle));
    if (skewX !== 0 || skewY !== 0)
        m = multiply(m, skewing(skewX, skewY));
    if (scaleX !== 1 || scaleY !== 1)
        m = multiply(m, scaling(scaleX, scaleY));
    return m;
}
export function applyToPoint(m, p) {
    return {
        x: m[0] * p.x + m[2] * p.y + m[4],
        y: m[1] * p.x + m[3] * p.y + m[5],
    };
}
export function determinant(m) {
    return m[0] * m[3] - m[1] * m[2];
}
export function invert(m) {
    const det = determinant(m);
    if (Math.abs(det) < 1e-12)
        return IDENTITY; // degenerate — avoid NaN blowups
    const [a, b, c, d, e, f] = m;
    const invDet = 1 / det;
    return [
        d * invDet,
        -b * invDet,
        -c * invDet,
        a * invDet,
        (c * f - d * e) * invDet,
        (b * e - a * f) * invDet,
    ];
}
export function isIdentity(m) {
    return (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0);
}
export function decompose(m) {
    const [a, b, c, d, e, f] = m;
    const angle = Math.atan2(b, a);
    const denom = a * a + b * b;
    const scaleX = Math.sqrt(denom);
    const skewX = Math.atan2(a * c + b * d, denom);
    const scaleY = determinant(m) / (scaleX || 1);
    return { translateX: e, translateY: f, angle, scaleX, scaleY, skewX };
}
/** Format for CSS/Canvas: "matrix(a,b,c,d,e,f)". */
export function toCSS(m) {
    return `matrix(${m.map((n) => Math.round(n * 1e6) / 1e6).join(',')})`;
}
/** Transform an axis-aligned box, returning the AABB of the 4 mapped corners. */
export function transformBBox(m, box) {
    const corners = [
        applyToPoint(m, { x: box.x, y: box.y }),
        applyToPoint(m, { x: box.x + box.w, y: box.y }),
        applyToPoint(m, { x: box.x + box.w, y: box.y + box.h }),
        applyToPoint(m, { x: box.x, y: box.y + box.h }),
    ];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of corners) {
        if (p.x < minX)
            minX = p.x;
        if (p.y < minY)
            minY = p.y;
        if (p.x > maxX)
            maxX = p.x;
        if (p.y > maxY)
            maxY = p.y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
//# sourceMappingURL=matrix.js.map