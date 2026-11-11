/* Editor-owned media choices: missing shots never prevent a review preview. */
(function(root){
'use strict';
let hooks=null,host=null;
const kinds=['image','video'];
function previewCommand(text){return /(?:كمل|أكمل|اكمل|شغ[ّ]?ل|أنشئ|انشئ|سو[ّي]*|اعمل|تابع).{0,24}(?:المعاينة|معاينة)/.test(String(text||''));}
function playable(item){return Boolean(item&&kinds.includes(item.kind)&&item.url&&item.loadStatus!=='failed');}
function missing(slides,getMedia){return slides.flatMap((s,i)=>!s.explicitGraphics&&(s.requestedVisualType||s.visualType)!=='text-only'&&!((s.requestedVisualType||s.visualType)==='data'&&s.points?.length)&&!getMedia(s).some(playable)?[{scene:i+1,title:s.title||s.header||'بلا عنوان',type:s.requestedVisualType||s.visualType||'mixed'}]:[]);}
function kindFor(file){if(file.type?.startsWith('video/')||/\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name||''))return 'video';if(file.type?.startsWith('image/')||/\.(png|jpe?g|webp|gif|avif|bmp|svg)$/i.test(file.name||''))return 'image';throw Error('اختر صورة أو فيديو قابلاً للقراءة في المتصفح.');}
function syncScene(scene,items){scene.mediaItems=items;const first=items[0];scene.mediaUrl=first?.preview||first?.url||'';scene.mediaVideoUrl=first?.kind==='video'?first.url:'';scene.mediaCredit=first?.credit||'';scene.mediaSourceUrl=first?.sourceUrl||'';scene.mediaGenerated=Boolean(first?.generated);delete scene.illustration;}
async function assign(scene,items,{replace=true,checkItem,getMedia}={}){
 const accepted=[],errors=[];
 for(const item of items){try{await checkItem(item);accepted.push({...item,editorSelected:true,loadStatus:'ready'});}catch(e){errors.push(e.message||String(e));}}
 if(!accepted.length)throw Error(errors[0]||'لم تُضف مادة قابلة للقراءة؛ الوسائط السابقة محفوظة.');
 const old=getMedia(scene);if(replace)scene.unusedMedia=[...(scene.unusedMedia||[]),...old];
 syncScene(scene,replace?accepted:[...old,...accepted]);scene.productionMediaReview={status:'editor-selected',note:'اختيار المحرر؛ المراجعة النهائية والنشر بقراره.'};
 return {added:accepted.length,errors};
}
async function files(scene,selected,options){const items=[];for(const file of selected){const kind=kindFor(file),url=URL.createObjectURL(file);items.push({url,preview:kind==='image'?url:'',kind,credit:file.name,local:true,generated:false,editorSelected:true});}try{return await assign(scene,items,options);}finally{for(const item of items)if(!options.getMedia(scene).some(m=>m.url===item.url))URL.revokeObjectURL(item.url);}}
// Automatic choices are scene-bound and reviewed; editor uploads remain authoritative.
const SELECTION_VERSION=2;
function selectionPlan(scene,context=''){
 const spoken=[scene.title,scene.header,scene.subtitle,scene.voiceover,(scene.points||[]).join(' ')].filter(Boolean).join(' ');
 let query=String(scene.visualQuery||scene.title||scene.header||'').trim(),entity='';
 const subject=[scene.title,scene.header,scene.voiceover].filter(Boolean).join(' ');
 const modern=/بغداد|برلمان|مجلس النواب|العراق اليوم|العراق المعاصر|الدستور العراقي|سياسي|سياسيين|مواطن|baghdad|parliament|iraqi flag/i.test(subject);
 const babylon=/بابل|بابلي|حمورابي|babylon|hammurabi/i.test(subject);
 const iraq=/العراق|عراقي|بغداد|iraq/i.test(spoken+' '+context);
 if(/حمورابي|hammurabi/i.test(spoken)&&/مسل|نقش|قانون|مادة|حكم|code|stele/i.test(spoken)){entity='hammurabi';query='Code of Hammurabi stele';}
 else if(babylon&&!modern){entity='babylon';query=/خريط|map/i.test(spoken)?'Babylon Hammurabi map':'Babylon Iraq archaeological site';}
 else if(iraq&&/برلمان|مجلس النواب|parliament/i.test(spoken)){entity='iraq-parliament';query='Council of Representatives Iraq parliament Baghdad';}
 else if(iraq&&/علم|flag/i.test(spoken)){entity='iraq-flag';query='Iraq flag';}
 else if(iraq&&/دستور|قانون عراقي|constitution/i.test(spoken)){entity='iraq-law';query='Constitution of Iraq';}
 else if(iraq){entity='iraq';query='Iraq Baghdad '+query.replace(/calculator|accountant|stock market|wall street|american|usa/gi,'');}
 if(!/قرض|تمويل|حساب|فائدة|فوائد|ميزانية|بورص|financial|loan|calculator|budget/i.test(spoken))query=query.replace(/calculator|accountant|financial paperwork|stock market|wall street/gi,'').trim();
 return {version:SELECTION_VERSION,entity,query:query.slice(0,200),spoken};
}
function identity(item){return String(item.providerId||((item.provider||'')+':'+item.id+':'+item.type)||item.url);}
function evidenceMatches(plan,item){
 if(!plan.entity)return true;
 let text=[item.pageUrl,item.sourceUrl,item.sourceTitle,item.description,item.referenceEvidence?.sourceTitle,item.referenceEvidence?.description].filter(Boolean).join(' ');
 try{text=decodeURIComponent(text);}catch{}
 const iraq=/iraq|iraqi|baghdad|العراق|بغداد/i.test(text);
 if(plan.entity==='babylon')return /babylon|babylonia|بابل/i.test(text)&&!/nineveh|نينوى|ziggurat.of.ur|أور/i.test(text);
 if(plan.entity==='hammurabi')return /hammurabi|حمورابي/i.test(text);
 if(plan.entity==='iraq-parliament')return iraq&&/parliament|representatives|برلمان|النواب/i.test(text);
 if(plan.entity==='iraq-flag')return iraq&&/flag|علم/i.test(text);
 if(plan.entity==='iraq-law')return iraq&&/constitution|دستور/i.test(text);
 return iraq;
}
async function prepare(slides,video,h){
 const used=new Set(),diagnostics=slides.map((_,i)=>({scene:i+1,stages:[],status:'pending'}));let cursor=0;
 const key=m=>m.url||m.mediaUrl;
 const manual=m=>m.editorSelected===true||(m.local===true&&!m.autoCached&&!m.libraryId);
 for(const s of slides)for(const m of h.getMedia(s))if(manual(m)){used.add(identity(m));used.add(key(m));}
 async function sceneAt(i){
  const s=slides[i],d=diagnostics[i],plan=selectionPlan(s,h.context?.()||'');h.check();h.prepareLocal(s);
  const signature=JSON.stringify(plan),existing=h.getMedia(s),ready=[];
  for(const m of existing){
   const allowed=manual(m)||(m.selectionVersion===SELECTION_VERSION&&m.selectionSignature===signature&&m.editorialReview?.score>=.7&&!used.has(identity(m))&&!used.has(key(m)));
   if(!allowed)continue;
   try{await h.checkItem(m);ready.push(m);used.add(identity(m));used.add(key(m));}catch(e){d.stages.push({stage:'load',detail:e.message});}
  }
  if(ready.length){syncScene(s,ready);d.status='ready';return;}
  // Retire legacy automatic shots, including inherited mediaUrl fallbacks.
  if(existing.length)s.unusedMedia=[...(s.unusedMedia||[]),...existing];syncScene(s,[]);
  if(!h.needsMedia(s)){d.status='graphics';return;}
  if(!plan.query){d.status='missing';return;}
  const preferred=video?'video':'photo';
  const attempts=plan.entity?[{provider:'commons',type:'photo'},{provider:'pexels',type:preferred},{provider:'pexels',type:preferred==='video'?'photo':'video'}]:[{provider:'pexels',type:preferred},{provider:'pexels',type:preferred==='video'?'photo':'video'},{provider:'commons',type:'photo'}];
  for(const attempt of attempts){h.check();
   try{
    h.status(`البحث عن مادة مطابقة للمشهد ${i+1}/${slides.length}…`);
    const data=await h.search({...attempt,query:plan.query,orientation:h.orientation()});
    const items=(data.items||[]).filter(x=>/^https?:\/\//i.test(x.mediaUrl||'')&&!used.has(identity(x))&&!used.has(key(x))&&!(s.excludedMedia||[]).includes(String(x.id)+':'+x.type)&&evidenceMatches(plan,x));
    if(!items.length)continue;
    if(!h.review){d.stages.push({stage:'review',detail:'فحص المطابقة غير متاح؛ لم تُعتمد نتيجة عشوائية.'});continue;}
    const candidates=await h.review({i,s,query:plan.query,items:items.slice(0,6)});h.check();
    for(const item of candidates){
     const id=identity(item),url=key(item);if(used.has(id)||used.has(url)||!items.some(x=>x.mediaUrl===item.mediaUrl)||!(item.review?.score>=.7))continue;
     used.add(id);used.add(url); // Reserve before decoding: concurrent scenes cannot choose the same shot.
     const meta={url:item.mediaUrl,preview:item.preview||'',kind:item.type==='video'?'video':'image',credit:item.creator||'',sourceUrl:item.pageUrl||'',licenseUrl:item.licenseUrl||'',providerId:id,local:false,generated:false,editorSelected:false,selectionVersion:SELECTION_VERSION,selectionSignature:signature,editorialReview:item.review,trimStart:0,maxSeconds:6};
     try{await h.checkItem(meta);syncScene(s,[meta]);s.productionMediaReview={status:'relevance-reviewed',note:'فُحصت المعاينة وصلتها بالمشهد؛ قرار النشر للمحرر.'};d.status='ready';return;}catch(e){used.delete(id);used.delete(url);d.stages.push({stage:'load',detail:e.message});}
    }
   }catch(e){h.check();d.stages.push({stage:'search-review',detail:e.message});}
  }
  d.status='missing';s.productionMediaReview={status:'missing',note:'لم تُعتمد مادة مطابقة؛ المعاينة تستمر بمكان قابل للرفع والاستبدال.'};
 }
 await Promise.all(Array.from({length:Math.min(3,slides.length)},async()=>{while(cursor<slides.length)await sceneAt(cursor++);}));
 const result={clips:slides.filter(s=>h.getMedia(s).some(m=>playable(m)&&m.kind==='video')).length,photos:slides.filter(s=>h.getMedia(s).some(m=>playable(m)&&m.kind==='image')).length,missing:missing(slides,h.getMedia).length,diagnostics};h.done(result);return result;
}

function el(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e;}
function button(label,action){const b=el('button',label);b.type='button';b.className='border rounded p-2 text-xs';b.onclick=action;return b;}
async function apply(scene,items,replace=true){if(hooks.busy())throw Error('انتظر انتهاء إنشاء المعاينة، ثم بدّل المادة.');if(!hooks.getSlides().includes(scene))throw Error('المشهد لم يعد مفتوحاً.');const r=await assign(scene,items,{replace,checkItem:hooks.checkItem,getMedia:hooks.getMedia});hooks.changed();return r;}
function library(scene,note){const dialog=el('div');dialog.className='fixed inset-0 z-[9999] bg-black/90 p-5 overflow-auto';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-label','اختيار مادة للمشهد');const box=el('div');box.className='max-w-3xl mx-auto bg-navy p-4 rounded';box.append(button('إغلاق',()=>dialog.remove()),el('h3','اختر صورة أو فيديو للمشهد'));const list=el('div');list.className='grid grid-cols-2 gap-3 mt-3';box.append(list);dialog.append(box);document.body.append(dialog);
 root.StudioMediaLibrary.list().then(records=>{if(!records.length)list.append(el('p','المكتبة فارغة. استخدم رفع / استبدال لإضافة موادك.'));for(const r of records){const item=root.StudioMediaLibrary.materialize(r),card=button(r.name||r.kind,async()=>{try{await apply(scene,[item]);dialog.remove();}catch(e){note.textContent=e.message;}});if(item.kind==='image'){const im=el('img');im.src=item.url;im.className='w-full h-24 object-cover';card.prepend(im);}list.append(card);}}).catch(e=>list.append(el('p',e.message)));
}
function refresh(){if(!hooks||!host)return;const list=host.querySelector('#editor-media-scenes');list.replaceChildren();const slides=hooks.getSlides();host.querySelector('#editor-media-summary').textContent=`مراجعة وسائط المشاهد (${slides.length}) — الناقص ${missing(slides,hooks.getMedia).length}`;
 if(!slides.length)list.append(el('p','تظهر المشاهد هنا بعد تجهيز المونتاج.'));
 slides.forEach((scene,i)=>{const row=el('section');row.className='border rounded p-3 my-2 space-y-2';row.dataset.scene=String(i+1);row.append(el('h4',`المشهد ${i+1}: ${scene.title||scene.header||'بلا عنوان'}`));const media=hooks.getMedia(scene),usable=media.filter(playable),note=el('p',usable.length?`${usable.length} مادة — يمكنك استبدالها في أي وقت.`:'ناقص / تعذر تحميل المادة — المعاينة تستمر، ويمكنك ملء النقص هنا.');note.className='text-xs '+(usable.length?'text-gray-300':'text-yellow-300');row.append(note);
 const first=usable[0];if(first){const preview=el(first.kind==='video'?'video':'img');preview.src=first.url;preview.className='w-full max-h-28 object-contain';if(first.kind==='video'){preview.controls=true;preview.muted=true;preview.playsInline=true;preview.preload='metadata';}row.append(preview);}
 const input=el('input');input.type='file';input.accept='image/*,video/*,.mp4,.mov,.webm,.m4v';input.multiple=true;input.className='hidden';input.setAttribute('aria-label',`رفع مواد للمشهد ${i+1}`);
 const chooser=button('رفع / استبدال',()=>input.click());input.onchange=async()=>{const selected=Array.from(input.files||[]);if(!selected.length)return;chooser.disabled=true;note.textContent='تحميل موادك…';try{if(hooks.busy())throw Error('انتظر انتهاء المعاينة أولاً.');if(!hooks.getSlides().includes(scene))throw Error('المشهد لم يعد مفتوحاً.');await files(scene,selected,{replace:true,checkItem:hooks.checkItem,getMedia:hooks.getMedia});hooks.changed();}catch(e){note.textContent=e.message;chooser.disabled=false;}finally{input.value='';}};
 row.append(chooser,input,button('اختيار من المكتبة',()=>library(scene,note)),button('تعديل المشهد',()=>hooks.select(i)));
 const details=el('details'),summary=el('summary','إضافة رابط مباشر لصورة أو فيديو'),url=el('input');url.type='url';url.placeholder='https://…';url.className='w-full bg-navy p-2';url.setAttribute('aria-label',`رابط مادة للمشهد ${i+1}`);const type=el('select');type.className='bg-navy p-2';for(const [v,t] of [['image','صورة'],['video','فيديو']]){const o=el('option',t);o.value=v;type.append(o);}type.setAttribute('aria-label',`نوع رابط المشهد ${i+1}`);details.append(summary,url,type,button('استخدام الرابط',async()=>{try{const u=new URL(url.value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('استخدم رابطاً مباشراً لصورة أو فيديو.');await apply(scene,[{url:u.href,preview:type.value==='image'?u.href:'',kind:type.value,local:false,editorSelected:true}]);}catch(e){note.textContent=e.message+' إذا كان الموقع يمنع القراءة، نزّل الملف وارفعه من جهازك.';}}));row.append(details);list.append(row);
 });
}
function mount(parent,h){hooks=h;host=el('details');host.open=true;host.id='editor-media-panel';host.className='border border-navy-light rounded p-2 text-xs';const summary=el('summary');summary.id='editor-media-summary';const list=el('div');list.id='editor-media-scenes';list.style.cssText='max-height:32rem;overflow:auto';host.append(summary,el('p','اختر موادك بحرية. المراجعة النهائية وقرار النشر إلك؛ نقص الوسائط لا يوقف المعاينة.'),button('البحث عن مواد للنواقص',h.search),button('أكمل المعاينة',h.preview),list);parent.querySelector('#production-report').before(host);refresh();}
root.StudioEditorMedia={enabled:true,selectionPlan,evidenceMatches,previewCommand,playable,missing,kindFor,syncScene,assign,files,prepare,mount,refresh};
})(typeof window==='undefined'?globalThis:window);
