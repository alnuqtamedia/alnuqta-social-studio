import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({console,URL,Blob,setTimeout,clearTimeout});ctx.window=ctx;
vm.runInContext(fs.readFileSync('public/editor-media.js','utf8'),ctx);
const api=ctx.StudioEditorMedia,getMedia=s=>s.mediaItems||[];
assert(api.previewCommand('كمل المعاينة'));assert(api.previewCommand('شغّل معاينة الفيديو'));assert(!api.previewCommand('بدل صورة المشهد الثالث'));
const checkItem=async m=>{if(m.url.includes('broken')){m.loadStatus='failed';throw Error('unreadable');}m.loadStatus='ready';};
function hooks(search){return {getMedia,checkItem,prepareLocal(){},needsMedia:s=>!s.explicitGraphics,check(){},status(){},search,orientation:()=> 'portrait',done(){}};}
// An editor's image must survive a planned video slot, a named event and absent rights data.
const voice={url:'blob:original-voice'},scene={title:'خبر من بغداد',voiceover:'التعليق الأصلي',duration:4,requestedVisualType:'broll',editorialGeography:{countries:[{country:'IQ'}]},mediaItems:[{kind:'image',url:'blob:manual-image',local:true,editorSelected:true}]};
let calls=0;const ready=await api.prepare([scene],true,hooks(async()=>{calls++;throw Error('must not search');}));
assert.equal(ready.missing,0);assert.equal(calls,0);assert.equal(scene.mediaItems[0].url,'blob:manual-image');assert.equal(scene.voiceover,'التعليق الأصلي');
// Search/review outages leave editable gaps, never reject the whole assembly.
const gap={title:'مشهد ناقص',duration:3,voiceover:'لا يُحذف هذا الكلام',visualType:'broll',mediaItems:[{kind:'video',url:'https://example.org/broken.mp4'}]};
const partial=await api.prepare([scene,gap],true,hooks(async()=>{calls++;throw Error('provider unavailable');}));
assert.equal(partial.missing,1);assert.equal(calls,3);assert.equal(gap.voiceover,'لا يُحذف هذا الكلام');assert.equal(scene.mediaItems[0].url,'blob:manual-image');
// A readable photo can fill a video gap without source/rights metadata or AI verdicts.
const attempts=[];const found={title:'حدث',visualType:'broll',voiceover:'سرد محفوظ',mediaItems:[]};
const r=await api.prepare([found],true,hooks(async q=>{attempts.push(q);return {items:q.type==='photo'?[{id:8,type:'photo',mediaUrl:'https://example.org/photo.jpg'}]:[]};}));
assert.equal(r.missing,0);assert.equal(found.mediaItems[0].kind,'image');assert.equal(found.voiceover,'سرد محفوظ');assert.deepEqual(attempts.map(x=>x.type),['video','photo']);
// Replace atomically, keep the previous media if a selected file cannot decode.
const old=found.mediaItems[0];await assert.rejects(api.assign(found,[{url:'blob:broken',kind:'video'}],{checkItem,getMedia}),/unreadable/);assert.equal(found.mediaItems[0],old);
await api.assign(found,[{url:'blob:new-editor-video',kind:'video'}],{checkItem,getMedia});assert.equal(found.unusedMedia[0],old);assert.equal(found.mediaItems[0].editorSelected,true);assert.equal(voice.url,'blob:original-voice');
assert.equal(api.kindFor({name:'download.MP4',type:''}),'video');assert.equal(api.kindFor({name:'download.webp',type:'application/octet-stream'}),'image');
// Integration: production gates and the actual asset loader tolerate a broken shot.
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',disabled:false,classList:{add(){},remove(){}},pause(){},load(){},removeAttribute(){}});return elements.get(id);};
Object.assign(ctx,{document:{readyState:'loading',getElementById:el,addEventListener(){}},getCurrentStudioContent(){return {};},runGeminiStudioCommand:async()=>{},saveStudioProject:async()=>{},restoreStudioProject:async()=>{},getSceneMedia:getMedia,topics:{customScript:{slides:[scene,gap],productionContract:{minVideoScenes:5,minMediaRatio:1}}},activeTikTokTopic:'customScript',setAIStatus(){},loadExportMedia:async m=>{await checkItem(m);return {kind:'image',element:{width:10,height:10}};}});
vm.runInContext(fs.readFileSync('public/production-core.js','utf8'),ctx);vm.runInContext(fs.readFileSync('public/studio-production.js','utf8').replace("if(document.readyState==='loading')","window.StudioProduction={drawAssets,visualReadinessError,reportBaselineError};if(document.readyState==='loading')"),ctx);
assert.equal(ctx.StudioProduction.visualReadinessError([scene,gap]),'');assert.equal(ctx.StudioProduction.reportBaselineError([scene,gap]),'');
const assets=[];await ctx.StudioProduction.drawAssets([scene,gap],assets);assert.equal(assets[0].length,1);assert.equal(assets[1].length,0);assert.equal(gap.mediaItems[0].loadStatus,'failed');
console.log('PASS editor media: manual choices preserved; photo/video fallback; outages become preview gaps; atomic replacement; speech retained; actual loader continues.');
