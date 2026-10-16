/* Guided production and local graphics. No new provider or generated facts. */
(function(root){
'use strict';
function recent(item,now=Date.now(),days=730){
 if(item.local||item.localGraphic)return true;
 if(item.provider!=='commons'&&!item.archive)return true; // Stock is illustrative, not evidence of a current event.
 const raw=String(item.capturedAt||'');if(/upload|رفع/i.test(raw))return false;
 const m=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]|$)/);if(!m)return false;
 const time=Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])),d=new Date(time);
 if(d.getUTCFullYear()!==Number(m[1])||d.getUTCMonth()!==Number(m[2])-1||d.getUTCDate()!==Number(m[3]))return false;
 return time<=now&&now-time<=days*86400000;
}
function words(text){return String(text||'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(x=>x.length>2);}
function graphicSpec(slide,source){
 if(!String(source||'').trim())throw Error('ألصق المادة الأصلية قبل تجهيز الرسوم المعلوماتية.');
 const text=[slide.title,slide.header,slide.subtitle,slide.voiceover].filter(Boolean).join(' '),tokens=new Set(words(text));
 const sentences=String(source).split(/(?<=[.!؟؛])\s+|\n+/).map(x=>x.trim()).filter(Boolean);
 const ranked=sentences.map((quote,index)=>({quote,index,score:words(quote).filter(w=>tokens.has(w)).length})).sort((a,b)=>b.score-a.score||a.index-b.index);
 const excerpt=ranked[0]?.quote||String(source).trim();
 const kind=/خصوص|كرام|خجل|وصم|privacy|dignity/i.test(text)?'privacy':/عمل|وظيف|work|job/i.test(text)?'work':/مال|فقر|دينار|راتب|ميزاني|money|poverty|budget/i.test(text)?'budget':'document';
 return {kind,excerpt,source:'local-source',text,scope:'رسم معلوماتي محلي، وليس لقطة توثيقية'};
}
function draw(canvas,spec){
 const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,M=Math.min(W,H),cx=W*.5,cy=H*.25,r=M*.15;
 const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#071426');g.addColorStop(1,'#163955');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;for(let x=0;x<W;x+=M*.08){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
 ctx.fillStyle='rgba(227,18,23,.14)';ctx.beginPath();ctx.arc(cx,cy,r*1.8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#59d3b0';ctx.lineWidth=M*.012;ctx.lineCap='round';ctx.lineJoin='round';
 if(spec.kind==='privacy'){
  ctx.beginPath();ctx.arc(cx,cy-r*.2,r*.55,Math.PI,0);ctx.lineTo(cx+r*.55,cy+r*.3);ctx.stroke();ctx.fillStyle='#102b44';ctx.fillRect(cx-r*.8,cy-r*.05,r*1.6,r*1.25);ctx.strokeRect(cx-r*.8,cy-r*.05,r*1.6,r*1.25);ctx.fillStyle='#59d3b0';ctx.beginPath();ctx.arc(cx,cy+r*.45,r*.12,0,Math.PI*2);ctx.fill();
 }else if(spec.kind==='budget'){
  ctx.strokeRect(cx-r,cy-r*.55,r*2,r*1.25);ctx.fillStyle='#163955';ctx.fillRect(cx+r*.25,cy-r*.15,r*.9,r*.5);ctx.strokeRect(cx+r*.25,cy-r*.15,r*.9,r*.5);ctx.fillStyle='#E31217';ctx.beginPath();ctx.arc(cx+r*.7,cy+r*.1,r*.08,0,Math.PI*2);ctx.fill();
  // Coins are symbolic; there are no invented chart values or numeric labels.
  for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(cx-r*.55+i*r*.45,cy-r*.95,r*.19,r*.08,0,0,Math.PI*2);ctx.stroke();}
 }else if(spec.kind==='work'){
  ctx.strokeRect(cx-r,cy-r*.4,r*2,r*1.3);ctx.strokeRect(cx-r*.4,cy-r*.85,r*.8,r*.45);ctx.beginPath();ctx.moveTo(cx-r,cy+r*.1);ctx.lineTo(cx+r,cy+r*.1);ctx.stroke();
 }else{
  ctx.strokeRect(cx-r*.75,cy-r,r*1.5,r*2);for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(cx-r*.45,cy-r*.55+i*r*.36);ctx.lineTo(cx+r*.45,cy-r*.55+i*r*.36);ctx.stroke();}
 }
 ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W*.12,H*.43);ctx.lineTo(W*.88,H*.43);ctx.stroke();return canvas;
}
function missing(slides,getMedia){return slides.flatMap((s,i)=>s.visualType!=='text-only'&&!getMedia(s).length?[i+1]:[]);}
root.StudioWorkflow={recent,graphicSpec,draw,missing};
})(typeof window!=='undefined'?window:globalThis);
