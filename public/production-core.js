(function(root){
'use strict';
const words=t=>String(t||'').trim().split(/\s+/).filter(Boolean).length;
const numbers=t=>(String(t||'').normalize('NFKC').replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c.charCodeAt(0)>1775?1776:1632))).replace(/٫/g,'.').replace(/٬/g,',').match(/\d+(?:[.,]\d+)*/g)||[]);
function groups(slides,target){
 if(!Number.isFinite(target)||target<5||target>600)throw Error('مدة الاختبار المدعومة من 5 إلى 600 ثانية؛ المدة ليست مقصورة على أزرار ثابتة.');
 const total=slides.reduce((n,s)=>n+Math.max(1,words(s.voiceover)),0),budget=Math.max(1,total/Math.max(1,Math.ceil(target/30)));
 const out=[];let g={indexes:[],text:'',weight:0};
 slides.forEach((s,i)=>{const text=String(s.voiceover||'').trim(),weight=Math.max(1,words(text));if(g.indexes.length&&g.weight+weight>budget*1.35&&g.text){out.push(g);g={indexes:[],text:'',weight:0};}g.indexes.push(i);g.text+=(text?(g.text?'\n\n':'')+text:'');g.weight+=weight;});
 if(g.indexes.length)out.push(g);
 return out.map(g=>({...g,seconds:target*g.weight/total}));
}
function timing(slides,groups,durations,target,pause=.18){
 const spent=durations.reduce((a,b)=>a+b,0)+pause*Math.max(0,groups.length-1);
 if(spent>target+.02)throw Error(`التعليق ${spent.toFixed(1)} ثانية يتجاوز المطلوب ${target.toFixed(1)}؛ لا يُقطع الكلام ولا يُسرّع.`);
 let cursor=0;const out=new Array(slides.length).fill(0);
 groups.forEach((g,k)=>{const total=g.indexes.reduce((n,i)=>n+Math.max(1,words(slides[i].voiceover)),0);g.start=cursor;g.duration=durations[k];g.indexes.forEach(i=>out[i]=durations[k]*Math.max(1,words(slides[i].voiceover))/total);if(k<groups.length-1)out[g.indexes.at(-1)]+=pause;cursor+=durations[k]+(k<groups.length-1?pause:0);});
 out[out.length-1]+=Math.max(0,target-spent);return out;
}
function alignedDurations(segments,count,total){
 if(!Number.isFinite(total)||total<=0||!Array.isArray(segments)||segments.length!==count)throw Error('توقيت الفقرات غير مكتمل');
 const starts=segments.map((x,i)=>{if(x.scene!==i+1||!Number.isFinite(x.start)||x.start<0||x.start>=total||(i&&x.start<=segments[i-1].start))throw Error('ترتيب توقيت الفقرات غير صالح');return i?x.start:0;});
 const out=starts.map((t,i)=>(starts[i+1]??total)-t);if(out.some(d=>d<.25))throw Error('أحد المشاهد أقصر من الحد الآمن');return out;
}
function safePexels(item){
 try {const u=new URL(item.mediaUrl),p=new URL(item.pageUrl);return u.protocol==='https:'&&['images.pexels.com','videos.pexels.com'].includes(u.hostname)&&p.protocol==='https:'&&(p.hostname==='www.pexels.com'||p.hostname==='pexels.com')&&Boolean(item.creator);}catch{return false;}
}
function safeMedia(item){
 if(safePexels(item))return true;
 try{const u=new URL(item.mediaUrl),p=new URL(item.pageUrl);return item.provider==='Commons'&&/^commons-\d+$/.test(String(item.id))&&item.type==='photo'&&['CC0','CC0 1.0','Public domain'].includes(item.license)&&u.protocol==='https:'&&u.hostname==='upload.wikimedia.org'&&!u.username&&!u.password&&!u.port&&u.pathname.startsWith('/wikipedia/commons/')&&p.protocol==='https:'&&p.hostname==='commons.wikimedia.org'&&!p.username&&!p.password&&!p.port&&p.pathname.startsWith('/wiki/File:')&&Boolean(item.creator);}catch{return false;}
}
function choose(items,used,seconds){return items.filter(safePexels).filter(x=>!used.has(String(x.id)+':'+x.type)).map((x,i)=>({x,score:10-i+(x.type==='video'?4:0)+(Number(x.duration)>=seconds?2:0)})).sort((a,b)=>b.score-a.score)[0]?.x||null;}
function requestedDuration(command){
 let text=String(command||'').normalize('NFKC').replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c.charCodeAt(0)>1775?1776:1632)));
 text=text.replace(/دقيقة\s*ونصف/g,'1 دقيقة و30 ثانية').replace(/دقيقتين|دقيقتان/g,'2 دقيقة').replace(/(?:دقيقة|دقيقه)(?=\s|$)/g,(m,offset,source)=>/\d\s*$/.test(source.slice(0,offset))?m:'1 دقيقة');
 const values=[],clock=text.match(/(?:مدته|مدة|لمدة|بطول|duration)[^\d:\n]{0,25}(\d+):(\d{1,2})(?!\d)/i);
 if(clock){if(Number(clock[2])>=60)throw Error('الثواني بعد النقطتين يجب أن تكون أقل من 60');values.push(Number(clock[1])*60+Number(clock[2]));}
 const units=[...text.matchAll(/(\d+(?:\.\d+)?)\s*(ثانية|ثواني|ثوان|seconds?\b|دقائق|دقيقة|دقيقه|minutes?\b)/gi)];
 for(let i=0;i<units.length;i++){
  const m=units[i],prefix=text.slice(0,m.index).split(/[\n.!؟؛]/).at(-1);
  if(/(?:مشهد|المشهد|scene)\s*\d+[^\n.!؟؛]*$|(?:كل|لكل)\s*مشهد[^\n.!؟؛]*$/i.test(prefix)||/بدل(?:اً من)?\s*$/.test(prefix))continue;
  const minutes=/دق|minute/i.test(m[2]);let value=Number(m[1])*(minutes?60:1);const next=units[i+1];
  if(minutes&&next&&!/دق|minute/i.test(next[2])&&/^\s*(?:و|and)?\s*$/i.test(text.slice(m.index+m[0].length,next.index))){value+=Number(next[1]);i++;}
  values.push(value);
 }
 const unique=[...new Set(values)];if(unique.length>1)throw Error('وجدت مدداً مختلفة في الأمر؛ حدّد مدة واحدة للفيديو.');const seconds=unique[0]??null;
 if(seconds!==null&&(seconds<5||seconds>600))throw Error('المدة المدعومة من 5 إلى 600 ثانية.');return seconds;
}
function output(command){return /تلفزيون|يوتيوب|youtube|أفقي|افقي|16\s*:\s*9/i.test(command)?'landscape':'portrait';}
root.StudioProductionCore={words,numbers,groups,timing,alignedDurations,safePexels,safeMedia,choose,output,requestedDuration};
})(typeof window==='undefined'?globalThis:window);
