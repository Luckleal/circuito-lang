export function panzoom(host, svg, fitButton) {
  const world = svg.querySelector('[data-world]');
  const state = {x:0,y:0,scale:1};
  const pointers = new Map(); let drag = null, lastDistance = 0;
  function apply() { world.setAttribute('transform', `translate(${state.x} ${state.y}) scale(${state.scale})`); }
  function fit() {
    const bounds = world.getBBox(), box = svg.getBoundingClientRect();
    if (!bounds.width || !box.width) return;
    state.scale = Math.min(1.7, Math.max(.12, Math.min((box.width-48)/bounds.width,(box.height-48)/bounds.height)));
    state.x = (box.width-bounds.width*state.scale)/2-bounds.x*state.scale;
    state.y = (box.height-bounds.height*state.scale)/2-bounds.y*state.scale; apply();
  }
  function zoom(factor, cx=svg.clientWidth/2, cy=svg.clientHeight/2) {
    const next = Math.min(3, Math.max(.15,state.scale*factor));
    state.x = cx-(cx-state.x)*(next/state.scale); state.y = cy-(cy-state.y)*(next/state.scale); state.scale=next; apply();
  }
  svg.addEventListener('wheel', e => {e.preventDefault(); const rect=svg.getBoundingClientRect(); zoom(e.deltaY<0?1.12:1/1.12,e.clientX-rect.left,e.clientY-rect.top);},{passive:false});
  svg.addEventListener('pointerdown', e => { if (e.target.closest('[data-action]')) return; svg.setPointerCapture(e.pointerId); pointers.set(e.pointerId,{x:e.clientX,y:e.clientY}); drag={x:e.clientX,y:e.clientY}; });
  svg.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    const before=pointers.get(e.pointerId); pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (pointers.size===2) { const [a,b]=[...pointers.values()], distance=Math.hypot(a.x-b.x,a.y-b.y); if(lastDistance) zoom(distance/lastDistance,(a.x+b.x)/2-svg.getBoundingClientRect().left,(a.y+b.y)/2-svg.getBoundingClientRect().top); lastDistance=distance; }
    else if (drag) {state.x+=e.clientX-before.x;state.y+=e.clientY-before.y;apply();}
  });
  const end=e=>{pointers.delete(e.pointerId);drag=null;lastDistance=0;}; svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
  host.querySelector('[data-zoom="in"]')?.addEventListener('click',()=>zoom(1.2));
  host.querySelector('[data-zoom="out"]')?.addEventListener('click',()=>zoom(1/1.2));
  fitButton?.addEventListener('click',fit);
  requestAnimationFrame(fit);
  return {fit,zoom};
}
