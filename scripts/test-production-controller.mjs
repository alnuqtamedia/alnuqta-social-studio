import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',disabled:false,after(){},removeAttribute(){},classList:{add(){},remove(){}}});return elements.get(id);};
const saved=[{title:'Saved original',source:'preserved'}],revoked=[];let consent=false,savedCalls=0;
const ctx=vm.createContext({console,URL:{revokeObjectURL:url=>revoked.push(url)},document:{readyState:'complete',getElementById:el,createElement:()=>({}),addEventListener(){}},confirm:()=>consent,getCurrentStudioContent:()=>({title:'old'}),runGeminiStudioCommand:async()=>{},saveStudioProject:async()=>{savedCalls++;},restoreStudioProject:async()=>{},setAIStatus:()=>{},topics:{customScript:{title:'Open work',slides:[{mediaItems:[{local:true,url:'blob:open'}]}]}},activeTikTokTopic:'customScript',activeTopic:'customScript',currentSlideIndex:0,activeTikTokSlide:0,getSceneMedia:s=>s.mediaItems||[],invalidateGeneratedVoiceover(){},deleteHumanVoiceRecording(){},socialVideo:null,newsImg:null,newsCaptionDirty:false,socialDrafts:{x:'draft'},restoredProjectUrls:[],newsInput(){},initSlideButtons(){},initTikTokSlideButtons(){},updateTikTokInputs(){},renderCanvas(){}});ctx.window=ctx;
vm.runInContext(fs.readFileSync('public/production-core.js','utf8'),ctx);vm.runInContext(fs.readFileSync('public/studio-production.js','utf8'),ctx);
el('studio-source-text').value='Source material';el('production-orientation').value='landscape';el('news-handle').value='@brand';
assert.equal(ctx.getCurrentStudioContent().sourceMaterial,'Source material');ctx.StudioProduction.state.replaceFromSource=true;assert.equal(ctx.getCurrentStudioContent().title,undefined);assert.equal(ctx.getCurrentStudioContent().mode,'new-from-source');ctx.StudioProduction.state.replaceFromSource=false;await ctx.saveStudioProject();assert.equal(savedCalls,1);assert.equal(ctx.topics.customScript.productionSource.orientation,'landscape');
el('studio-source-text').value='';assert.equal(ctx.getCurrentStudioContent().sourceMaterial,'');
ctx.StudioProduction.reset();assert.equal(ctx.topics.customScript.title,'Open work');assert.equal(revoked.length,0);
consent=true;ctx.StudioProduction.state.busy=true;ctx.StudioProduction.reset();assert.equal(ctx.topics.customScript.title,'Open work');ctx.StudioProduction.state.busy=false;
ctx.StudioProduction.reset();assert.equal(ctx.topics.customScript.title,'مشروع جديد');assert.equal(el('news-handle').value,'@brand');assert.deepEqual(saved,[{title:'Saved original',source:'preserved'}]);assert(revoked.includes('blob:open'));assert.equal(Object.keys(ctx.socialDrafts).length,0);
console.log('Controller checks passed: source clearing, snapshot metadata, confirmation, busy guard, active-media cleanup and brand preservation.');

// Final renderer must show numeric details rather than a title-only data scene.
const painted=[];const canvasCtx={fillRect(){},createLinearGradient(){return {addColorStop(){}};},measureText(t){return {width:String(t).length*10};},fillText(t){painted.push(t);},drawImage(){}};ctx.newsLogoImg=null;ctx.getActiveVoiceover=()=>null;
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
