/* Local canvas overlays. No network, provider, audio or media mutation. */
(function(root){
'use strict';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=t=>1-Math.pow(1-clamp(t),3);
const norm=s=>String(s||'').normalize('NFKC').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/\s+/g,' ').trim();
const icons={
 document:'M6 2H16L22 8V26H6Z M16 2V9H22 M10 14H18 M10 18H18 M10 22H15',
 factory:'M3 27V14L11 9V15L19 10V27Z M21 27V3H26V27 M6 21H8 M12 21H14',
 box:'M3 9L15 3L27 9V23L15 29L3 23Z M3 9L15 15L27 9 M15 15V29 M9 6L21 12',
 perfume:'M8 10H22V27H8Z M11 3H19V7H11Z M13 7V10 M17 7V10 M11 17H19',
 phone:'M8 2H23V28H8Z M12 6H19 M13 24H18',
 person:'M20 8A5 5 0 1 1 10 8A5 5 0 1 1 20 8 M5 28V24A10 10 0 0 1 25 24V28',
 money:'M2 7H28V24H2Z M19 15.5A4 4 0 1 1 11 15.5A4 4 0 1 1 19 15.5 M5 11H7 M23 20H25',
 location:'M15 28C12 23 5 17 5 11A10 10 0 0 1 25 11C25 17 18 23 15 28Z M19 11A4 4 0 1 1 11 11A4 4 0 1 1 19 11',
 health:'M11 3H19V11H27V19H19V27H11V19H3V11H11Z',
 education:'M2 9L15 3L28 9L15 15Z M7 12V22Q15 28 23 22V12 M28 9V22',
 energy:'M17 2L6 17H14L11 29L25 12H16Z',
 water:'M15 2C12 9 5 15 5 20A10 10 0 0 0 25 20C25 15 18 9 15 2Z',
 clock:'M28 15A13 13 0 1 1 2 15A13 13 0 1 1 28 15 M15 6V15L21 19',
 search:'M21 12A9 9 0 1 1 3 12A9 9 0 1 1 21 12 M19 19L28 28',
 warning:'M15 2L29 27H1Z M15 10V18 M15 22V23',
 question:'M10 9A5 5 0 1 1 18 13Q15 15 15 19 M15 24V25',
 marker:'M15 2L28 15L15 28L2 15Z M15 9V17 M15 22V23'
};
const lexicon=[
 ['perfume','العطر',/عطر|عطور/],['perfume','التجميل',/تجميل|كوزمتيك/],
 ['factory','الإنتاج',/مصنع|مصانع|معمل|معامل|انتاج|تشغيل|صناع/],['box','المخزون',/مخزون|بضائع|بضاع|مستودع|شحن|سلع/],
 ['document','الوثائق',/وثيق|وثائق|مستند|سجلات|فواتير|فاتور|عقد|عقود|ترخيص|تراخيص/],
 ['phone','الإعلان',/اعلان|اعلانات|منصات|هاتف|التواصل|مؤثر|مشاهير/],['money','الأموال',/اموال|(?:^|\s)(?:ال)?مال(?:\s|$)|ارباح|مبيعات|تمويل|مدفوع|مصرف|بنك|اقتصاد|دينار/],
 ['person','الأشخاص',/اشخاص|شخص|مستفيد|ممول|وزير|رئيس|موظف/],['health','الصحة',/صحة|صحي|طب|دواء|ادوية|مستشفى/],
 ['education','التعليم',/تعليم|مدرس|طالب|طلاب|جامع/],['energy','الطاقة',/كهرباء|طاقة|نفط|وقود/],['water','المياه',/مياه|الماء|جفاف|الري(?:\s|$)/],
 ['location','المكان',/العراق|مصر|الصين|بغداد|بلد|مدينة|محافظ/],['clock','الوقت',/وقت|مهام|جدول|ساع|موعد/]
];
const cache=new WeakMap(),paths=new Map();
function words(text){return String(text||'').trim().split(/\s+/).filter(Boolean);}
function plan(slide){
 const key=JSON.stringify([slide.title,slide.header,slide.subtitle,slide.caption,slide.voiceover,slide.points,slide.graphics]);const saved=cache.get(slide);if(saved?.key===key)return saved.plan;
 const narration=String(slide.voiceover||'').trim(),tokens=words(narration),text=norm(narration),annotations=[];
 // Optional model annotations must quote an anchor and label already in the narration.
 for(const g of Array.isArray(slide.graphics)?slide.graphics:[]){const label=String(g?.label||'').trim(),anchor=String(g?.anchor||label).trim();if(label&&label.length<=36&&anchor.length<=100&&text.includes(norm(label))&&text.includes(norm(anchor))){annotations.push({label,icon:icons[g.icon]?g.icon:'marker',at:Math.max(0,norm(narration).indexOf(norm(anchor)))/Math.max(1,text.length)});}if(annotations.length===4)break;}
 if(!annotations.length)for(const [icon,,re] of lexicon){const match=re.exec(text);if(match){const original=tokens.find(w=>re.test(norm(w)));if(original)annotations.push({icon,label:original.replace(/^[،؛:؟.!«»]+|[،؛:؟.!«»]+$/g,''),at:match.index/Math.max(1,text.length)});}if(annotations.length===4)break;}
 annotations.sort((a,b)=>a.at-b.at);
 const phrases=[];let cursor=0;for(let i=0;i<tokens.length;){const start=i;let n=0;while(i<tokens.length&&n<6){const w=tokens[i++];n++;if(n>=3&&/[.؟!؛،:]$/.test(w))break;}const phrase=tokens.slice(start,i),weight=phrase.join(' ').length;phrases.push({words:phrase,start:cursor,weight});cursor+=weight;}
 for(const p of phrases){p.start/=Math.max(1,cursor);p.span=p.weight/Math.max(1,cursor);}
 let title=String(slide.title||slide.header||'').trim();if(/^(?:الخاتمة|المقدمة|المشهد\s*\d*|الرمز\s*(?:سين|صاد|لام|س|ص|ل))$/.test(title))title=String(slide.subtitle||slide.caption||narration).replace(/^[^:]{1,8}:\s*/,'').split(/\s+/).slice(0,7).join(' ');
 const details=(slide.visualType==='data'?(slide.points||[]):[]).filter(x=>typeof x==='string'&&x.trim()).slice(0,4);
 const result={title,narration,tokens,phrases,annotations,details};cache.set(slide,{key,plan:result});return result;
}
function lines(ctx,text,width){const out=[];let line='';for(const word of words(text)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>width){out.push(line);line=word;}else line=next;}if(line)out.push(line);return out;}
function fit(ctx,text,width,maxLines,size,min=16,family='Cairo'){let out;do{ctx.font=`700 ${size}px ${family}, Arial`;out=lines(ctx,text,width);if(out.length<=maxLines)break;size--;}while(size>min);return {lines:out,size};}
function icon(ctx,name,x,y,size,progress=1){if(!root.Path2D)return;let path=paths.get(name);if(!path){path=new root.Path2D(icons[name]||icons.marker);paths.set(name,path);}ctx.save();ctx.translate(x,y);ctx.scale(size/30,size/30);ctx.strokeStyle='#fff';ctx.lineWidth=1.9;ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash([150]);ctx.lineDashOffset=150*(1-clamp(progress));ctx.stroke(path);ctx.restore();}
function panel(ctx,x,y,w,h,alpha=.88){ctx.fillStyle=`rgba(7,20,38,${alpha})`;ctx.fillRect(x,y,w,h);ctx.fillStyle='#e31217';ctx.fillRect(x+w-4,y,4,h);}

/* Explicit, opt-in creative overlays. Never infer statistics or evidence. */

function parseCreativeCommand(command){
 const text=String(command||'').trim().replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/٫/g,'.');
 // A deliberately bounded local command grammar; other requests still use the normal planner.
 let m=text.match(/^(?:أزل|ازل|احذف) القالب من المشهد (\d+)\s*[.!؟]?$/);
 if(m)return {sceneIndex:Number(m[1])-1,creative:null};
 m=text.match(/^اقتباس للمشهد (\d+):?\s*"([^"]{1,180})"\s+المصدر\s+"([^"]{1,100})"\s*$/);
 if(m)return {sceneIndex:Number(m[1])-1,creative:{kind:'quote',text:m[2],source:m[3]}};
 m=text.match(/^مقارنة للمشهد (\d+):?\s*"([^"]{1,30})"\s+([0-9]+(?:\.[0-9]+)?)\s+و\s*"([^"]{1,30})"\s+([0-9]+(?:\.[0-9]+)?)\s+الوحدة\s+"([^"]{1,24})"\s+المصدر\s+"([^"]{1,100})"\s*$/);
 if(m)return {sceneIndex:Number(m[1])-1,creative:{kind:'comparison',items:[{label:m[2],value:Number(m[3])},{label:m[4],value:Number(m[5])}],unit:m[6],source:m[7]}};
 if(/^(?:اقتباس للمشهد|مقارنة للمشهد|(?:أزل|ازل|احذف) القالب من المشهد)/.test(text))throw Error('صيغة الأمر الإبداعي غير مكتملة؛ استخدم المثال في بطاقة إخراج المشهد.');
 return null;
}

function creativePlan(slide){
 const c=slide&&slide.creative;
 if(!c||typeof c!=='object')return null;
 const short=(v,n)=>typeof v==='string'&&v.trim().length<=n?v.trim():'';
 const source=short(c.source,100);
 if(c.kind==='quote'){
  const text=short(c.text,180);
  // A quoted passage must occur literally in narration; attribution is supplied by the editor.
  if(!text||!source||!norm(slide.voiceover).includes(norm(text)))return null;
  return {kind:'quote',text,source};
 }
 if(c.kind==='comparison'){
  const unit=short(c.unit,24),items=Array.isArray(c.items)?c.items:[];
  if(!source||!unit||items.length<2||items.length>4)return null;
  const clean=items.map(item=>({label:short(item?.label,30),value:item?.value}));
  if(clean.some(item=>!item.label||typeof item.value!=='number'||!Number.isFinite(item.value)||item.value<0||item.value>1e15))return null;
  // Only editor-entered values; no parsing prose into statistics. Shared zero baseline.
  return {kind:'comparison',source,unit,items:clean};
 }
 if(c.kind==='document-focus'&&slide.visualType==='document'){
  const r=c.rect;
  if(!source||!r||!['x','y','width','height'].every(k=>typeof r[k]==='number'&&Number.isFinite(r[k])))return null;
  if(r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>1||r.y+r.height>1)return null;
  // Coordinates refer to the final canvas, after the editor has checked the document framing.
  return {kind:'document-focus',source,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};
 }
 return null;
}
function creativeText(ctx,text,x,y,w,h,size,color='#fff',family='Cairo'){
 const box=fit(ctx,text,w,3,size,12,family),lineH=box.size*1.4;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.textAlign='right';ctx.fillStyle=color;
 ctx.font=`700 ${box.size}px ${family}, Arial`;
 box.lines.forEach((line,i)=>ctx.fillText(line,x+w,y+box.size+i*lineH));ctx.restore();
}
function drawCreative(ctx,c,{W,H,S,M,time,duration,alpha,design}){
 const e=design&&root.StudioDesignPack?root.StudioDesignPack.ease(design,time/.6):ease(time/.45),cw=W-2*M,family=root.StudioDesignPack?.font({design})||'Cairo';
 ctx.save();ctx.globalAlpha=alpha*e;ctx.direction='rtl';ctx.textAlign='right';
 if(c.kind==='document-focus'){
  const r=c.rect,x=r.x*W,y=r.y*H,w=r.width*W,h=r.height*H;
  ctx.fillStyle='rgba(227,18,23,.16)';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='#ff6570';ctx.lineWidth=Math.max(2,S*.004);if(!root.StudioDesignPack?.documentMark(ctx,{x,y,w,h},design))ctx.strokeRect(x,y,w,h);
  panel(ctx,M,H*.18,cw,H*.07,.92);
  creativeText(ctx,'المصدر: '+c.source,M+S*.02,H*.19,cw-S*.04,H*.05,Math.round(S*.027),'#fff',family);
 }else{
  const y=H*.18,h=H*.255;panel(ctx,M,y,cw,h,.94);
  if(c.kind==='quote'){
   ctx.fillStyle='#ff6570';ctx.font=`900 ${Math.round(S*.075)}px ${family}, Arial`;ctx.fillText('«',W-M-S*.025,y+H*.06);
   creativeText(ctx,c.text,M+S*.035,y+H*.055,cw-S*.10,H*.13,Math.round(S*.036),'#fff',family);
   creativeText(ctx,'المصدر: '+c.source,M+S*.025,y+H*.202,cw-S*.05,H*.045,Math.round(S*.025),'#ffb4b9',family);
  }else{
   const max=Math.max(1,...c.items.map(item=>item.value)),rowH=H*.046;
   c.items.forEach((item,i)=>{
    const yy=y+H*.015+i*rowH,bw=cw*.49,xx=M+S*.025;
    creativeText(ctx,item.label,W-M-cw*.43,yy,cw*.40,rowH*.55,Math.round(S*.025),'#fff',family);
    ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(xx,yy+rowH*.52,bw,rowH*.22);
    ctx.fillStyle='#e31217';ctx.fillRect(xx+bw-bw*(item.value/max)*e,yy+rowH*.52,bw*(item.value/max)*e,rowH*.22);
    creativeText(ctx,String(item.value)+' '+c.unit,xx,yy,bw,rowH*.53,Math.round(S*.023),'#fff',family);
   });
   creativeText(ctx,'المصدر: '+c.source,M+S*.025,y+H*.207,cw-S*.05,H*.04,Math.round(S*.024),'#ffb4b9',family);
  }
 }
 ctx.restore();
}

// Explicit scene opt-in: loading an older project keeps its original composition.
function kineticLayout(W,H,time,design){
 const E=x=>design&&root.StudioDesignPack?root.StudioDesignPack.ease(design,x):ease(x),S=Math.min(W,H*.85),enter=E(time/.65),dock=E((time-1.8)/.7);
 return {S,enter,dock,M:S*.065,titleSize:S*(.092-.048*dock),titleY:H*(.43-.28*dock)+(1-enter)*H*.06,titleX:W-S*.065+(1-enter)*S*.22};
}
function kineticText(ctx,text,x,y,w,h,size,color='#fff',family='Cairo'){
 let box;do{box=fit(ctx,text,w,3,size,12,family);size=box.size-1;}while(box.lines.length*box.size*1.4>h&&size>=12);
 ctx.save();ctx.font=`700 ${box.size}px ${family}, Arial`;ctx.textAlign='right';ctx.fillStyle=color;
 box.lines.forEach((line,i)=>ctx.fillText(line,x+w,y+box.size+i*box.size*1.4));ctx.restore();
}
function drawKinetic(ctx,slide,{width:W,height:H,time=0,duration=1}){
 const alpha=Number.isFinite(ctx.globalAlpha)?ctx.globalAlpha:1,t=clamp(time,0,Math.max(.01,duration)),q=t/Math.max(.01,duration),p=plan(slide),c=creativePlan(slide),L=kineticLayout(W,H,p.details.length?t+2.5:t,slide.design),{S,M}=L,cw=W-2*M,family=root.StudioDesignPack?.font(slide)||'Cairo';
 ctx.save();ctx.direction='rtl';ctx.textAlign='right';
 // Large opening typography becomes a compact heading, leaving the footage visible.
 const f=fit(ctx,p.title,cw,3,Math.round(L.titleSize),18,family),lh=f.size*1.35;
 ctx.save();ctx.globalAlpha=c?0:alpha*L.enter;
 ctx.fillStyle='rgba(7,20,38,.65)';ctx.fillRect(M,L.titleY-f.size,cw,lh*f.lines.length+S*.035);
 ctx.font=`900 ${f.size}px ${family}, Arial`;
 f.lines.forEach((line,i)=>{ctx.fillStyle=i===f.lines.length-1?'#ff6570':'#fff';ctx.fillText(line,L.titleX,L.titleY+i*lh);});
 ctx.fillStyle='#e31217';ctx.fillRect(W-M-cw*.28*L.enter,L.titleY+(f.lines.length-1)*lh+S*.025,cw*.28*L.enter,S*.008);ctx.restore();
 // Bring the source-backed quote into the centre, rather than stacking two title panels.
 if(c?.kind==='quote'){
  const a=ease((t-.65)/.55);ctx.save();ctx.globalAlpha=alpha*a;
  ctx.fillStyle='rgba(7,20,38,.9)';ctx.fillRect(M,H*.30,cw,H*.29);
  ctx.fillStyle='#e31217';ctx.font=`900 ${Math.round(S*.16)}px ${family}, Arial`;ctx.fillText('«',W-M-S*.025,H*.39);
  kineticText(ctx,c.text,M+S*.04,H*.39,cw-S*.08,H*.13,Math.round(S*.067),'#fff',family);
  kineticText(ctx,'المصدر: '+c.source,M+S*.04,H*.54,cw-S*.08,H*.045,Math.round(S*.026),'#cbd5e1',family);ctx.restore();
 }else if(c){drawCreative(ctx,c,{W,H,S,M,time:t,duration,alpha,design:slide.design});}
 else if(p.details.length){
  p.details.slice(0,3).forEach((text,i)=>{const a=ease((t-1-i*.3)/.5);if(!a)return;const y=H*.42+i*H*.075;
   ctx.save();ctx.globalAlpha=alpha*a;ctx.fillStyle='rgba(7,20,38,.88)';ctx.fillRect(M+(1-a)*S*.09,y,cw,H*.068);
   ctx.fillStyle='#e31217';ctx.fillRect(W-M-S*.012,y,S*.012,H*.068);kineticText(ctx,text,M+S*.025,y+H*.006,cw-S*.06,H*.06,Math.round(S*.036),'#fff',family);ctx.restore();
  });
 }
 const fallback=p.annotations.filter(a=>q>=Math.max(0,a.at-.05)).at(-1),explicit=root.StudioDesignPack?.selectedCue(slide,q,null),cue=explicit||(!c&&fallback);
 if(cue&&!root.StudioDesignPack?.drawCue(ctx,slide,cue,{W,H,S,M,time:t,duration,alpha})){const a=ease((q-Math.max(0,cue.at-.05))*duration/.35);ctx.save();ctx.globalAlpha=alpha*a;icon(ctx,cue.icon,W-M-S*.065,H*.68,S*.05,a);ctx.font=`700 ${Math.round(S*.03)}px ${family}, Arial`;ctx.fillStyle='#fff';ctx.fillText(cue.label,W-M-S*.09,H*.715);ctx.restore();}
 // Preserve every narration word; timing remains estimated within the aligned scene.
 const phrase=p.phrases.find((a,i)=>q>=a.start&&(q<a.start+a.span||i===p.phrases.length-1));
 if(phrase){const text=phrase.words.join(' '),f=fit(ctx,text,cw-S*.07,2,Math.round(S*.052),16,family),h=f.lines.length*f.size*1.5+S*.05,age=(q-phrase.start)*duration,a=ease(age/.18),y=H*.83-h/2+(1-a)*S*.025;
  ctx.save();ctx.globalAlpha=alpha*(.45+.55*a);ctx.fillStyle='rgba(7,20,38,.93)';ctx.fillRect(M,y,cw,h);ctx.font=`700 ${f.size}px ${family}, Arial`;
  const highlight=Math.min(phrase.words.length-1,Math.floor(clamp((q-phrase.start)/phrase.span)*phrase.words.length));let k=0;
  for(let row=0;row<f.lines.length;row++){let x=W-M-S*.035;for(const word of words(f.lines[row])){const width=ctx.measureText(word).width,baseline=y+S*.025+f.size+row*f.size*1.5;if(k===highlight){ctx.fillStyle='#b10d18';ctx.fillRect(x-width-S*.005,baseline-f.size*1.05,width+S*.01,f.size*1.35);}ctx.fillStyle='#fff';ctx.fillText(word,x,baseline);x-=ctx.measureText(word+' ').width;k++;}}
  ctx.restore();
 }
 // A restrained progress accent keeps static evidence scenes advancing in the capture stream.
 ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(M,H*.935,cw,2);ctx.fillStyle='#e31217';ctx.fillRect(W-M-cw*q,H*.935,cw*q,2);
 ctx.restore();
}
function draw(ctx,slide,{width:W,height:H,time=0,duration=1}){
 if(slide.typography==='kinetic')return drawKinetic(ctx,slide,{width:W,height:H,time,duration});
 const baseAlpha=Number.isFinite(ctx.globalAlpha)?ctx.globalAlpha:1,S=Math.min(W,H*.85),p=plan(slide),creative=creativePlan(slide),t=clamp(Number(time)||0,0,Math.max(.01,duration)),q=t/Math.max(.01,duration),M=S*.06,contentW=W-2*M;
 ctx.save();ctx.direction='rtl';ctx.textAlign='right';
 // A stable, short title enters once; subtitles and subject cues have separate lanes.
 const title=fit(ctx,p.title,contentW-S*.04,2,Math.round(S*.057));const enter=ease(t/.45),titleY=H*.48+(1-enter)*H*.025;
 ctx.globalAlpha=baseAlpha*enter;panel(ctx,M,titleY-title.size,contentW,title.lines.length*title.size*1.45+S*.03,.76);ctx.fillStyle='#fff';ctx.font=`900 ${title.size}px Cairo, Arial`;title.lines.forEach((l,i)=>ctx.fillText(l,W-M-S*.025,titleY+i*title.size*1.45));ctx.globalAlpha=baseAlpha;
 if(creative)drawCreative(ctx,creative,{W,H,S,M,time:t,duration,alpha:baseAlpha});
 const active=!creative&&p.annotations.filter(a=>q>=Math.max(0,a.at-.05)).at(-1);if(active){const age=(q-Math.max(0,active.at-.05))*duration,appear=ease(age/.35);ctx.save();ctx.globalAlpha=baseAlpha*appear;const w=Math.min(contentW,S*.68),x=W-M-w,y=H*.19+(1-appear)*H*.015;panel(ctx,x,y,w,S*.105);icon(ctx,active.icon,x+w-S*.09,y+S*.022,S*.06,appear);const f=fit(ctx,active.label,w-S*.14,1,Math.round(S*.033));ctx.fillStyle='#fff';ctx.font=`700 ${f.size}px Cairo, Arial`;ctx.fillText(f.lines[0]||'',x+w-S*.12,y+S*.068);ctx.restore();}
 // A neutral concept map: connectors indicate topics in this explanation, not proven financial links.
 const nodes=p.annotations.slice(0,3);if(!creative&&nodes.length>=2){const gap=S*.018,nw=(contentW-gap*(nodes.length-1))/nodes.length,ny=H*.30,nh=H*.13;for(let i=0;i<nodes.length;i++){const a=nodes[i],x=W-M-(i+1)*nw-i*gap,reveal=ease((q-Math.max(0,a.at-.05))*duration/.4);ctx.save();ctx.globalAlpha=baseAlpha*(.25+.75*reveal);panel(ctx,x,ny,nw,nh,.8);icon(ctx,a.icon,x+nw/2-S*.025,ny+nh*.12,S*.05,reveal);const label=fit(ctx,a.label,nw-S*.035,2,Math.round(S*.027));ctx.font=`700 ${label.size}px Cairo, Arial`;ctx.fillStyle='#fff';ctx.textAlign='center';label.lines.forEach((l,j)=>ctx.fillText(l,x+nw/2,ny+nh*.68+j*label.size*1.3));ctx.restore();}}
 // Source numbers remain literal; this is a card sequence, never an invented statistical chart.
 const detailStart=H*.59;if(!creative&&p.details.length){const n=Math.max(1,Math.min(2,p.details.length)),gap=S*.018,w=(contentW-gap*(n-1))/n;for(let i=0;i<p.details.length;i++){const show=ease((q-i*.12)*5);if(!show)continue;const col=i%n,row=Math.floor(i/n),x=W-M-(col+1)*w-col*gap,y=detailStart+row*H*.075;ctx.save();ctx.globalAlpha=baseAlpha*show;panel(ctx,x,y,w,H*.065);const f=fit(ctx,p.details[i],w-S*.04,2,Math.round(S*.03),12);ctx.font=`700 ${f.size}px Cairo, Arial`;ctx.fillStyle='#fff';f.lines.forEach((l,j)=>ctx.fillText(l,x+w-S*.02,y+H*.024+j*f.size*1.35));ctx.restore();}}
 const phrase=p.phrases.find((a,i)=>q>=a.start&&(q<a.start+a.span||i===p.phrases.length-1));if(phrase){const text=phrase.words.join(' '),f=fit(ctx,text,contentW-S*.06,2,Math.round(S*.043)),h=f.lines.length*f.size*1.5+S*.04,y=H*.84-h/2;panel(ctx,M,y,contentW,h,.93);ctx.font=`700 ${f.size}px Cairo, Arial`;const phase=clamp((q-phrase.start)/phrase.span),highlight=Math.min(phrase.words.length-1,Math.floor(phase*phrase.words.length));let k=0;for(let row=0;row<f.lines.length;row++){let x=W-M-S*.03;for(const word of words(f.lines[row])){ctx.fillStyle=k===highlight?'#ff6570':'#fff';ctx.fillText(word,x,y+S*.02+f.size+row*f.size*1.5);x-=ctx.measureText(word+' ').width;k++;}}}
 ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(M,H*.935,contentW,3);ctx.fillStyle='#e31217';ctx.fillRect(W-M-contentW*q,H*.935,contentW*q,3);ctx.restore();
}
root.StudioMotion={plan,draw,creativePlan,parseCreativeCommand,kineticLayout,icons:Object.keys(icons)};
})(typeof window==='undefined'?globalThis:window);
