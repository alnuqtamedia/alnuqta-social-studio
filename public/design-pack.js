/* Local, pinned open-source graphic resources. No AI requests or remote media. */
(function(root){
'use strict';
const pack='press-v1',presets={editorial:'صحفي',finance:'اقتصادي',investigation:'استقصائي',minimal:'بسيط'},clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const state={ready:false,loading:null,icons:Object.create(null),paths:new Map(),rough:new Map(),charts:new Map(),catalog:[]};
const aliases={document:'file-text',factory:'building-factory-2',box:'package',perfume:'bottle',phone:'device-mobile',person:'user',money:'cash',location:'map-pin',health:'first-aid-kit',education:'school',energy:'bolt',water:'droplet',clock:'clock',search:'search',warning:'alert-triangle',question:'help',marker:'info-circle'};
const searchTags={بنك:'bank cash coin',عمل:'briefcase tools building',دينار:'cash coin currency',مصنع:'factory crane machinery',وثيقة:'file document clipboard',موقع:'map pin compass',اعلام:'news newspaper microphone broadcast camera',رياضة:'ball trophy medal',ثقافة:'book masks palette',عدالة:'scale gavel shield',صحيفة:'news newspaper',فلوس:'cash coin currency',مال:'cash coin currency bank calculator receipt chart',اقتصاد:'cash chart building-bank calculator receipt',وثائق:'file document clipboard folder notes',تحقيق:'search scale fingerprint shield file',طاقة:'bolt battery solar oil gas',تعليم:'school book certificate',صحة:'medical heart first-aid health',بيئة:'leaf tree recycle world',شخص:'user users man woman',اتصال:'phone device message mail',نقل:'car truck plane train ship',زراعة:'plant seedling tractor wheat'};
function normalize(slide){const d=slide?.design;if(!d||d.pack!==pack||!presets[d.preset])return null;const out={pack,preset:d.preset};if(typeof d.icon==='string'&&/^[a-z0-9-]{1,80}$/.test(d.icon)&&typeof d.label==='string'&&d.label.trim()&&d.label.trim().length<=36){out.icon=d.icon;out.label=d.label.trim();}return out;}
function presetFor(text){if(/بسيط|minimal/i.test(text))return 'minimal';return /تحقيق|استقصا|وثيق|وثائق/.test(text)?'investigation':/اقتصاد|مالي|حساب|مبيعات|دينار|أرباح|ارباح|تمويل|تجارة|ضرائب|تضخم|(?:^|\s)(?:ال)?مال(?:\s|$)/.test(text)?'finance':'editorial';}
function script(path,global){if(root[global])return Promise.resolve();return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=new URL(path,document.baseURI).href;el.onload=()=>root[global]?resolve():reject(Error('ملف مكتبة غير صالح'));el.onerror=()=>reject(Error('تعذر تحميل مكتبة الجرافيك'));document.head.appendChild(el);});}
function css(path){return new Promise((resolve,reject)=>{const el=document.createElement('link');el.rel='stylesheet';el.href=new URL(path,document.baseURI).href;el.onload=resolve;el.onerror=()=>reject(Error('تعذر تحميل الخط العربي'));document.head.appendChild(el);});}
async function load(){
 if(state.ready)return;if(state.loading)return state.loading;
 state.loading=(async()=>{
  const [data,catalog]=await Promise.all([
   fetch(new URL('public/vendor/tabler/outline-paths.json',document.baseURI)).then(async r=>{if(!r.ok)throw Error('تعذر تحميل الأيقونات');const text=await r.text();if(text.length>6000000)throw Error('ملف أيقونات كبير');return JSON.parse(text);}),
   fetch(new URL('public/graphics-catalog.json',document.baseURI)).then(r=>{if(!r.ok)throw Error('تعذر تحميل قائمة الجرافيك');return r.json();}),
   script('public/vendor/d3-ease.min.js','d3'),script('public/vendor/rough.js','rough'),script('public/vendor/chart.umd.min.js','Chart'),css('public/vendor/cairo/fonts.css')
  ]);
  for(const [name,d] of Object.entries(data.icons||{}))if(/^[a-z0-9-]{1,80}$/.test(name)&&typeof d==='string'&&d.length<=16000)state.icons[name]=d;
  if(Object.keys(state.icons).length<100)throw Error('مكتبة الأيقونات غير مكتملة');
  if(typeof root.d3?.easeExpOut!=='function'||typeof root.rough?.generator!=='function'||typeof root.Chart!=='function')throw Error('موارد الجرافيك غير مكتملة');
  const faces=await document.fonts.load('700 32px StudioCairo','الجرافيك الصحفي');if(!faces.length)throw Error('الخط العربي المحلي لم يتهيأ');
  state.catalog=Array.isArray(catalog.resources)?catalog.resources:[];state.ready=true;
 })().catch(e=>{state.loading=null;throw e;});return state.loading;
}
function ease(design,time){const t=clamp(time);if(!design||design.pack!==pack||!state.ready)return 1-Math.pow(1-t,3);const fn=design.preset==='finance'?root.d3.easeExpOut:design.preset==='investigation'?root.d3.easeSinInOut:root.d3.easeCubicOut;return clamp(fn(t));}
function font(slide){return normalize(slide)&&state.ready?'StudioCairo':'Cairo';}
function drawIcon(ctx,name,x,y,size,reveal=1){
 if(!state.ready||!root.Path2D)return false;const id=state.icons[name]?name:aliases[name];if(!id||!state.icons[id])return false;
 let path=state.paths.get(id);if(!path){path=new root.Path2D(state.icons[id]);if(state.paths.size>512)state.paths.clear();state.paths.set(id,path);}
 ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);ctx.beginPath();ctx.rect(24*(1-clamp(reveal)),0,24,24);ctx.clip();ctx.strokeStyle='#fff';ctx.lineWidth=1.8;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(path);ctx.restore();return true;
}
function selectedCue(slide,q,fallback){
 const d=normalize(slide),text=String(slide?.voiceover||'');if(!d?.icon||!text.includes(d.label))return fallback;
 const at=text.indexOf(d.label)/Math.max(1,text.length);return q>=Math.max(0,at-.05)?{icon:d.icon,label:d.label,at}:fallback;
}
function drawCue(ctx,slide,cue,{W,H,S,M,time,duration,alpha=1}){
 const d=normalize(slide);if(!d||!state.ready)return false;const q=time/Math.max(.01,duration),p=ease(d,(q-Math.max(0,cue.at-.05))*duration/.45),y=H*.675,h=S*.09,w=Math.min(W-2*M,S*.64),x=W-M-w;
 ctx.save();ctx.globalAlpha=alpha*p;
 if(d.preset!=='minimal'){ctx.fillStyle='rgba(7,20,38,.91)';ctx.fillRect(x,y,w,h);ctx.fillStyle='#e31217';ctx.fillRect(x+w-S*.009,y,S*.009,h);}
 if(d.preset==='finance'){ctx.fillStyle='#b10d18';ctx.fillRect(x+w-S*.088,y+S*.008,S*.07,S*.07);}
 drawIcon(ctx,cue.icon,x+w-S*.08,y+S*.018,S*.05,p);
 let size=Math.round(S*.032);ctx.font=`700 ${size}px StudioCairo, Arial`;while(ctx.measureText(cue.label).width>w-S*.14&&size>12)ctx.font=`700 ${--size}px StudioCairo, Arial`;ctx.direction='rtl';ctx.textAlign='right';ctx.fillStyle='#fff';ctx.fillText(cue.label,x+w-S*.105,y+S*.061);
 if(d.preset==='investigation')roughLine(ctx,x+S*.02,y+h-S*.006,x+w-S*.02,y+h-S*.006);
 ctx.restore();return true;
}
function roughLine(ctx,x1,y1,x2,y2){
 if(!root.rough||!ctx.canvas)return false;const key=[x1,y1,x2,y2].map(x=>x.toFixed(1)).join(':');let drawable=state.rough.get(key);
 if(!drawable){drawable=root.rough.generator().line(x1,y1,x2,y2,{seed:217,roughness:.55,stroke:'#ff6570',strokeWidth:2});if(state.rough.size>80)state.rough.clear();state.rough.set(key,drawable);}
 root.rough.canvas(ctx.canvas).draw(drawable);return true;
}
function documentMark(ctx,rect,design){
 if(design?.pack!==pack||design.preset!=='investigation'||!state.ready||!ctx.canvas)return false;
 const key='r:'+Object.values(rect).map(x=>x.toFixed(1)).join(':');let drawable=state.rough.get(key);
 if(!drawable){drawable=root.rough.generator().rectangle(rect.x,rect.y,rect.w,rect.h,{seed:217,roughness:.6,stroke:'#ff6570',strokeWidth:2});if(state.rough.size>80)state.rough.clear();state.rough.set(key,drawable);}
 root.rough.canvas(ctx.canvas).draw(drawable);return true;
}
// Render once at full, literal values; only the bitmap reveal follows the video clock.
// Never run Chart.js' own animation loop or retain its event listeners during capture.
function comparison(ctx,slide,c,{W,H,S,M,time}){
 const design=normalize(slide);if(!design||!state.ready||typeof root.Chart!=='function'||c?.kind!=='comparison')return false;
 if(!Array.isArray(c.items)||c.items.length<2||c.items.length>4||!c.unit||!c.source||c.items.some(v=>typeof v.value!=='number'||!Number.isFinite(v.value)||v.value<0||v.value>1e15||typeof v.label!=='string'))return false;
 const width=Math.round(W-2*M-S*.04),height=Math.round(H*.165),key=JSON.stringify([width,height,c.items,c.unit]);
 let bitmap=state.charts.get(key);
 if(!bitmap){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const size=Math.max(10,Math.round(S*.022)),left=Math.round(width*.22),right=Math.round(width*.34);
  const labels={id:'studioLiteralValues',afterDatasetsDraw(chart){const g=chart.ctx;g.save();g.direction='ltr';g.textAlign='right';g.textBaseline='middle';g.fillStyle='#fff';
   chart.getDatasetMeta(0).data.forEach((bar,i)=>{const text=String(c.items[i].value);let f=size;g.font=`700 ${f}px StudioCairo, Arial`;while(g.measureText(text).width>left-10&&f>8)g.font=`700 ${--f}px StudioCairo, Arial`;g.fillText(text,chart.chartArea.left-8,bar.y);});g.restore();}};
  let chart;try{
   chart=new root.Chart(canvas,{type:'bar',data:{labels:c.items.map(v=>v.label),datasets:[{data:c.items.map(v=>v.value),backgroundColor:['#e31217','#f65b65','#ba7188','#8da6c4'],borderRadius:3,borderSkipped:false,barPercentage:.58,categoryPercentage:.85}]},plugins:[labels],options:{responsive:false,maintainAspectRatio:false,animation:false,events:[],devicePixelRatio:1,indexAxis:'y',layout:{padding:{left}},plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{beginAtZero:true,min:0,max:Math.max(1,...c.items.map(v=>v.value)),reverse:true,ticks:{display:false,maxTicksLimit:4},grid:{color:'rgba(255,255,255,.12)'},border:{display:false}},y:{position:'right',afterFit(scale){scale.width=right;},ticks:{color:'#fff',font:{family:'StudioCairo',size,weight:'700'},crossAlign:'near',callback(v){const text=this.getLabelForValue(v);if(text.length<=20||W>H)return text;const mid=text.lastIndexOf(' ',20);return mid>0?[text.slice(0,mid),text.slice(mid+1)]:[text.slice(0,20),text.slice(20)];}},grid:{display:false},border:{display:false}}}}});
   bitmap=document.createElement('canvas');bitmap.width=width;bitmap.height=height;bitmap.getContext('2d').drawImage(canvas,0,0);
  }finally{chart?.destroy();canvas.width=canvas.height=0;}
  if(state.charts.size>=3){const oldest=state.charts.keys().next().value,old=state.charts.get(oldest);old.width=old.height=0;state.charts.delete(oldest);}state.charts.set(key,bitmap);
 }
 const x=M+S*.02,y=H*.195,progress=ease(design,time/.8);ctx.save();ctx.beginPath();ctx.rect(x+width*(1-progress),y,width*progress,height);ctx.clip();ctx.drawImage(bitmap,x,y);ctx.restore();return true;
}
function description(slide){const d=normalize(slide);return d?'جرافيك '+presets[d.preset]+' — '+(state.ready?'الموارد محمّلة':'تُحمّل عند المعاينة'):'';}
function sync(slide){const el=document.getElementById('design-preset');if(el)el.value=normalize(slide)?.preset||'';}
function search(query,limit=24){const q=String(query||'').normalize('NFKC').replace(/[أإآ]/g,'ا').trim().toLowerCase(),tags=searchTags[q]?.split(' ')||[q];return Object.keys(state.icons).filter(name=>!q||tags.some(t=>name.includes(t))).slice(0,limit);}
function mount(host,actions){
 const box=document.createElement('details');box.className='text-xs border rounded p-2';
 box.innerHTML='<summary>مكتبة الجرافيك: أيقونات وقوالب ومصادر GitHub</summary><p class="text-gray-400">موارد محلية مفتوحة المصدر. الأيقونات توضيحية؛ لا تثبت هوية أو علاقة مالية.</p><label>الحزمة <select id="design-preset" class="bg-navy p-1"><option value="">العرض الحالي دون الحزمة</option><option value="editorial">صحفي</option><option value="finance">اقتصادي</option><option value="investigation">استقصائي بعلامات قلم</option><option value="minimal">بسيط</option></select></label><p id="design-status" role="status"></p><label>ابحث عن أيقونة <input id="design-search" class="bg-navy p-1" placeholder="مال، وثائق، طاقة، تعليم…"></label><div id="design-icons" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px"></div><div><button id="design-prev" type="button" disabled>السابق</button> <span id="design-range"></span> <button id="design-next" type="button" disabled>التالي</button></div><label>المشهد <input id="design-scene" type="number" min="1" step="1" value="1" class="bg-navy w-16"></label><label>الكلمة الموجودة في التعليق <input id="design-label" maxlength="36" class="bg-navy p-1"></label><button id="design-apply-icon" type="button" class="border p-1">تطبيق الأيقونة المختارة</button><div id="design-catalog" class="space-y-2"></div>';
 host.appendChild(box);const $=id=>document.getElementById(id);let selected='',page=0;
 const report=(text,error=false)=>{$('design-status').textContent=text;$('design-status').style.color=error?'#ff6570':'#cbd5e1';};
 const guard=fn=>async()=>{try{await fn();}catch(e){report(e.message,true);}};
 function paintIcons(){const all=search($('design-search').value,Infinity),rows=all.slice(page*24,(page+1)*24);$('design-prev').disabled=page===0;$('design-next').disabled=(page+1)*24>=all.length;$('design-range').textContent=Math.min(all.length,page*24+1)+'–'+Math.min(all.length,(page+1)*24)+' / '+all.length;$('design-icons').replaceChildren();for(const name of rows){const b=document.createElement('button');b.type='button';b.title=name;b.setAttribute('aria-label',name);b.style.cssText='border:1px solid #334155;padding:4px;overflow:hidden';const c=document.createElement('canvas');c.width=c.height=40;drawIcon(c.getContext('2d'),name,4,4,32);const label=document.createElement('span');label.textContent=name;label.style.cssText='display:block;font-size:9px;overflow:hidden';b.append(c,label);b.onclick=()=>{selected=name;report('الأيقونة المختارة: '+name);};$('design-icons').appendChild(b);}}
 async function populate(){await load();paintIcons();$('design-catalog').replaceChildren();for(const item of state.catalog){const card=document.createElement('div'),a=document.createElement('a'),text=document.createElement('p');a.textContent=item.name+' — '+item.license;a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';text.textContent=(item.status==='integrated'?'مدمج: ':'قائمة توسعة: ')+item.description;card.append(a,text);$('design-catalog').appendChild(card);}report(Object.keys(state.icons).length.toLocaleString('ar')+' أيقونة محلية — '+state.catalog.filter(x=>x.status==='integrated').length+' موارد مدمجة.');}
 box.addEventListener('toggle',guard(async()=>{if(box.open)await populate();}));
 $('design-search').oninput=()=>{page=0;paintIcons();};$('design-prev').onclick=()=>{if(page>0){page--;paintIcons();}};$('design-next').onclick=()=>{page++;paintIcons();};
 $('design-preset').onchange=guard(async()=>{if($('design-preset').value)await load();actions.applyAll($('design-preset').value);report('حُفظ نمط الجرافيك؛ أنشئ معاينة جديدة.');});
 $('design-apply-icon').onclick=guard(async()=>{await load();const index=Number($('design-scene').value)-1,slide=actions.getSlides()[index],label=$('design-label').value.trim();if(!Number.isInteger(index)||!slide)throw Error('رقم مشهد غير موجود');if(!selected||!state.icons[selected])throw Error('اختر أيقونة أولاً');if(!label||!String(slide.voiceover||'').includes(label))throw Error('اكتب كلمة أو عبارة موجودة حرفياً في تعليق المشهد');actions.applyScene(index,{pack,preset:$('design-preset').value||'editorial',icon:selected,label});report('حُفظت الأيقونة؛ أنشئ معاينة جديدة.');});
}
root.StudioDesignPack={state,normalize,presetFor,load,ease,font,drawIcon,selectedCue,drawCue,documentMark,description,comparison,mount,sync,search,presets};
})(typeof window==='undefined'?globalThis:window);
