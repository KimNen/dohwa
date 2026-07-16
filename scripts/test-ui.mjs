import { rect, ellipse, text, arrow, group, scene, validateScene, createId } from '../dist/nodes.js';
import { TOOL_METAS, ACTION_METAS, getToolMeta, getToolsByGroup, toolIconSVG, getActionMeta } from '../dist/ui.js';
import { HANJI_PALETTE, SLATE_PALETTE, PALETTES, getPalette, THEMES, STROKE_WIDTHS } from '../dist/presets.js';
import { getBBox, getAABB, sceneToSVG, hitTestNode } from '../dist/index.js';

const ok = (n, c) => console.log(c ? 'PASS' : 'FAIL', n);

// --- factory: 엔진/DOM 없이 씬 생성
const r = rect({ x: 0, y: 0, w: 100, h: 50, style: { stroke: '#f00' } });
ok('rect factory', r.type === 'rect' && r.style.stroke === '#f00' && r.style.strokeWidth === 3);
ok('unique ids', createId() !== createId());
const t = text({ x: 10, y: 10, text: '도화\n두번째줄', fontSize: 20 });
ok('text estimates box', t.w > 0 && Math.abs(t.h - 2 * 20 * 1.3) < 0.01);
const a = arrow({ x1: 0, y1: 0, x2: 50, y2: 50 });
ok('arrow sets flag', a.type === 'line' && a.arrow === true);
const g = group([r, ellipse({ x: 200, y: 0, w: 40, h: 40 })]);
ok('group bbox spans children', getBBox(g).w === 240);

// --- 팩토리 씬이 실제 엔진 함수와 호환되는가 (핵심)
const s = scene([r, t, a, g]);
ok('validate own scene', validateScene(s).valid === true);
const svg = sceneToSVG(s.nodes);
ok('factory scene -> SVG', svg.startsWith('<svg') && svg.includes('<rect') && svg.includes('<text'));
ok('factory node hit-testable', hitTestNode(r, { x: 50, y: 0 }, 3) === true);

// --- validation: 악성/오염 입력 거부
ok('reject non-object', validateScene(null).valid === false);
ok('reject wrong app', validateScene({ app: 'evil', version: 1, nodes: [] }).valid === false);
ok('reject bad node type', validateScene({ app:'dohwa', version:1, nodes:[{id:'x',type:'wormhole',style:{stroke:'#000',strokeWidth:1}}] }).valid === false);
const nested = validateScene({ app:'dohwa', version:1, nodes:[{id:'g',type:'group',style:{stroke:'#000',strokeWidth:1},children:[{id:'b',type:'nope',style:{stroke:'#000',strokeWidth:1}}]}] });
ok('validates nested children', nested.valid === false && nested.errors[0].includes('children[0]'));
ok('error messages are located', validateScene({app:'dohwa',version:1,nodes:[{}]}).errors.some(e=>e.startsWith('nodes[0]')));

// --- tool metadata: UI 빌드용 재료
ok('every tool has icon+label', TOOL_METAS.every(m => m.icon.length > 0 && m.label));
ok('shortcuts unique', new Set(TOOL_METAS.filter(m=>m.shortcut).map(m=>m.shortcut)).size === TOOL_METAS.filter(m=>m.shortcut).length);
ok('getToolMeta', getToolMeta('pen').shortcut === 'p');
ok('group filter', getToolsByGroup('shape').every(m => m.creates));
const iconSVG = toolIconSVG('pen', 24);
ok('toolIconSVG renders', iconSVG.includes('<svg') && iconSVG.includes('width="24"') && iconSVG.includes('<path'));
ok('action meta flags', getActionMeta('group').needsMultiSelection === true && getActionMeta('paste').needsSelection === undefined);

// --- presets
ok('palettes have 5 strokes', PALETTES.every(p => p.strokes.length === 5));
ok('fills start with none', PALETTES.every(p => p.fills[0].value === 'transparent'));
ok('getPalette', getPalette('slate') === SLATE_PALETTE && getPalette('nope') === undefined);
ok('themes expose css vars', THEMES.every(t => Object.keys(t.vars).every(k => k.startsWith('--dohwa-'))));
ok('stroke widths ascending', STROKE_WIDTHS.every((w,i,arr) => i===0 || w > arr[i-1]));

// --- 프리셋을 팩토리에 적용 (통합)
const themed = rect({ x:0, y:0, w:10, h:10, style: { stroke: SLATE_PALETTE.strokes[1].value, fill: SLATE_PALETTE.fills[2].value } });
ok('preset -> factory integration', themed.style.stroke === '#e11d48' && themed.style.fill.startsWith('rgba(225'));

// 회전 노드 팩토리
const rot = rect({ x:0, y:0, w:100, h:20, rotation: Math.PI/2 });
ok('rotation flows into AABB', Math.abs(getAABB(rot).h - 100) < 1e-6);

// --- 양방향 화살표 · 크롭 · 단축키 재료 (v0.5)
const { getToolVariants, SHORTCUT_SECTIONS } = await import('../dist/ui.js');
const { image, line } = await import('../dist/nodes.js');

const dbl = arrow({ x1: 0, y1: 0, x2: 50, y2: 0, both: true });
ok('arrow factory: both heads', dbl.arrow === true && dbl.arrowStart === true);
ok('line factory: arrowStart passthrough', line({ x1:0, y1:0, x2:1, y2:1, arrowStart: true }).arrowStart === true);

const arrowBoth = getToolMeta('arrow-both');
ok('arrow-both is a variant of arrow', arrowBoth && arrowBoth.variantOf === 'arrow');
ok('getToolVariants finds it', getToolVariants('arrow').some((m) => m.tool === 'arrow-both'));
ok('variants have no own shortcut slot', getToolVariants('arrow').every((m) => !m.shortcut));

ok('crop action meta', getActionMeta('crop').needsSelection === true && getActionMeta('crop').icon.length > 0);

const cropped = image({ x: 0, y: 0, w: 10, h: 10, src: 'x', crop: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 } });
ok('image factory keeps crop', cropped.crop && cropped.crop.w === 0.5);
ok('cropped image scene validates', validateScene(scene([cropped, dbl])).valid === true);

ok('shortcut sections exist', SHORTCUT_SECTIONS.length >= 4);
ok('shortcut items have keys+label', SHORTCUT_SECTIONS.every((s) =>
  s.items.every((i) => i.keys.length > 0 && i.label && i.key)));
ok('shortcut tool rows track TOOL_METAS', SHORTCUT_SECTIONS.find((s) => s.key === 'tools')
  .items.some((i) => i.key === 'pen' && i.keys[0] === 'P'));
const allShortcutKeys = SHORTCUT_SECTIONS.flatMap((s) => s.items.map((i) => `${s.key}:${i.key}`));
ok('shortcut item keys unique', new Set(allShortcutKeys).size === allShortcutKeys.length);
