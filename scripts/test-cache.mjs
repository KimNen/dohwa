import { shouldCache, cacheKey } from '../dist/cache.js';

const ok = (name, cond) => console.log(cond ? 'PASS' : 'FAIL', name);
const style = { stroke:'#000', fill:'transparent', strokeWidth:2, opacity:1 };
const mkPath = (n) => ({ id:'p', type:'path', points: Array.from({length:n},(_,i)=>({x:i,y:i})), style:{...style} });

// shouldCache thresholds
ok('short path not cached', shouldCache(mkPath(10)) === false);
ok('long path cached', shouldCache(mkPath(50)) === true);
ok('rect never cached', shouldCache({ id:'r', type:'rect', x:0,y:0,w:1,h:1, style }) === false);

const smallGroup = { id:'g', type:'group', style, children:[{id:'a',type:'rect',x:0,y:0,w:1,h:1,style}] };
ok('small group not cached', shouldCache(smallGroup) === false);
const bigGroup = { id:'g', type:'group', style, children: Array.from({length:8},(_,i)=>({id:'c'+i,type:'rect',x:0,y:0,w:1,h:1,style})) };
ok('big group cached', shouldCache(bigGroup) === true);

// cacheKey stability & sensitivity
const p1 = mkPath(50);
ok('key stable for identical node', cacheKey(p1) === cacheKey(mkPath(50)));

// transform/position independence: moving the node must NOT change the key
const moved = { ...mkPath(50), transform: [1,0,0,1,500,500] };
ok('key ignores transform', cacheKey(moved) === cacheKey(mkPath(50)));

// style change MUST change the key
const restyled = { ...mkPath(50), style: { ...style, stroke: '#f00' } };
ok('key reflects style change', cacheKey(restyled) !== cacheKey(p1));

// content change (a moved point) changes the key
const edited = mkPath(50);
edited.points[25] = { x: 9999, y: 9999 };
ok('key reflects content edit', cacheKey(edited) !== cacheKey(p1));

// point count change changes the key
ok('key reflects length change', cacheKey(mkPath(51)) !== cacheKey(mkPath(50)));

// group key composes children
const g1 = { id:'g', type:'group', style, children:[mkPath(50)] };
const g2 = { id:'g', type:'group', style, children:[restyled] };
ok('group key reflects child style', cacheKey(g1) !== cacheKey(g2));
