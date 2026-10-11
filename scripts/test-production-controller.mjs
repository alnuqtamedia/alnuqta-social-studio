import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',disabled:false,after(){},replaceChildren(){},appendChild(){},removeAttribute(){},classList:{add(){},remove(){}}});return elements.get(id);};
const saved=[{title:'Saved original',source:'preserved'}],revoked=[];let consent=false,savedCalls=0;
const ctx=vm.createContext({console,URL:{revokeObjectURL:url=>revoked.push(url)},document:{readyState:'complete',getElementById:el,createElement:()=>({appendChild(){}}),addEventListener(){}},confirm:()=>consent,getCurrentStudioContent:()=>({title:'old'}),runGeminiStudioCommand:async()=>{},saveStudioProject:async()=>{savedCalls++;},restoreStudioProject:async()=>{},setAIStatus:()=>{},topics:{customScript:{title:'Open work',slides:[{mediaItems:[{local:true,url:'blob:open'}]}]}},activeTikTokTopic:'customScript',activeTopic:'customScript',activeTab:'tiktok',currentSlideIndex:0,activeTikTokSlide:0,getSceneMedia:s=>s.mediaItems||[],invalidateGeneratedVoiceover(){},deleteHumanVoiceRecording(){},socialVideo:null,newsImg:null,newsCaptionDirty:false,socialDrafts:{x:'draft'},restoredProjectUrls:[],newsInput(){},initSlideButtons(){},initTikTokSlideButtons(){},updateTikTokInputs(){},renderCanvas(){}});ctx.window=ctx;ctx.AbortController=AbortController;ctx.setTimeout=setTimeout;ctx.clearTimeout=clearTimeout;
vm.runInContext(fs.readFileSync('public/production-core.js','utf8'),ctx);vm.runInContext(fs.readFileSync('public/studio-production.js','utf8'),ctx);
el('studio-source-text').value='Source material';el('production-orientation').value='landscape';el('news-handle').value='@brand';
assert.equal(ctx.getCurrentStudioContent().sourceMaterial,'Source material');ctx.StudioProduction.state.replaceFromSource=true;assert.equal(ctx.getCurrentStudioContent().title,undefined);assert.equal(ctx.getCurrentStudioContent().mode,'new-from-source');ctx.StudioProduction.state.replaceFromSource=false;await ctx.saveStudioProject();assert.equal(savedCalls,1);assert.equal(ctx.topics.customScript.productionSource.orientation,'landscape');
el('studio-source-text').value='';assert.equal(ctx.getCurrentStudioContent().sourceMaterial,'');
ctx.StudioProduction.reset();assert.equal(ctx.topics.customScript.title,'Open work');assert.equal(revoked.length,0);
consent=true;ctx.StudioProduction.state.busy=true;ctx.StudioProduction.reset();assert.equal(ctx.topics.customScript.title,'Open work');ctx.StudioProduction.state.busy=false;
ctx.StudioProduction.reset();assert.equal(ctx.topics.customScript.title,'مشروع جديد');assert.equal(el('news-handle').value,'@brand');assert.deepEqual(saved,[{title:'Saved original',source:'preserved'}]);assert(revoked.includes('blob:open'));assert.equal(Object.keys(ctx.socialDrafts).length,0);
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
// Data scenes must request real media, not silently count an empty background as complete.
let searches=0;ctx.URL=URL;ctx.STUDIO_PREVIEW_PUBLIC={anonKey:'test'};ctx.fetch=async()=>{searches++;return {ok:true,json:async()=>({items:[{id:91,type:'video',mediaUrl:'https://videos.pexels.com/finance.mp4',pageUrl:'https://www.pexels.com/video/finance-91/',creator:'Test',duration:30}]})};};ctx.addSceneMedia=(s,m)=>{s.mediaItems=[...(s.mediaItems||[]),m];};
const numericScene={title:'تكلفة القرض',visualType:'data',visualQuery:'finance calculator infographic',voiceover:'القرض 20 مليون دينار',duration:12};
await ctx.StudioProduction.mediaFor([numericScene],true);assert.equal(searches,1);assert.equal(numericScene.mediaItems[0].kind,'video');ctx.topics.customScript.slides=[numericScene];assert(ctx.StudioProduction.productionReport().join('\n').includes('أرقام فوق وسائط'));
numericScene.mediaItems=[];assert(ctx.StudioProduction.productionReport().join('\n').includes('تحتاج استكمال'));
console.log('Visual completeness regression passed: numeric scenes fetch media and missing visuals are reported.');

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
