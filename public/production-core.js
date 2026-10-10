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
function safePexels(item){
 try {const u=new URL(item.mediaUrl),p=new URL(item.pageUrl);return u.protocol==='https:'&&['images.pexels.com','videos.pexels.com'].includes(u.hostname)&&p.protocol==='https:'&&(p.hostname==='www.pexels.com'||p.hostname==='pexels.com')&&Boolean(item.creator);}catch{return false;}
}
function choose(items,used,seconds){return items.filter(safePexels).filter(x=>!used.has(String(x.id)+':'+x.type)).map((x,i)=>({x,score:10-i+(x.type==='video'?4:0)+(Number(x.duration)>=seconds?2:0)})).sort((a,b)=>b.score-a.score)[0]?.x||null;}
function output(command){return /تلفزيون|يوتيوب|youtube|أفقي|افقي|16\s*:\s*9/i.test(command)?'landscape':'portrait';}
root.StudioProductionCore={words,numbers,groups,timing,safePexels,choose,output};
})(typeof window==='undefined'?globalThis:window);
