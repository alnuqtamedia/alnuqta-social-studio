/* Original Alnuqta vector compositions, animated with the MIT Lottie player.
 * No generated statistics, geographic claims, external media or event reconstruction. */
(function(root){
'use strict';
const cache=new Map(),names={traffic:'شارع وسيارات متحركة',transit:'نقل جماعي ومساحة الطريق',finance:'دورة اقتصادية متحركة',market:'سوق وحركة منتجات',industry:'مصنع وخط إنتاج',environment:'مدينة وبيئة',explainer:'مخطط توضيحي متحرك'};
function select(s){
 const t=[s.title,s.subtitle,s.voiceover,s.visualQuery].join(' ');
 if(/حافل|نقل عام|مواصلات|مشاة|مواقف|\bbus|public transport/i.test(t))return 'transit';
 if(/سيار|ازدحام|زحام|مرور|محرك|\btraffic|\bcars?\b/i.test(t))return 'traffic';
 if(/مصنع|صناع|إنتاج|انتاج|factory|industr/i.test(t))return 'industry';
 if(/سوق|تجار|منتج|متجر|market|shop/i.test(t))return 'market';
 if(/بيئ|تلوث|مناخ|طاقة|environment|climate/i.test(t))return 'environment';
 if(/اقتصاد|راتب|مال|قرض|أسعار|اسعار|أرباح|ارباح|دولار|دينار|finance|budget|money/i.test(t))return 'finance';
 return 'explainer';
}
function eligible(s){if(s.visualType==='data'&&Array.isArray(s.points)&&s.points.length)return false;return !['document','portrait'].includes(s.visualType)&&!['document-focus','quote','comparison'].includes(s.creative?.kind)&&Boolean(String(s.voiceover||'').trim());}
function prepare(s){if(!eligible(s))return false;s.illustration={version:1,preset:select(s)};s.productionVisual={kind:'illustration',ready:true};s.productionMediaReview={status:'local',note:names[s.illustration.preset]+'؛ رسم توضيحي وليس تصويراً للموقع أو الحدث.'};s.typography='kinetic';return true;}
const prop=k=>({a:0,k}),color=hex=>[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255,1];
function rect(x,y,w,h,fill,r=8){return {ty:'gr',it:[{ty:'rc',p:prop([x,y]),s:prop([w,h]),r:prop(r)},{ty:'fl',c:prop(color(fill)),o:prop(100),r:1},{ty:'tr',p:prop([0,0]),a:prop([0,0]),s:prop([100,100]),r:prop(0),o:prop(100),sk:prop(0),sa:prop(0)}]};}
function circle(x,y,d,fill){const g=rect(x,y,d,d,fill);g.it[0]={ty:'el',p:prop([x,y]),s:prop([d,d])};return g;}
function layer(id,shapes,from=[0,0],to=from){return {ddd:0,ind:id,ty:4,nm:'Alnuqta vector '+id,sr:1,ks:{o:prop(100),r:prop(0),p:{a:1,k:[{t:0,s:from,e:to,i:{x:.67,y:1},o:{x:.33,y:0}},{t:180,s:to}]},a:prop([0,0]),s:prop([100,100])},ao:0,shapes,ip:0,op:181,st:0,bm:0};}
function vehicle(x,y,bus=false){const w=bus?240:130;return [rect(x,y,w,64,bus?'#E31217':'#e4edf4'),rect(x-10,y-42,w*.62,35,bus?'#e4edf4':'#46718f'),circle(x-w*.3,y+35,28,'#071220'),circle(x+w*.3,y+35,28,'#071220')];}
function data(preset){
 const layers=[],add=(shapes,a,b)=>layers.unshift(layer(layers.length+1,shapes,a,b));
 const skyline=[];for(let i=0;i<10;i++){const h=70+(i*37)%150;skyline.push(rect(i*110+40,270-h/2,76,h,'#18334b',2));for(let j=0;j<3;j++)skyline.push(rect(i*110+40,270-h+25+j*30,28,8,'#35566e',1));}add(skyline);
 if(['traffic','transit'].includes(preset)){
  add([rect(500,410,1000,260,'#23384b'),...Array.from({length:9},(_,i)=>rect(i*125+30,410,62,6,'#9aafbc',0))]);
  const count=preset==='traffic'?7:3;
  for(let i=0;i<count;i++)add(vehicle(80+i*146,355,i===1&&preset==='transit'),[-35,0],[preset==='traffic'?12:180,0]);
  for(let i=0;i<5;i++)add(vehicle(70+i*205,480),[60,0],[-70,0]);
  if(preset==='transit')for(let i=0;i<5;i++)add([circle(80+i*65,585,20,'#e4edf4'),rect(80+i*65,618,18,42,'#E31217')],[0,0],[50,0]);
 }else if(preset==='market'){
  for(let i=0;i<3;i++)add([rect(190+i*305,420,250,240,'#29465c'),rect(190+i*305,305,275,55,'#E31217'),...Array.from({length:4},(_,j)=>rect(110+i*305+j*52,465,38,55,'#d9e3e9'))],[0,18],[0,-12]);
 }else if(preset==='industry'){
  add([rect(500,440,780,190,'#29465c'),rect(260,285,66,190,'#34576f'),rect(740,270,66,220,'#34576f'),rect(500,555,900,35,'#7e99ad')]);
  for(let i=0;i<6;i++)add([rect(100+i*160,515,65,55,'#E31217')],[-60,0],[80,0]);
  for(let i=0;i<3;i++)add([circle(270+i*220,260,35,'#6b8798')],[0,0],[20,-80]);
 }else if(preset==='environment'){
  add([circle(800,230,90,'#f6ca65'),rect(500,580,1000,80,'#2c655e')]);
  for(let i=0;i<5;i++)add([rect(110+i*190,500,18,130,'#8c6d51'),circle(110+i*190,390,130,'#3a8873')],[0,9],[0,-7]);
 }else{
  // A process diagram rather than unverified statistical bars.
  add([rect(500,430,720,9,'#456b83',1)]);
  for(let i=0;i<3;i++){const x=180+i*320;add([circle(x,430,180,i===1?'#E31217':'#294b65'),rect(x,430,80,55,'#e4edf4'),rect(x,430,40,13,'#294b65')],[0,20],[0,-18]);}
  for(let i=0;i<3;i++)add([circle(200+i*260,430,16,'#f6ca65')],[-70,0],[140,0]);
 }
 return {v:'5.12.2',fr:30,ip:0,op:181,w:1000,h:700,nm:'Alnuqta '+preset,ddd:0,assets:[],layers};
}
function load(){if(!root.lottie)throw Error('لم يُحمّل محرك الجرافيك');return true;}
function draw(ctx,s,W,H,time){
 const preset=s.illustration?.preset;if(!names[preset])return false;load();const w=Math.round(Math.min(W*.94,H*.60)),h=Math.round(w*.7),key=preset+':'+w;
 let entry=cache.get(key);if(!entry){if(cache.size>=16){const [old,item]=cache.entries().next().value;item.anim.destroy();cache.delete(old);}const canvas=root.document.createElement('canvas');canvas.width=w;canvas.height=h;const context=canvas.getContext('2d');const anim=root.lottie.loadAnimation({renderer:'canvas',loop:false,autoplay:false,animationData:data(preset),rendererSettings:{context,clearCanvas:true,preserveAspectRatio:'xMidYMid meet'}});entry={canvas,anim};cache.set(key,entry);}
 entry.anim.goToAndStop((Math.max(0,time)*30)%180,true);
 const y=H*.31;ctx.save();ctx.drawImage(entry.canvas,(W-w)/2,y,w,h);ctx.direction='rtl';ctx.textAlign='right';ctx.fillStyle='#adc5d7';ctx.font=`600 ${Math.max(13,Math.round(Math.min(W,H)*.022))}px StudioCairo, Arial`;ctx.fillText('رسم توضيحي',W*.94,y+h+H*.025);ctx.restore();return true;
}
async function warm(slides,W,H,signal){const c=root.document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');for(const s of slides)if(s.illustration)draw(x,s,W,H,0);const start=Date.now();while([...cache.values()].some(v=>!v.anim.isLoaded)){if(signal?.aborted)throw Error('أُلغي تحميل الجرافيك');if(Date.now()-start>5000)throw Error('تعذر تجهيز المشاهد الرسومية');await new Promise(r=>setTimeout(r,20));}}
root.StudioIllustration={names,select,eligible,prepare,data,draw,load,warm,cache};
})(typeof window==='undefined'?globalThis:window);
