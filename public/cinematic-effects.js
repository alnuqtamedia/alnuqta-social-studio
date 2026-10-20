/* Original lightweight Canvas effects. No providers, downloads, or audio changes. */
(function(root){
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const motionNames=['static','zoom-in','zoom-out','pan-left','pan-right'];
const lookNames=['natural','cinematic','documentary','mono'];
const transitionNames=['cut','fade','dip-black','wipe-left','wipe-right'];
function settings(slide){
 const c=slide?.cinema;if(!c||typeof c!=='object'||Array.isArray(c))return null;
 if(!motionNames.includes(c.motion)||!lookNames.includes(c.look)||typeof c.intensity!=='number'||!Number.isFinite(c.intensity)||c.intensity<0||c.intensity>1||typeof c.vignette!=='number'||!Number.isFinite(c.vignette)||c.vignette<0||c.vignette>.35||typeof c.grain!=='boolean')return null;
 // Evidence remains ungraded and unshifted; focus coordinates refer to the final frame.
 if(slide.visualType==='document'||slide.creative?.kind==='document-focus')return {motion:'static',look:'natural',intensity:0,vignette:0,grain:false};
 return {motion:c.motion,look:c.look,intensity:c.intensity,vignette:c.vignette,grain:c.grain};
}
function geometry(w,h,W,H,motion,time,duration){
 if(![w,h,W,H].every(n=>Number.isFinite(n)&&n>0))return null;
 const p=clamp(Number.isFinite(time)&&Number.isFinite(duration)&&duration>0?time/duration:0),q=p*p*(3-2*p);
 const zoom=motion==='zoom-in'?1+.08*q:motion==='zoom-out'?1.08-.08*q:/^pan-/.test(motion)?1.08:1;
 const z=Math.max(W/w,H/h)*zoom,dw=w*z,dh=h*z;
 let x=(W-dw)/2;
 if(motion==='pan-left')x=(W-dw)*q;
 if(motion==='pan-right')x=(W-dw)*(1-q);
 return {x,y:(H-dh)/2,width:dw,height:dh};
}
function colorFilter(c){
 const a=c.intensity;
 if(c.look==='cinematic')return `contrast(${1+.12*a}) saturate(${1-.12*a}) sepia(${.08*a})`;
 if(c.look==='documentary')return `contrast(${1+.06*a}) saturate(${1-.06*a})`;
 if(c.look==='mono')return `grayscale(${a}) contrast(${1+.08*a})`;
 return 'none';
}
const gradedImages=new WeakMap();
function gradedImage(element,c){
 // Cache grading for still images: repeating Canvas filters at 30fps is costly on older CPUs.
 if(!element.naturalWidth||element.videoWidth||!root.document||c.look==='natural'||c.intensity===0)return null;
 const key=c.look+':'+c.intensity+':'+element.naturalWidth+':'+element.naturalHeight;
 const existing=gradedImages.get(element);if(existing?.key===key)return existing.canvas;
 const canvas=root.document.createElement('canvas'),scale=Math.min(1,1920/Math.max(element.naturalWidth,element.naturalHeight));
 canvas.width=Math.max(1,Math.round(element.naturalWidth*scale));canvas.height=Math.max(1,Math.round(element.naturalHeight*scale));
 const context=canvas.getContext('2d');if(!context||!('filter' in context))return null;
 context.filter=colorFilter(c);context.drawImage(element,0,0,canvas.width,canvas.height);
 gradedImages.set(element,{key,canvas});return canvas;
}
function drawMedia(ctx,element,slide,W,H,time,duration){
 const c=settings(slide);if(!c)return false;
 const r=geometry(element.videoWidth||element.naturalWidth||element.width,element.videoHeight||element.naturalHeight||element.height,W,H,c.motion,time,duration);if(!r)return false;
 const graded=gradedImage(element,c);
 ctx.save();try{ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();if('filter' in ctx)ctx.filter=graded?'none':colorFilter(c);ctx.drawImage(graded||element,r.x,r.y,r.width,r.height);}finally{ctx.restore();}
 return true;
}
let tile=null;const patterns=new WeakMap();
function grainPattern(ctx){
 if(patterns.has(ctx))return patterns.get(ctx);
 if(!root.document||!ctx.createPattern)return null;
 if(!tile){tile=root.document.createElement('canvas');tile.width=tile.height=96;const x=tile.getContext('2d'),pixels=x.createImageData(96,96);let seed=48271;
  for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=seed>>>24;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}x.putImageData(pixels,0,0);
 }
 const pattern=ctx.createPattern(tile,'repeat');patterns.set(ctx,pattern);return pattern;
}
function drawFinish(ctx,slide,W,H,time){
 const c=settings(slide);if(!c)return;
 ctx.save();try{
  if(c.vignette>0){const gradient=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.15,W/2,H/2,Math.hypot(W,H)/2);gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(1,`rgba(0,0,0,${c.vignette})`);ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);}
  if(c.grain&&c.intensity>0){const pattern=grainPattern(ctx);if(pattern){const offset=(Math.floor(Math.max(0,Number(time)||0)*12)*17)%96;ctx.globalAlpha*=.045*c.intensity;ctx.fillStyle=pattern;ctx.translate(-offset,-offset);ctx.fillRect(0,0,W+96,H+96);}}
 }finally{ctx.restore();}
}
function transition(ctx,current,previous,{type='fade',progress=1,width:W,height:H}){
 const p=clamp(Number.isFinite(progress)?progress:1);
 if(!previous||type==='cut'||p>=1){current();return;}
 if(p<=0){previous();return;}
 if(type==='dip-black'){
  (p<.5?previous:current)();ctx.save();try{ctx.globalAlpha*=p<.5?p*2:(1-p)*2;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);}finally{ctx.restore();}return;
 }
 if(type==='wipe-left'||type==='wipe-right'){
  previous();ctx.save();try{ctx.beginPath();ctx.rect(type==='wipe-left'?W*(1-p):0,0,W*p,H);ctx.clip();current();}finally{ctx.restore();}return;
 }
 current();ctx.save();try{ctx.globalAlpha*=1-p;previous();}finally{ctx.restore();}
}
function transitionFor(slide,duration){
 const c=slide?.cinema,valid=settings(slide),explicit=valid&&transitionNames.includes(c.transition);
 const type=explicit?c.transition:slide?.transition==='cut'?'cut':'fade';
 const seconds=explicit&&Number.isFinite(c.transitionSeconds)?clamp(c.transitionSeconds,.1,1):.25;
 return {type,seconds:type==='cut'?0:Math.min(seconds,Math.max(0,duration)*(explicit ? .25 : .1))};
}
function normalize(slide){
 const c=settings(slide);if(!c)return null;
 const t=transitionFor(slide,30);return {...c,transition:t.type,transitionSeconds:t.seconds||.25};
}
function parseCommand(command){
 const text=String(command||'').trim().replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
 let m=text.match(/^(?:أزل|ازل|احذف) السينما من المشهد (\d+)\s*[.!؟]?$/);
 if(m)return {sceneIndex:Number(m[1])-1,cinema:null};
 m=text.match(/^سينما للمشهد (\d+):?\s*(طبيعي|سينمائي|وثائقي|أبيض وأسود|ابيض واسود)\s+حركة\s+(ثابتة|تقريب|ابتعاد|يسار|يمين)\s+انتقال\s+(قطع|مزج|سواد|مسح يسار|مسح يمين)\s*$/);
 if(m)return {sceneIndex:Number(m[1])-1,cinema:{look:({'طبيعي':'natural','سينمائي':'cinematic','وثائقي':'documentary','أبيض وأسود':'mono','ابيض واسود':'mono'})[m[2]],motion:({'ثابتة':'static','تقريب':'zoom-in','ابتعاد':'zoom-out','يسار':'pan-left','يمين':'pan-right'})[m[3]],transition:({'قطع':'cut','مزج':'fade','سواد':'dip-black','مسح يسار':'wipe-left','مسح يمين':'wipe-right'})[m[4]],intensity:.5,vignette:0,grain:false,transitionSeconds:.4}};
 if(/^(?:سينما للمشهد|(?:أزل|ازل|احذف) السينما من المشهد)/.test(text))throw Error('صيغة أمر السينما غير مكتملة؛ راجع المثال في إعدادات السينما.');
 return null;
}
root.StudioCinema={settings,normalize,geometry,colorFilter,drawMedia,drawFinish,transition,transitionFor,parseCommand};
})(typeof window==='undefined'?globalThis:window);
