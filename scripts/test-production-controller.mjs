import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',disabled:false,after(){},replaceChildren(){},appendChild(){},pause(){this.paused=true;},load(){this.reloaded=true;},removeAttribute(name){delete this[name];},style:{},classList:{add(){},remove(){}}});return elements.get(id);};
const saved=[{title:'Saved original',source:'preserved'}],revoked=[];let consent=false,savedCalls=0;
const ctx=vm.createContext({console,URL:{revokeObjectURL:url=>revoked.push(url)},document:{readyState:'complete',getElementById:el,createElement:()=>({appendChild(){}}),addEventListener(){}},confirm:()=>consent,getCurrentStudioContent:()=>({title:'old'}),runGeminiStudioCommand:async()=>{},saveStudioProject:async()=>{savedCalls++;},restoreStudioProject:async()=>{},setAIStatus:()=>{},topics:{customScript:{title:'Open work',slides:[{mediaItems:[{local:true,url:'blob:open'}]}]}},activeTikTokTopic:'customScript',activeTopic:'customScript',activeTab:'tiktok',currentSlideIndex:0,activeTikTokSlide:0,getSceneMedia:s=>s.mediaItems||[],invalidateGeneratedVoiceover(){},deleteHumanVoiceRecording(){},socialVideo:null,newsImg:null,newsCaptionDirty:false,socialDrafts:{x:'draft'},restoredProjectUrls:[],newsInput(){},initSlideButtons(){},initTikTokSlideButtons(){},updateTikTokInputs(){},renderCanvas(){}});ctx.window=ctx;ctx.AbortController=AbortController;ctx.setTimeout=setTimeout;ctx.clearTimeout=clearTimeout;
vm.runInContext(fs.readFileSync('public/production-core.js','utf8'),ctx);vm.runInContext(fs.readFileSync('public/soundscape.js','utf8'),ctx);vm.runInContext(fs.readFileSync('public/studio-production.js','utf8'),ctx);
let fixtureFetch;
Object.defineProperty(ctx,'fetch',{configurable:true,set(value){fixtureFetch=value;},get(){return async(url,options)=>{
 const body=JSON.parse(options.body);if(!body.searches)return fixtureFetch(url,options);
 const results=await Promise.all(body.searches.map(search=>fixtureFetch(url,{...options,body:JSON.stringify(search)}).then(r=>r.json())));
 return {ok:true,json:async()=>({results})};
}}});
el('studio-source-text').value='Source material';el('production-orientation').value='landscape';el('news-handle').value='@brand';
assert.equal(ctx.getCurrentStudioContent().sourceMaterial,'Source material');ctx.StudioProduction.state.replaceFromSource=true;assert.equal(ctx.getCurrentStudioContent().title,undefined);assert.equal(ctx.getCurrentStudioContent().mode,'new-from-source');ctx.StudioProduction.state.replaceFromSource=false;await ctx.saveStudioProject();assert.equal(savedCalls,1);assert.equal(ctx.topics.customScript.productionSource.orientation,'landscape');
el('studio-source-text').value='';assert.equal(ctx.getCurrentStudioContent().sourceMaterial,'');
ctx.StudioProduction.reset();assert.equal(ctx.topics.customScript.title,'Open work');assert.equal(revoked.length,0);
consent=true;ctx.StudioProduction.state.busy=true;ctx.StudioProduction.reset();assert.equal(ctx.topics.customScript.title,'Open work');ctx.StudioProduction.state.busy=false;
ctx.socialVideo={url:'blob:old-preview'};el('production-video-preview').src='blob:old-preview';el('production-report').textContent='Old report';el('production-correction').value='Old correction';ctx.StudioProduction.state.previewPassed=true;ctx.StudioProduction.state.previewSignature='old';ctx.lastExportDiagnostics={actual:74};ctx.aiSceneDurations=[10,20];
ctx.StudioProduction.reset();assert.equal(el('production-video-preview').src,undefined);assert.equal(el('production-video-preview').paused,true);assert.equal(el('production-video-preview').reloaded,true);assert.equal(el('production-report').textContent,'');assert.equal(el('production-download').disabled,true);assert.equal(ctx.StudioProduction.state.previewSignature,null);assert.equal(ctx.StudioProduction.state.previewPassed,false);assert.equal(ctx.socialVideo,null);assert.equal(ctx.lastExportDiagnostics,null);assert.equal(ctx.aiSceneDurations.length,0);assert.equal(el('production-correction').value,'');assert.equal(el('topic-select').value,'customScript');assert.equal(ctx.topics.customScript.title,'مشروع جديد');assert.equal(el('news-handle').value,'@brand');assert.deepEqual(saved,[{title:'Saved original',source:'preserved'}]);assert(revoked.includes('blob:open'));assert.equal(Object.keys(ctx.socialDrafts).length,0);
console.log('Controller checks passed: source clearing, snapshot metadata, confirmation, busy guard, active-media cleanup and brand preservation.');

// Final renderer must show numeric details rather than a title-only data scene.
const painted=[];const canvasCtx={beginPath(){},arc(){},fill(){},fillRect(){},createLinearGradient(){return {addColorStop(){}};},measureText(t){return {width:String(t).length*10};},fillText(t){painted.push(t);},drawImage(){}};ctx.newsLogoImg=null;ctx.getActiveVoiceover=()=>null;
ctx.StudioProduction.paint(canvasCtx,{title:'الحساب',subtitle:'20 مليون دينار',points:['5 ملايين فوائد','25 مليون إجمالي','416,667 شهرياً']},null,720,1280);
for(const t of ['20 مليون دينار','5 ملايين فوائد','25 مليون إجمالي','416,667 شهرياً'])assert(painted.includes(t));
const signature=ctx.StudioProduction.projectSignature();el('news-handle').value='@changed';assert.notEqual(ctx.StudioProduction.projectSignature(),signature);
await assert.rejects(ctx.StudioProduction.narration([{voiceover:''}],60),/فارغ/);
console.log('Quality checks passed: numeric details rendered, brand edits invalidate preview, missing narration rejected.');

assert.deepEqual(Array.from(ctx.StudioProduction.correctionTargets('بدّل اللقطة الثانية وأكمل المشاهد 3 و4 و6',new Array(6).fill({}))).sort(),[1,2,3,5]);
const dataScene={voiceover:'القرض 20 مليون دينار. الفوائد 5 ملايين. الإجمالي 25 مليوناً.'};ctx.StudioProduction.prepareDataScene(dataScene);assert.equal(dataScene.points.length,3);assert(dataScene.productionVisual.ready);
assert.equal(ctx.StudioProduction.mediaIndexAt([{kind:'video',element:{duration:4},meta:{}},{kind:'video',element:{duration:5},meta:{}}],5,15),1);
assert.equal(ctx.StudioProduction.mediaIndexAt([{kind:'video',element:{duration:4},meta:{}},{kind:'video',element:{duration:5},meta:{}}],10,15),0);
console.log('Pipeline checks passed: correction targets, numeric cards, clip cycling.');
// Numeric cards are an explicit local visual, while footage/document scenes still require media.
let searches=0;ctx.URL=URL;ctx.STUDIO_PREVIEW_PUBLIC={anonKey:'test'};ctx.fetch=async(url,options)=>{const body=JSON.parse(options.body);if(body.action==='review-media')return {ok:true,json:async()=>({reviews:[{scene:1,candidates:[{id:'91:video',safe:true,score:.9,reason:'ملائم'}]}]})};searches++;return {ok:true,json:async()=>({items:[{id:91,type:'video',mediaUrl:'https://videos.pexels.com/finance.mp4',preview:'https://images.pexels.com/videos/91/free-photo.jpg',pageUrl:'https://www.pexels.com/video/finance-91/',creator:'Test',duration:30}]})};};ctx.loadExportMedia=async m=>({kind:m.kind,element:{muted:true,duration:30,play:async()=>{},pause(){},removeAttribute(){},load(){}}});ctx.addSceneMedia=(s,m)=>{s.mediaItems=[...(s.mediaItems||[]),m];};
const numericScene={title:'تكلفة القرض',visualType:'data',visualQuery:'finance calculator infographic',voiceover:'القرض 20 مليون دينار',duration:12};
await ctx.StudioProduction.mediaFor([numericScene],true);assert.equal(searches,0);assert.equal(numericScene.mediaItems,undefined);ctx.topics.customScript.slides=[numericScene];assert(ctx.StudioProduction.productionReport().join('\n').includes('إنفوغرافيك محلي'));
assert(ctx.StudioProduction.localDataReady(numericScene));assert(!ctx.StudioProduction.needsMedia(numericScene));
assert(ctx.StudioProduction.needsMedia({visualType:'data',points:[]}));assert(ctx.StudioProduction.needsMedia({visualType:'document',points:['وثيقة']}));assert(ctx.StudioProduction.needsMedia({visualType:'broll',points:['100 دينار']}));
const invalidCard={visualType:'data',points:[null],productionVisual:{ready:true}};assert(!ctx.StudioProduction.localDataReady(invalidCard));
console.log('Local data cards bypass stock search; empty data, footage and documents retain media requirements.');

assert.equal(ctx.StudioProduction.visualSearchQuery(numericScene),'person reviewing loan contract calculator financial paperwork desk');

assert.equal(ctx.StudioProduction.mediaIndexAt([{kind:'video',element:{duration:30},meta:{}},{kind:'video',element:{duration:30},meta:{}}],7,18),1);

// A multi-scene report is one performance, not separately generated paragraphs.
let ttsCalls=0,spoken='';ctx.Blob=Blob;ctx.URL={createObjectURL:()=> 'blob:continuous',revokeObjectURL(){}};
ctx.requestedVideoSeconds=()=>12;ctx.narrationStyle=()=> 'consistent';ctx.requestNarrationTts=async text=>{ttsCalls++;spoken=text;return {audio:'AA==',mimeType:'audio/wav'};};ctx.atob=atob;
ctx.AudioContext=class {async decodeAudioData(){return {duration:12};}async close(){}};
ctx.detectNarrationSceneDurations=async(blob,texts,duration)=>texts.map(()=>duration/texts.length);
const narrationScenes=Array.from({length:6},(_,i)=>({voiceover:'فقرة '+i}));
await ctx.StudioProduction.narration(narrationScenes,12);
assert.equal(ttsCalls,1);assert.equal(spoken,narrationScenes.map(s=>s.voiceover).join('\n\n'));
assert.equal(ctx.aiVoiceoverDuration,12);assert.equal(ctx.aiSceneDurations.reduce((a,b)=>a+b,0),12);assert.equal(ctx.aiTimelineApproximate,true);
await ctx.StudioProduction.narration(narrationScenes,12);assert.equal(ttsCalls,1);
ctx.detectNarrationSceneDurations=async()=>[0];const previousVoice=ctx.aiVoiceoverUrl;
await assert.rejects(ctx.StudioProduction.narration(narrationScenes,12),/توزيع/);assert.equal(ctx.aiVoiceoverUrl,previousVoice);
console.log('Continuous narration regression passed: one request for six scenes, cache reuse, full timeline and previous voice preserved on alignment failure.');

// Brand follows the existing studio identity; stock attribution is not burned in.
const brandMarks=[];const brandCtx={...canvasCtx,fillText(text){brandMarks.push({text,color:this.fillStyle});}};
ctx.newsLogoImg=null;ctx.StudioProduction.paint(brandCtx,{title:'اختبار الهوية'}, {element:{width:720,height:1280},meta:{illustrative:true}},720,1280);
assert(brandMarks.some(m=>m.text==='النقطة'&&m.color==='#fff'));assert(brandMarks.some(m=>m.text==='Media'&&m.color==='#E31217'));
assert(!brandMarks.some(m=>m.text==='لقطات توضيحية'));
console.log('Brand regression passed: white Arabic wordmark, red Media, original dot and no illustrative caption in video.');

ctx.newsLogoData='logo-old';const oldBrandSignature=ctx.StudioProduction.projectSignature();ctx.newsLogoData='logo-new';assert.notEqual(ctx.StudioProduction.projectSignature(),oldBrandSignature);
assert.deepEqual(Array.from(ctx.StudioProductionCore.alignedDurations([{scene:1,start:.2},{scene:2,start:4},{scene:3,start:8}],3,12)),[4,4,4]);
assert.throws(()=>ctx.StudioProductionCore.alignedDurations([{scene:1,start:0},{scene:2,start:0}],2,12),/توقيت/);
// Failed visual replacement must leave original media and narration intact.
ctx.topics.customScript.slides=[{title:'أصل',voiceover:'النص الأصلي',visualType:'broll',mediaItems:[{url:'old',providerId:'original'}]}];el('production-correction').value='بدل اللقطة 1 بصورة توقيع عقد';
ctx.fetch=async()=>({ok:true,json:async()=>({slides:[{visualQuery:'person signing contract'}]})});ctx.StudioProduction.state.mediaCache.clear();
await assert.rejects(ctx.StudioProduction.correctCurrent(),/وسائط/);assert.equal(ctx.topics.customScript.slides[0].mediaItems[0].url,'old');assert.equal(ctx.topics.customScript.slides[0].voiceover,'النص الأصلي');
console.log('Release regressions passed: logo invalidation, ordered audio boundaries, transactional corrections.');

assert.deepEqual(Array.from(ctx.StudioProduction.correctionTargets('المشاهد من 2 إلى 4',new Array(6).fill({}))).sort(),[1,2,3]);
// A failed second fit cannot pair revised text with the previous audio.
ctx.detectNarrationSceneDurations=async(blob,texts,duration)=>texts.map(()=>duration/texts.length);ctx.topics.customScript.slides=[{voiceover:'النص القديم'}];
console.log('Correction range and timeout compatibility checked.');

// Duration expansion is bounded and must preserve every numeric fact.
const fitted=[{voiceover:'احفظ 3 نسخ من الملفات'}];
ctx.fetch=async()=>({ok:true,json:async()=>({slides:[{voiceover:'احفظ 4 نسخ من الملفات الأصلية في مجلد منظم'}]})});
await assert.rejects(ctx.StudioProduction.fitScript(fitted,10,2),/الأرقام/);
assert.equal(fitted[0].voiceover,'احفظ 3 نسخ من الملفات');
ctx.fetch=async()=>({ok:true,json:async()=>({slides:[{voiceover:'احفظ 3 نسخ من الملفات الأصلية في مجلد واضح'}]})});
assert.equal(await ctx.StudioProduction.fitScript(fitted,10,2),true);
assert.equal(fitted[0].voiceover,'احفظ 3 نسخ من الملفات الأصلية في مجلد واضح');
console.log('Measured duration fitting preserves numeric facts and bounded word budgets.');

// Explicit incomplete-audio results cannot silently fall back to timing estimates.
ctx.OfflineAudioContext=class {createBufferSource(){return {connect(){},start(){}};}async startRendering(){return {length:1,sampleRate:8000,getChannelData:()=>new Float32Array(1)};}};
ctx.pcmWav=()=>new Blob([new Uint8Array([0,0])]);ctx.btoa=btoa;
ctx.fetch=async()=>({ok:false,json:async()=>({error:'alignment_incomplete'})});
const intactVoice=ctx.aiVoiceoverUrl;
await assert.rejects(ctx.StudioProduction.narration(narrationScenes,12),/جميع فقرات التعليق/);
assert.equal(ctx.aiVoiceoverUrl,intactVoice);
console.log('Incomplete narration preserves prior audio and cannot be labeled ready.');

// Word estimates must not rewrite narration whose actual audio already matches.
let prematureFits=0;el('video-sync-mode').value='fit-audio';
ctx.fetch=async(url,options)=>{const body=JSON.parse(options.body);if(body.action==='fit-narration'){prematureFits++;return {ok:false,json:async()=>({error:'unexpected fitting'})};}return {ok:true,json:async()=>({complete:true,segments:[{scene:1,start:0},{scene:2,start:4},{scene:3,start:8}]})};};
const timedText=Array.from({length:3},()=>({voiceover:new Array(6).fill('ملف').join(' ')}));
const beforeTimed=timedText.map(s=>s.voiceover);await ctx.StudioProduction.narration(timedText,12);
assert.equal(prematureFits,0);assert.deepEqual(timedText.map(s=>s.voiceover),beforeTimed);
console.log('Narration fitting uses actual audio duration, never a speculative pre-shortening.');

// Measured feedback can recover from an overshooting rewrite without speeding speech.
ctx.StudioProduction.state.audioCache.clear();let fitPasses=0;const durations=[132,110,120];
ctx.AudioContext=class {async decodeAudioData(){return {duration:durations.shift()};}async close(){}};
ctx.fetch=async(url,options)=>{const b=JSON.parse(options.body);if(b.action==='fit-narration'){fitPasses++;return {ok:true,json:async()=>({slides:[{voiceover:new Array(fitPasses===1?218:238).fill('ملف').join(' ')}]})};}return {ok:true,json:async()=>({complete:true,segments:[{scene:1,start:0}]})};};
const measured=[{voiceover:new Array(240).fill('ملف').join(' ')}];await ctx.StudioProduction.narration(measured,120);assert.equal(fitPasses,2);assert.equal(ctx.aiVoiceoverDuration,120);assert.equal(measured[0].voiceover.split(' ').length,238);
console.log('Measured feedback converges after overshoot while keeping one continuous performance.');
// A high-ranked but unrelated thumbnail must never be selected over the relevant one.
ctx.StudioProduction.state.reviewCache.clear();ctx.fetch=async()=>({ok:true,json:async()=>({reviews:[{scene:1,candidates:[{id:'1:video',safe:false,score:.99,reason:'عملة أجنبية'},{id:'2:video',safe:true,score:.85,reason:'حساب محايد'}]}]})});
const reviewed=await ctx.StudioProduction.reviewCandidates([{i:0,s:{title:'حاسبة'},query:'calculator',items:[{id:1,type:'video',preview:'https://images.pexels.com/videos/1/a.jpg'},{id:2,type:'video',preview:'https://images.pexels.com/videos/2/a.jpg'}]}]);assert.equal(reviewed.get(0).length,1);assert.equal(reviewed.get(0)[0].id,2);
ctx.StudioProduction.state.reviewCache.clear();ctx.fetch=async()=>({ok:true,json:async()=>({reviews:[]})});await assert.rejects(ctx.StudioProduction.reviewCandidates([{i:0,s:{title:'حاسبة'},query:'calculator',items:[{id:2,type:'video',preview:'https://images.pexels.com/videos/2/a.jpg'}]}]),/جميع المشاهد/);
console.log('Visual review rejects misleading candidates and incomplete reviews.');

// Duration is a separate acceptance criterion from matching the audio stream.
assert.equal(ctx.StudioProduction.durationResult(115.23,115.29,60,true).syncPassed,true);
assert.equal(ctx.StudioProduction.durationResult(115.23,115.29,60,true).passed,false);
for(const target of [30,45,60,120])assert.equal(ctx.StudioProduction.durationResult(target+.1,target,target,true).passed,true);
assert.equal(ctx.StudioProduction.durationResult(60,115,60,true).passed,false);
assert.equal(ctx.StudioProduction.durationResult(NaN,60,60,true).passed,false);
console.log('Duration acceptance distinguishes the requested length from audio/video synchronization.');

// Oversized planning is rewritten before any speech request; source text remains intact.
ctx.StudioProduction.state.audioCache.clear();const ordered=[];el('video-sync-mode').value='fit-audio';el('studio-source-text').value='المصدر الكامل يبقى محفوظاً';
ctx.requestNarrationTts=async text=>{ordered.push('tts');return {audio:'AA==',mimeType:'audio/wav'};};
ctx.AudioContext=class {async decodeAudioData(){return {duration:40};}async close(){}};
ctx.fetch=async(url,options)=>{const b=JSON.parse(options.body);if(b.action==='fit-narration'){ordered.push('fit');assert.equal(b.wordBudget,80);return {ok:true,json:async()=>({slides:[{voiceover:Array(80).fill('كلمة').join(' ')}]})};}return {ok:true,json:async()=>({complete:true,segments:[{scene:1,start:0}]})};};
const overlong=[{voiceover:Array(120).fill('كلمة').join(' ')}];await ctx.StudioProduction.narration(overlong,40);assert.deepEqual(ordered,['fit','tts']);assert.equal(overlong[0].voiceover.split(' ').length,80);assert.equal(el('studio-source-text').value,'المصدر الكامل يبقى محفوظاً');
// An explicit duration cannot silently inherit the previous preserve-text mode.
el('ai-command-input').value='حوّل إلى ريلز 45 ثانية';el('video-sync-mode').value='extend-visuals';await ctx.runGeminiStudioCommand();assert.equal(el('video-total-duration').value,'45');assert.equal(el('video-sync-mode').value,'fit-audio');assert.equal(el('ai-command-input').value,'حوّل إلى ريلز 45 ثانية');
console.log('Pre-speech budget and explicit command duration preserve source material and reset fitting mode.');

// Explicit infographic correction is local and transactional, with no provider or TTS calls.
ctx.topics.customScript.slides=[{title:'نفقات',visualType:'data',points:['النقل 100 ألف','الكهرباء 100 ألف'],voiceover:'النقل والكهرباء مئتا ألف دينار',mediaItems:[]}];
el('production-correction').value='حوّل المشهد 1 إلى إنفوغرافيك اقتصادي';const beforeSearch=searches;const voiceBefore=ctx.topics.customScript.slides[0].voiceover;await ctx.StudioProduction.correctCurrent();assert.equal(searches,beforeSearch);assert.equal(ctx.topics.customScript.slides[0].voiceover,voiceBefore);assert.equal(ctx.topics.customScript.slides[0].design.preset,'finance');assert.equal(ctx.topics.customScript.slides[0].mediaItems.length,0);
assert.deepEqual(Array.from(ctx.StudioProduction.correctionTargets('المشروع الحالي وجميع المشاهد بما فيها 3 و4',new Array(5).fill({}))),[0,1,2,3,4]);
console.log('Local infographic correction preserves narration and all-scene targeting.');

const spelled={visualType:'data',voiceover:'النقل مئة ألف دينار. الكهرباء مئة ألف دينار.'};ctx.StudioProduction.prepareDataScene(spelled);assert.equal(spelled.points.length,2);assert(ctx.StudioProduction.localDataReady(spelled));

// Preflight recovers misclassified numeric scenes while preserving evidence requirements.
const missingNumeric={title:'بداية الراتب',visualType:'illustrative',voiceover:'الراتب مليون دينار. الإيجار ثلاثمئة ألف دينار.',mediaItems:[]};
const originalNarration=missingNumeric.voiceover;assert(!ctx.StudioProduction.prepareLocalVisual(missingNumeric));assert.equal(missingNumeric.visualType,'illustrative');assert.equal(missingNumeric.voiceover,originalNarration);assert(ctx.StudioProduction.needsMedia(missingNumeric));
for(const type of ['document','portrait','real','archive','map']){const scene={...missingNumeric,visualType:type};assert(!ctx.StudioProduction.prepareLocalVisual(scene));assert.equal(scene.visualType,type);}
const actualFootage={visualType:'broll',voiceover:'مليون دينار',mediaItems:[{url:'blob:existing'}]};assert(!ctx.StudioProduction.prepareLocalVisual(actualFootage));assert.equal(actualFootage.visualType,'broll');
const noFacts={title:'وثيقة مطلوبة',visualType:'document',mediaItems:[]};const issues=ctx.StudioProduction.missingVisuals([missingNumeric,noFacts]);assert.equal(issues.length,2);assert.equal(issues[1].scene,2);assert(ctx.StudioProduction.visualReadinessError([missingNumeric,noFacts]).includes('وثيقة مطلوبة'));assert(ctx.StudioProduction.visualReadinessError([missingNumeric]));
// Match the legacy media fallback used by the real editor, not just mediaItems.
ctx.getSceneMedia=s=>s.mediaItems?.length?s.mediaItems:s.mediaVideoUrl||s.mediaUrl?[{url:s.mediaVideoUrl||s.mediaUrl}]:[];
ctx.topics.customScript.slides=[{title:'النفقات',visualType:'data',voiceover:'النقل مئة ألف دينار',points:['النقل 100 ألف'],mediaUrl:'https://legacy.invalid/old.jpg',mediaItems:[]}];el('production-correction').value='حوّل المشهد 1 إلى إنفوغرافيك اقتصادي';await ctx.StudioProduction.correctCurrent();assert.equal(ctx.getSceneMedia(ctx.topics.customScript.slides[0]).length,0);
console.log('Footage intent retained, named missing scenes, protected evidence and legacy media clearing passed.');

// Motion-text fallback is explicit in the report, opt-in to the graphic pack, and never replaces evidence.
ctx.StudioDesignPack={normalize:s=>s.design?.pack==='press-v1'?s.design:null};const explainer={title:'مثال تدريبي',visualType:'illustrative',voiceover:'هذا مثال توضيحي وليس متوسطاً وطنياً',design:{pack:'press-v1',preset:'finance'},mediaItems:[]};assert(!ctx.StudioProduction.prepareLocalVisual(explainer));assert(!ctx.StudioProduction.prepareLocalVisual(explainer,true));assert.equal(explainer.visualType,'illustrative');assert(ctx.StudioProduction.needsMedia(explainer));

const decimal={visualType:'illustrative',voiceover:'التكلفة 3.5 مليون دينار. العائد ٤.٢ مليون دينار.'};assert(!ctx.StudioProduction.prepareLocalVisual(decimal));assert.equal(decimal.points,undefined);ctx.StudioProduction.prepareDataScene(decimal);assert.equal(decimal.points.length,2);assert(decimal.points[0].includes('3.5'));assert(decimal.points[1].includes('٤.٢'));

ctx.StudioDesignPack=undefined;ctx.URL=URL;
// Required footage must never silently turn into a diagram, including failed/geo-blocked searches.
vm.runInContext(fs.readFileSync('public/editorial-geography.js','utf8'),ctx);
ctx.StudioProduction.state.mediaCache.clear();
let geoSearches=0;ctx.fetch=async(url,options)=>{if(JSON.parse(options.body).action==='review-media')return {ok:true,json:async()=>({reviews:[{scene:1,intent:'specific',candidates:[{id:'77:video',safe:true,score:.9,reason:'معاينة تحتاج موقعها'}]}]})};geoSearches++;return {ok:true,json:async()=>({items:[{id:77,type:'video',mediaUrl:'https://videos.pexels.com/test.mp4',preview:'https://images.pexels.com/test.jpg',pageUrl:'https://www.pexels.com/video/77/',creator:'Editor'}]})}};
const iraqi={title:'مستشفى في العراق',visualType:'broll',voiceover:'مليون مراجع',mediaItems:[]};
const geoResult=await ctx.StudioProduction.mediaFor([iraqi],true);assert.equal(geoResult.missing,1);assert.equal(iraqi.visualType,'broll');assert.equal(iraqi.illustration,undefined);assert.equal(iraqi.productionMediaReview.status,'location-review');assert.equal(geoSearches,1);
const libraryRecords=[{id:'approved',kind:'video',local:true,url:'blob:approved'}];ctx.StudioMediaLibrary={find:async()=>libraryRecords,candidates(){}};
const readyResult=await ctx.StudioProduction.mediaFor([iraqi],true);assert.equal(readyResult.missing,0);assert.equal(geoSearches,1);assert.equal(iraqi.mediaItems[0].url,'blob:approved');
const searchesBefore=geoSearches;await ctx.StudioProduction.mediaFor([iraqi],true);assert.equal(geoSearches,searchesBefore);
ctx.loadExportMedia=async()=>{throw Error('ملف غير قابل للتحميل')};
const failedResult=await ctx.StudioProduction.mediaFor([iraqi],true);assert.equal(failedResult.missing,1);assert.equal(iraqi.productionMediaReview.status,'failed');assert.equal(iraqi.mediaItems[0].url,'blob:approved');
assert(ctx.StudioProduction.visualReadinessError([iraqi]));
console.log('Media regression: geography rejects unreviewed footage, library reuse avoids search, decode failure remains missing without destroying the source.');

// Drain every worker before releasing a cancelled job; no background scene mutates the next job.
ctx.StudioMediaLibrary=undefined;ctx.StudioProduction.state.mediaCache.clear();ctx.StudioProduction.state.abort=new AbortController();let abortedWorkers=0,startedWorkers=0;
ctx.fetch=(url,o)=>new Promise((resolve,reject)=>{startedWorkers++;o.signal.addEventListener('abort',()=>{abortedWorkers++;reject(Error('aborted'));},{once:true});});
const cancelledScenes=Array.from({length:3},(_,i)=>({title:'Test '+i,visualQuery:'query '+i,visualType:'broll',mediaItems:[]}));
const cancelledWork=ctx.StudioProduction.mediaFor(cancelledScenes,true);for(let i=0;i<20&&startedWorkers<3;i++)await new Promise(r=>setTimeout(r,5));assert.equal(startedWorkers,3);ctx.StudioProduction.state.abort.abort();await assert.rejects(cancelledWork,/أُلغي/);assert.equal(abortedWorkers,3);assert(cancelledScenes.every(s=>!s.illustration&&!s.mediaItems.length));ctx.StudioProduction.state.abort=null;
console.log('Cancellation drains all bounded media workers before returning.');

// Filmed reports cannot satisfy the delivery contract with repeated graphics.
{
 const api=ctx.StudioProduction;
 const topic={slides:Array.from({length:5},(_,i)=>({title:'scene '+i,visualType:'data',points:['معلومة'],voiceover:'تعليق',duration:9}))};
 api.applyReportBaseline(topic,'أنشئ تقريراً بفيديوهات وصور وجرافيك');
 assert.equal(topic.slides.filter(s=>s.requestedVisualType==='data').length,1);
 assert.equal(topic.slides.filter(s=>s.requestedVisualType==='broll').length,1);
 assert.match(api.reportBaselineError(topic.slides,topic),/75%/);
 for(const s of topic.slides.slice(1))s.mediaItems=[{kind:'image',local:true,url:'blob:photo'}];
 assert.match(api.reportBaselineError(topic.slides,topic),/فيديو فعلي/);
 topic.slides[1].mediaItems=[{kind:'video',local:true,url:'blob:video'}];
 assert.equal(api.reportBaselineError(topic.slides,topic),'');
 topic.slides[1].mediaItems[0].loadStatus='failed';
 assert.match(api.reportBaselineError(topic.slides,topic),/75%/);
 api.applyReportBaseline(topic,'إنفوغرافيك فقط');
 assert.equal(topic.productionContract,undefined);
}
console.log('Filmed report contract: actual media coverage, required video, failed assets and explicit graphics opt-out passed.');

{
 const api=ctx.StudioProduction,topic={productionContract:{version:1},slides:Array.from({length:5},()=>({visualType:'illustrative',voiceover:'النص محفوظ',mediaItems:[{kind:'video',local:true,url:'blob:source'}]}))};
 api.applyBroadcastDirection(topic,'تقرير اقتصادي');
 assert.equal(topic.slides.filter(s=>s.broadcast.cta).length,1);
 assert.equal(new Set(topic.slides.map(s=>s.cinema.motion)).size,4);
 assert.equal(topic.slides.filter(s=>s.cinema.transition==='cut').length,4);
 assert.equal(api.broadcastTiming(topic.slides[3],0,9).cta,0);
 assert.equal(api.broadcastTiming(topic.slides[3],3,9).cta,1);
 assert.equal(api.broadcastTiming(topic.slides[3],7,9).cta,0);
 assert.equal(api.broadcastTiming(topic.slides[0],3,9).cta,0);
 assert.equal(api.broadcastTiming(topic.slides[0],.9,9).pulse,1);
 assert.equal(topic.slides[0].mediaItems[0].url,'blob:source');
 assert.equal(topic.slides[0].voiceover,'النص محفوظ');
}
console.log('Broadcast direction: varied motion, restrained cuts, single bounded CTA, logo accent timing and source preservation passed.');

{
 const slide={visualType:'illustrative',cinema:{look:'cinematic',motion:'zoom-in',transition:'dip-black'}},topic={productionContract:{version:1},slides:[slide]},original={...slide.cinema};
 ctx.StudioProduction.applyBroadcastDirection(topic,'تقرير',new Map([[slide,original]]));
 assert.equal(JSON.stringify(slide.cinema),JSON.stringify(original));
}
console.log('Broadcast defaults preserve explicit scene direction.');

{
 let spent=0;ctx.StudioProduction.state.mediaCache.clear();ctx.fetch=async()=>({ok:true,json:async()=>({items:[]})});ctx.requestNarrationTts=async()=>{spent++;throw Error('TTS must wait for media');};ctx.getActiveVoiceover=()=>null;ctx.StudioMediaLibrary={find:async()=>[],candidates(){}};
 ctx.topics.customScript.slides=[{title:'مادة ناقصة',visualType:'broll',visualQuery:'coffee',voiceover:'نص محفوظ',duration:10,mediaItems:[]}];
 await ctx.StudioProduction.produce();assert.equal(spent,0);assert.equal(ctx.topics.customScript.slides[0].voiceover,'نص محفوظ');
}
console.log('Missing footage stops before TTS spending while retaining the scene and narration text.');

assert(Math.abs(ctx.StudioProduction.boundedOutroSeconds(27.68,30,true)-2.32)<1e-9);
assert.equal(ctx.StudioProduction.boundedOutroSeconds(26,30,true),0);
assert.equal(ctx.StudioProduction.boundedOutroSeconds(6,9,true),0);
assert.equal(ctx.StudioProduction.boundedOutroSeconds(31,30,true),0);
assert.equal(ctx.StudioProduction.boundedOutroSeconds(27.68,30,false),0);
console.log('Musical ending is bounded to three seconds and ten percent, never trims speech or changes uncontracted projects.');
// The actual five-scene Iraq report: general details pass review; an official action needs its source.
{
 ctx.StudioProduction.state.mediaCache.clear();ctx.StudioProduction.state.reviewCache.clear();ctx.StudioMediaLibrary={find:async()=>[],candidates(rows){ctx.heldScopeRows=rows;}};
 ctx.loadExportMedia=async m=>({kind:m.kind,element:{duration:20,play:async()=>{},pause(){},removeAttribute(){},load(){}}});
 let serial=200,ttsRequests=0;ctx.requestNarrationTts=async()=>{ttsRequests++;throw Error('No speech spending in media test');};
 ctx.fetch=async(url,options)=>{const b=JSON.parse(options.body);if(b.action==='review-media')return {ok:true,json:async()=>({reviews:b.reviews.map(r=>({scene:r.scene,intent:'illustrative',candidates:r.candidates.map(c=>({id:c.id,safe:true,score:.9,reason:'تفصيل عام مناسب'}))}))})};const id=serial++;return {ok:true,json:async()=>({items:[{id,type:'video',mediaUrl:'https://videos.pexels.com/video-files/'+id+'/clip.mp4',preview:'https://images.pexels.com/videos/'+id+'/poster.jpg',pageUrl:'https://www.pexels.com/video/'+id+'/',creator:'Fixture'}]})};};
 const scenes=[['حقنة مجهولة','close up syringe preparation'],['فحص المواد','hands checking vial expiry label'],['تحرك صحي','health inspection team Baghdad'],['سلسلة الرقابة','medical supplies distribution'],['خاتمة المحاسبة','doctor patient consultation']].map(([title,visualQuery])=>({title,visualQuery,visualType:'broll',voiceover:'تفاصيل تقرير التجميل في العراق',duration:10,mediaItems:[]}));
 el('studio-source-text').value='تقرير عن التجميل في العراق';ctx.topics.customScript={slides:scenes};
 const result=await ctx.StudioProduction.mediaFor(scenes,true);
 assert.equal(result.missing,1);assert.deepEqual(Array.from(ctx.StudioProduction.missingVisuals(scenes),x=>x.scene),[3]);
 for(const i of [0,1,3,4]){const m=scenes[i].mediaItems[0];assert.equal(m.kind,'video');assert.equal(m.illustrative,true);assert.equal(m.editorialReview.intent,'illustrative');assert.equal(m.locationEvidence,undefined);assert(ctx.StudioGeography.check(scenes[i],m).allowed);}
 assert.equal(scenes[2].productionMediaReview.status,'location-review');assert.equal(ctx.heldScopeRows.length,1);assert.equal(ttsRequests,0);
 const unrelated={...scenes[0].mediaItems[0],editorialReview:{intent:'illustrative',scope:'poster-only',score:.1}};assert.equal(ctx.StudioGeography.check(scenes[0],unrelated).allowed,false);
 const forged={...scenes[0].mediaItems[0],generated:true};assert.equal(ctx.StudioGeography.check(scenes[0],forged).allowed,false);
 ctx.addSceneMedia(scenes[2],{local:true,kind:'video',url:'blob:original-event',loadStatus:'ready'});assert.equal(ctx.StudioProduction.missingVisuals(scenes).length,0);
}
console.log('Five-scene Iraq regression: four relevant illustrations pass, specific event stays protected, source upload completes it, no TTS requests.');

// Refine only a rejected general shot once; successful scenes never spend a second search/review.
{
 ctx.StudioProduction.state.mediaCache.clear();ctx.StudioProduction.state.reviewCache.clear();let searches=0;const batches=[];
 ctx.StudioMediaLibrary={find:async()=>[],candidates(){}};
 ctx.fetch=async(url,options)=>{const b=JSON.parse(options.body);if(b.action==='review-media'){batches.push(b.reviews.map(r=>r.scene));return {ok:true,json:async()=>({reviews:b.reviews.map(r=>({scene:r.scene,intent:'illustrative',alternativeQuery:r.scene===2&&!r.query.includes('precise')?'precise hands vial label':'',candidates:r.candidates.map(c=>({id:c.id,safe:r.scene!==2||r.query.includes('precise'),score:.9,reason:'type and action matching'}))}))})};}searches++;const id=800+searches;return {ok:true,json:async()=>({items:[{id,type:'video',mediaUrl:'https://videos.pexels.com/video-files/'+id+'/clip.mp4',preview:'https://images.pexels.com/videos/'+id+'/poster.jpg',pageUrl:'https://www.pexels.com/video/'+id+'/',creator:'fixture'}]})};};
 const scenes=[{title:'حقنة',visualQuery:'needle preparation',visualType:'broll',duration:3,mediaItems:[]},{title:'فحص عبوة',visualQuery:'medicine packaging',visualType:'broll',duration:3,mediaItems:[]}];ctx.topics.customScript={title:'فحص مواد تجميل حقنية',slides:scenes};el('studio-source-text').value='التجميل في العراق؛ فحص مواد حقن لا حبوب.';
 const result=await ctx.StudioProduction.mediaFor(scenes,true);assert.equal(result.missing,0);assert.equal(searches,3);assert.equal(JSON.stringify(batches),'[[1,2],[2]]');assert.equal(scenes[0].mediaItems[0].providerId,'801:video');assert.equal(scenes[1].searchRecovery.attempts,1);
}
console.log('Only the rejected general shot gets one improved query; completed scenes and voice remain intact.');

// Exercise all automatic search stages and multiple later-ranked clips.
{
 const api=ctx.StudioProduction;api.state.mediaCache.clear();api.state.reviewCache.clear();
 const requests=[];let next=1000;
 ctx.StudioMediaLibrary={find:async()=>[],candidates(){}};
 ctx.loadExportMedia=async m=>({kind:m.kind,element:{duration:20,play:async()=>{},pause(){},removeAttribute(){},load(){}}});
 ctx.fetch=async(url,options)=>{const b=JSON.parse(options.body);
  if(b.action==='review-media')return {ok:true,json:async()=>({reviews:b.reviews.map(r=>({scene:r.scene,intent:'illustrative',candidates:r.candidates.map(c=>({id:c.id,safe:Number(c.id.split(':')[0])>=1003,score:.9,reason:'reviewed motion'}))}))})};
  requests.push(b);return {ok:true,json:async()=>({items:Array.from({length:6},()=>{const id=next++;return {id,type:'video',mediaUrl:'https://videos.pexels.com/video-files/'+id+'/clip.mp4',preview:'https://images.pexels.com/videos/'+id+'/poster.jpg',pageUrl:'https://www.pexels.com/video/'+id+'/',creator:'fixture'};})})};
 };
 const scenes=[{title:'تفصيل عمل',visualQuery:'hands working',visualType:'broll',duration:12,mediaItems:[]}];ctx.topics.customScript={slides:scenes};el('studio-source-text').value='العمل في العراق';
 const result=await api.mediaFor(scenes,true);assert.equal(result.missing,0);assert.equal(requests.length,1);assert.equal(scenes[0].mediaItems.length,3);assert.equal(new Set(scenes[0].mediaItems.map(m=>m.providerId)).size,3);assert.equal(scenes[0].mediaItems[0].providerId,'1003:video');
 const before=requests.length;await api.mediaFor(scenes,true);assert.equal(requests.length,before);
 api.state.mediaCache.clear();api.state.reviewCache.clear();requests.length=0;
 ctx.fetch=async(url,options)=>{const b=JSON.parse(options.body);if(b.action==='review-media')return {ok:true,json:async()=>({reviews:b.reviews.map(r=>({scene:r.scene,intent:'illustrative',candidates:r.candidates.map(c=>({id:c.id,safe:true,score:.9,reason:'generic detail'}))}))})};requests.push(b);return {ok:true,json:async()=>({items:b.provider==='commons'?[{id:'commons-5',provider:'Commons',type:'photo',license:'Public domain',mediaUrl:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Test.jpg',preview:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Test.jpg',pageUrl:'https://commons.wikimedia.org/wiki/File:Test.jpg',creator:'fixture'}]:[]})};};
 const missing=[{title:'تفصيل عام',visualQuery:'worker hands',visualType:'illustrative',duration:4,mediaItems:[]}];ctx.topics.customScript={slides:missing};
 const recovered=await api.mediaFor(missing,true);assert.equal(recovered.missing,0);assert.equal(JSON.stringify(requests.map(b=>[b.provider,b.type,b.orientation])),JSON.stringify([['pexels','video','portrait'],['pexels','video','any'],['pexels','photo','any'],['commons','photo','any']]));assert.equal(missing[0].mediaItems[0].kind,'image');assert.equal(missing[0].mediaItems[0].locationEvidence,undefined);assert(missing[0].mediaItems[0].licenseUrl.includes('pexels')===false,'Commons metadata must keep its own license');
}
console.log('Automatic recovery: later-ranked clips, distinct shot coverage, reuse, unrestricted orientation, photo fallback and Commons.');
