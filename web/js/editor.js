import {t} from './i18n.js';
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createEditor(textarea, pre, lines, cursor, currentLine) {
  let tokens=[], diagnostics=[];
  function paint(){
    const code=textarea.value, ranges=[];
    for(const t of tokens){if(t.start<0||t.end<t.start||t.end>=code.length)continue;ranges.push({start:t.start,end:t.end+1,kind:/^(CIRCUIT|INPUT|OUTPUT|WIRE|DELAY)$/.test(t.type)?'keyword':/^(AND|OR|NOT|XOR|NAND|NOR|XNOR)$/.test(t.type)?'gate':t.type==='STRING'?'string':/^(INT|REAL)$/.test(t.type)?'number':'symbol'});}
    ranges.sort((a,b)=>a.start-b.start);
    let html='', pos=0;
    function append(start,end,kind){if(end<=start)return;const part=escape(code.slice(start,end));html+=kind?`<span class="tok-${kind}">${part}</span>`:part;}
    for(const r of ranges){if(r.start<pos)continue;const gap=code.slice(pos,r.start);let local=0;for(const m of gap.matchAll(/\/\/[^\n]*/g)){append(pos+local,pos+m.index);append(pos+m.index,pos+m.index+m[0].length,'comment');local=m.index+m[0].length;}append(pos+local,r.start);append(r.start,r.end,r.kind);pos=r.end;}
    const tail=code.slice(pos);let local=0;for(const m of tail.matchAll(/\/\/[^\n]*/g)){append(pos+local,pos+m.index);append(pos+m.index,pos+m.index+m[0].length,'comment');local=m.index+m[0].length;}append(pos+local,code.length);
    // Mark the server's exact character offsets without changing source text.
    if(diagnostics.length){
      const marks=new Set();for(const d of diagnostics)for(let i=Math.max(0,d.start);i<=Math.min(code.length-1,d.end);i++)marks.add(i);
      const boundaries=new Set([0,code.length]);for(const r of ranges){boundaries.add(r.start);boundaries.add(r.end);}for(const i of marks){boundaries.add(i);boundaries.add(i+1);}for(const m of code.matchAll(/\/\/[^\n]*/g)){boundaries.add(m.index);boundaries.add(m.index+m[0].length);}
      const stops=[...boundaries].sort((a,b)=>a-b);html='';for(let j=0;j<stops.length-1;j++){const a=stops[j],b=stops[j+1];if(a===b)continue;const r=ranges.find(x=>x.start<=a&&x.end>=b);const comment=!r&&code.lastIndexOf('//',a)>code.lastIndexOf('\n',a)&&code.indexOf('\n',a)!==a;const classes=[r&&`tok-${r.kind}`,comment&&'tok-comment',marks.has(a)&&'diagnostic-mark'].filter(Boolean).join(' ');html+=classes?`<span class="${classes}">${escape(code.slice(a,b))}</span>`:escape(code.slice(a,b));}
    }
    pre.innerHTML=html+'\n';lines.textContent=Array.from({length:Math.max(1,code.split('\n').length)},(_,i)=>i+1).join('\n');sync();position();
  }
  function sync(){pre.scrollTop=textarea.scrollTop;pre.scrollLeft=textarea.scrollLeft;lines.scrollTop=textarea.scrollTop;position();}
  function position(){const before=textarea.value.slice(0,textarea.selectionStart), line=before.split('\n');cursor.textContent=t('app.cursor',{line:line.length,col:line.at(-1).length+1});if(currentLine){currentLine.style.transform=`translateY(${18+(line.length-1)*22-textarea.scrollTop}px)`;currentLine.hidden=textarea.selectionStart!==textarea.selectionEnd;}}
  textarea.addEventListener('scroll',sync);textarea.addEventListener('click',position);textarea.addEventListener('keyup',position);
  textarea.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const p=textarea.selectionStart,q=textarea.selectionEnd;textarea.setRangeText('  ',p,q,'end');textarea.dispatchEvent(new Event('input',{bubbles:true}));}});
  return {paint,position,setTokens(value){tokens=value||[];paint();},setDiagnostics(value){diagnostics=value||[];paint();},select(start,end){textarea.focus();textarea.setSelectionRange(Math.max(0,start),Math.max(0,end+1));const before=textarea.value.slice(0,start);textarea.scrollTop=Math.max(0,(before.split('\n').length-3)*22);position();},clear(){tokens=[];diagnostics=[];paint();}};
}
