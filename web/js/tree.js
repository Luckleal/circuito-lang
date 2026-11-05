import {panzoom} from './panzoom.js';
import {t} from './i18n.js';
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const el = document.createElementNS(NS,tag); for (const [key,value] of Object.entries(attrs)) el.setAttribute(key,value); return el; };
function children(node) {
  if (node.kind === 'rule') return node.children || [];
  if (node.type === 'Program') return node.body || [];
  if (node.type === 'Declaration') return node.signals || [];
  if (node.type === 'Assignment') return [node.target,node.expr].filter(Boolean);
  if (node.type === 'Binary') return [node.left,node.right];
  if (node.type === 'Not') return [node.operand];
  return [];
}
function label(node) {
  if (node.kind === 'rule') return node.rule;
  if (node.kind === 'token') return `${node.type}: ${node.text}`;
  if (node.type === 'Program') return t('tree.program',{name:node.name});
  if (node.type === 'Declaration') return t('tree.declaration',{kind:node.kind});
  if (node.type === 'Assignment') return `${t('tree.assignment')}${node.delay == null ? '' : ` · ${node.delay} ns`}`;
  if (node.type === 'Signal') return node.index == null ? node.name : `${node.name}[${node.index}]`;
  if (node.type === 'Binary') return node.op;
  if (node.type === 'Constant') return String(node.value);
  return node.type || t('tree.node');
}
export function renderTree(host, root, onSelect) {
  host.replaceChildren();
  if (!root) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = t('tree.unavailable'); host.append(p); return; }
  const wrap = document.createElement('div'); wrap.className = 'svg-shell';
  const controls = document.createElement('div'); controls.className = 'svg-controls';
  const out = document.createElement('button'); out.type = 'button'; out.dataset.zoom = 'out'; out.setAttribute('aria-label',t('tree.zoom_out')); out.textContent = '−';
  const inside = document.createElement('button'); inside.type = 'button'; inside.dataset.zoom = 'in'; inside.setAttribute('aria-label',t('tree.zoom_in')); inside.textContent = '+';
  const fit = document.createElement('button'); fit.type = 'button'; fit.dataset.fit = ''; fit.setAttribute('aria-label',t('tree.fit')); fit.textContent = t('tree.fit_button');
  controls.append(out,inside,fit);
  const svg = svgEl('svg',{class:'diagram',role:'img','aria-label':t('tree.aria')});
  const world = svgEl('g',{'data-world':''}); svg.append(world); wrap.append(controls,svg); host.append(wrap);
  const closed = new WeakSet(); let control;
  function draw() {
    world.replaceChildren(); let leaf = 0; const nodes = [];
    function walk(node, depth) {
      const descendants = (closed.has(node) ? [] : children(node)).map(child => walk(child,depth+1));
      const y = descendants.length ? (descendants[0].y + descendants.at(-1).y) / 2 : leaf++ * 54 + 28;
      const entry = {node,x:depth*196+20,y,kids:descendants}; nodes.push(entry); return entry;
    }
    walk(root,0);
    for (const entry of nodes) for (const child of entry.kids) world.append(svgEl('path',{d:`M ${entry.x+150} ${entry.y} C ${entry.x+172} ${entry.y}, ${child.x-22} ${child.y}, ${child.x} ${child.y}`,class:'tree-link'}));
    for (const entry of nodes) {
      const name = label(entry.node), hasChildren = children(entry.node).length > 0;
      const group = svgEl('g',{class:'tree-node',tabindex:'0',role:'button','aria-label':`${name}; ${t('tree.select')}${hasChildren ? `; ${t('tree.collapse')}` : ''}`,'data-action':'node'});
      group.append(svgEl('rect',{x:entry.x,y:entry.y-18,width:150,height:36,rx:5}));
      const title = svgEl('title'); title.textContent = name; group.append(title);
      const text = svgEl('text',{x:entry.x+10,y:entry.y+4}); text.textContent = name.length > 19 ? `${name.slice(0,18)}…` : name; group.append(text);
      if (hasChildren) { const toggle = svgEl('text',{x:entry.x+134,y:entry.y+4,class:'toggle'}); toggle.textContent = closed.has(entry.node) ? '+' : '−'; group.append(toggle); }
      const choose = () => { if (Number.isInteger(entry.node.start)) onSelect(entry.node.start,entry.node.end); };
      const toggle = () => { closed.has(entry.node) ? closed.delete(entry.node) : closed.add(entry.node); draw(); };
      group.addEventListener('click',event => event.target.classList?.contains('toggle') ? toggle() : choose());
      group.addEventListener('dblclick',toggle);
      group.addEventListener('keydown',event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); }
        else if (event.key === 'ArrowRight' && hasChildren) { closed.delete(entry.node); draw(); }
        else if (event.key === 'ArrowLeft' && hasChildren) { closed.add(entry.node); draw(); }
      });
      world.append(group);
    }
    if (!control) control = panzoom(wrap,svg,fit); else requestAnimationFrame(control.fit);
  }
  draw();
}
