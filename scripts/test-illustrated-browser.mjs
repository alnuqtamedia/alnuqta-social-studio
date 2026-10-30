import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {chromium} from 'playwright';

const testSeconds=Number(process.env.CINEMA_TEST_SECONDS||6),testOrientation=process.env.CINEMA_TEST_ORIENTATION||'portrait';
assert([6,45,120].includes(testSeconds));assert(['portrait','landscape'].includes(testOrientation));
const config={testSeconds,testOrientation};
const out=path.resolve('artifacts/illustrated-browser',testOrientation+'-'+testSeconds);
await fs.mkdir(out,{recursive:true});
const root=path.resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const data=await fs.readFile(file);
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({...(process.env.STUDIO_CHROMIUM_EXECUTABLE?{executablePath:process.env.STUDIO_CHROMIUM_EXECUTABLE}:process.env.PW_HEADLESS_SHELL?{}:{channel:'chromium'}),headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];
// The external Tailwind CDN is intentionally blocked; supply only its configuration namespace.
await page.addInitScript(()=>{window.tailwind={config:{}};});
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/*',route=>{
 const url=route.request().url();
 return url.startsWith(origin)||url.startsWith('data:')||url.startsWith('blob:')?route.continue():route.abort();
});
try{
 await page.goto(origin,{waitUntil:'load'});
 await page.waitForFunction(()=>window.StudioProduction&&window.StudioIllustration&&window.lottie&&window.StudioFFmpeg);
 await page.evaluate(()=>StudioDesignPack.load());
 const frames=await page.evaluate(async()=>{
  const result=[];
  for(const [W,H] of [[720,1280],[1280,720]])for(const preset of Object.keys(StudioIllustration.names)){
   const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
   const s={title:'تصميم توضيحي — '+StudioIllustration.names[preset],voiceover:'هذا رسم توضيحي للاختبار وليس تصويراً لحدث حقيقي',visualType:'broll',typography:'kinetic',illustration:{version:1,preset}};
   StudioProduction.paint(ctx,s,null,W,H,1,6);await new Promise(r=>setTimeout(r,25));StudioProduction.paint(ctx,s,null,W,H,1,6);
   const a=c.toDataURL();StudioProduction.paint(ctx,s,null,W,H,4,6);const b=c.toDataURL();StudioProduction.paint(ctx,s,null,W,H,1,6);const again=c.toDataURL();
   // Pixel comparison restricted to the illustration lane (exclude moving text).
   const snap=t=>{ctx.clearRect(0,0,W,H);StudioIllustration.draw(ctx,s,W,H,t);return c.toDataURL();};
   const x=snap(1),xPixels=ctx.getImageData(0,0,W,H).data,y=snap(4),z=snap(1),zPixels=ctx.getImageData(0,0,W,H).data;let error=0,changed=0;for(let k=0;k<xPixels.length;k++){const d=Math.abs(xPixels[k]-zPixels[k]);error+=d;if(d>4)changed++;}const mae=error/xPixels.length,ratio=changed/xPixels.length;if(x===y||mae>.1||ratio>.001)throw Error('Lottie frame seek failed: '+preset+' '+W+' static='+String(x===y)+' mae='+mae+' ratio='+ratio);
   result.push({preset,W,H,png:b.split(',')[1]});
  }return result;
 });
 for(const f of frames)await fs.writeFile(path.join(out,f.preset+'-'+f.W+'.png'),Buffer.from(f.png,'base64'));
 // Rejected country material must not enter media or the rendered scene.
 let searches=0;await page.route('**/functions/v1/pexels-search-preview',async route=>{searches++;const batch=route.request().postDataJSON().searches;assert(Array.isArray(batch)&&batch.length<=3);for(const q of batch)assert.match(q.query,/Iraq/);await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:batch.map(()=>({items:[{id:123,type:'photo',creator:'fixture',mediaUrl:'https://images.pexels.com/photos/123/x.jpg',preview:'https://images.pexels.com/photos/123/x.jpg',pageUrl:'https://www.pexels.com/photo/china-123/'}]}))})});});
 const policy=await page.evaluate(async()=>{
  document.getElementById('studio-source-text').value='الازدحام في العراق';
  const slides=[{title:'السيارات في العراق',voiceover:'السيارات في العراق كثيرة والزحام يستهلك الوقت',visualType:'broll',visualQuery:'Baghdad traffic street',duration:3}];
  await StudioProduction.mediaFor(slides,true);if(getSceneMedia(slides[0]).length||slides[0].illustration||!StudioProduction.missingVisuals(slides).length)throw Error('Unverified stock bypassed geographic gate');
  topics.customScript={title:'اختبار العراق',soundscape:StudioSoundscape.fromCommand('سينمائي'),slides};activeTopic=activeTikTokTopic='customScript';activeTab='tiktok';
  document.getElementById('production-correction').value='حوّل جميع المشاهد إلى جرافيك وإنفوغرافيك';const before=slides[0].voiceover;await StudioProduction.correctCurrent();if(slides[0].voiceover!==before)throw Error('Graphic correction changed narration');
  return {preset:slides[0].illustration.preset,country:slides[0].editorialGeography.countries[0].country};
 });assert(searches>=1);assert.equal(policy.country,'IQ');
 // Use a short synthetic capture and a complete independent audio track.
 const raw=path.join(out,'input.mp4'),wav=path.join(out,'complete.wav');
 execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=320x568:rate=30:duration=6.6','-f','lavfi','-i','sine=frequency=220:duration=6.6','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac',raw]);
 execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=frequency=880:sample_rate=24000:duration=6','-c:a','pcm_s16le',wav]);
 const final=await page.evaluate(async({video,audio})=>{
  const blob=s=>new Blob([Uint8Array.from(atob(s),x=>x.charCodeAt(0))]);const output=await StudioFFmpeg.finalize(blob(video),blob(audio),6);return Array.from(new Uint8Array(await output.blob.arrayBuffer()));
 },{video:(await fs.readFile(raw)).toString('base64'),audio:(await fs.readFile(wav)).toString('base64')});
 const file=path.join(out,'final.mp4');await fs.writeFile(file,Buffer.from(final));
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
 assert.equal(probe.streams.find(s=>s.codec_type==='video').codec_name,'h264');assert.equal(probe.streams.find(s=>s.codec_type==='audio').codec_name,'aac');assert(Math.abs(Number(probe.format.duration)-6)<.1);
 const tail=execFileSync('ffmpeg',['-v','error','-ss','5.8','-i',file,'-vn','-ac','1','-ar','8000','-f','f32le','-']);let energy=0;for(let i=0;i<tail.length;i+=4)energy+=tail.readFloatLE(i)**2;assert(Math.sqrt(energy/(tail.length/4))>.03,'Last audio word/marker missing');

 // Exercise the actual preview -> repair button -> downloadable MP4 path with music.
 const repaired=await page.evaluate(async wavEncoded=>{
  const wav=new Blob([Uint8Array.from(atob(wavEncoded),x=>x.charCodeAt(0))],{type:'audio/wav'});
  window.humanVoiceoverBlob=wav;window.humanVoiceoverUrl=URL.createObjectURL(wav);window.humanVoiceoverDuration=6;window.activeVoiceSource='human';
  window.aiSceneDurations=[6];window.aiAlignmentMethod='manual';document.getElementById('video-total-duration').value='6';document.getElementById('video-sync-mode').value='fit-audio';
  StudioProduction.state.abort=new AbortController();await StudioProduction.render();
  if(document.getElementById('production-ffmpeg').disabled)throw Error('Repair button not enabled');
  document.getElementById('production-ffmpeg').click();
  while(StudioProduction.state.busy)await new Promise(r=>setTimeout(r,100));
  if(!StudioProduction.state.previewPassed||window.lastExportDiagnostics.source!=='ffmpeg-wasm-local')throw Error('Full repair failed: '+document.getElementById('production-report').textContent);
  if(document.getElementById('production-download').disabled)throw Error('Validated MP4 download blocked');
  const reader=new FileReader(),encoded=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(socialVideo.blob);});
  const oldBlob=socialVideo.blob;topics.customScript.slides[0].title+=' تعديل';
  let staleRejected=false;try{await StudioProduction.finalizeMp4();}catch{staleRejected=true;}if(!staleRejected||socialVideo.blob!==oldBlob)throw Error('Stale edit bypassed repair signature');
  return {encoded,diagnostics:window.lastExportDiagnostics};
 },(await fs.readFile(wav)).toString('base64'));
 const repairedFile=path.join(out,'repaired-with-graphics-and-music.mp4');await fs.writeFile(repairedFile,Buffer.from(repaired.encoded,'base64'));
 const repairedProbe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',repairedFile],{encoding:'utf8'}));
 assert.equal(repairedProbe.streams.find(s=>s.codec_type==='video').codec_name,'h264');assert.equal(repairedProbe.streams.find(s=>s.codec_type==='audio').codec_name,'aac');assert(Math.abs(Number(repairedProbe.format.duration)-6)<.1);
 assert(repaired.diagnostics.soundscape.events>0);assert(repaired.diagnostics.soundscape.credits.some(x=>x.id.startsWith('score-')));
 const decoded=path.join(out,'decoded-illustration.png');execFileSync('ffmpeg',['-v','error','-y','-ss','3','-i',repairedFile,'-frames:v','1',decoded]);
 assert.equal(errors.length,0,errors.join('; '));console.log('Actual Lottie frames, geographic rejection, transactional graphic correction, FFmpeg MP4 and complete audio tail verified',JSON.stringify({frames:frames.length,policy,duration:probe.format.duration}));
 await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({frames:frames.length,policy,duration:probe.format.duration,errors},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
