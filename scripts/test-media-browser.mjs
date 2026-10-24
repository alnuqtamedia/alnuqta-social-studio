/* Real browser export with synthetic fixtures: no provider keys or production content. */
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import http from 'node:http';import path from 'node:path';import {execFileSync} from 'node:child_process';import {chromium} from 'playwright';
const out=path.resolve('artifacts/media-browser');await fs.mkdir(out,{recursive:true});
const image=path.join(out,'source-image.png'),video=path.join(out,'source-video.webm'),voice=path.join(out,'voice.wav');
execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=0x168ac0:s=720x1280','-vf','drawbox=x=130:y=160:w=420:h=240:color=yellow:t=fill','-frames:v','1',image]);
execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=720x1280:rate=24:duration=4','-c:v','libvpx','-b:v','900k','-threads','2',video]);
execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=frequency=440:sample_rate=24000:duration=9','-c:a','pcm_s16le',voice]);
const root=path.resolve('dist'),types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.ttf':'font/ttf','.wasm':'application/wasm'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html'));if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({...(process.env.STUDIO_CHROMIUM_EXECUTABLE?{executablePath:process.env.STUDIO_CHROMIUM_EXECUTABLE}:{channel:'chromium'}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[],requests=[];await page.addInitScript(()=>{window.tailwind={config:{}};});page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith(origin)||u.startsWith('data:')||u.startsWith('blob:'))return r.continue();requests.push(u);return r.abort();});
try{
 await page.goto(origin,{waitUntil:'load'});await page.waitForFunction(()=>window.StudioProduction&&window.StudioMediaLibrary&&window.StudioFFmpeg);
 await page.evaluate(()=>StudioDesignPack.load());
 // Upload through the real library UI, then verify both DB persistence and matching.
 await page.locator('summary').filter({hasText:'مكتبة الصور والفيديوهات'}).click();
 await page.locator('#media-library-tags').fill('hospital pharmacy مستشفى صيدلية');
 await page.locator('#media-library-files').setInputFiles([image,video]);
 await page.waitForFunction(()=>document.getElementById('media-library-status').textContent.includes('حُفظت'));
 await page.reload({waitUntil:'load'});await page.waitForFunction(()=>StudioProduction&&StudioMediaLibrary);
 await page.evaluate(()=>StudioDesignPack.load());
 const setup=await page.evaluate(async audio=>{
  const blob=new Blob([Uint8Array.from(atob(audio),x=>x.charCodeAt(0))],{type:'audio/wav'});window.humanVoiceoverBlob=blob;window.humanVoiceoverUrl=URL.createObjectURL(blob);window.humanVoiceoverDuration=9;window.activeVoiceSource='human';window.aiSceneDurations=[3,3,3];window.aiAlignmentMethod='manual';
  document.getElementById('studio-source-text').value='العراق';document.getElementById('video-total-duration').value='9';document.getElementById('video-quality').value='720';document.getElementById('video-sync-mode').value='fit-audio';
  topics.customScript={title:'اختبار وسائط اصطناعية',soundscape:{version:1,style:'none',music:false,sfx:false},slides:[{title:'صورة اختبار',visualType:'image',visualQuery:'hospital',voiceover:'صورة اصطناعية للاختبار',duration:3,mediaItems:[]},{title:'فيديو اختبار',visualType:'broll',visualQuery:'pharmacy',voiceover:'فيديو اصطناعي للاختبار',duration:3,mediaItems:[]},{title:'جرافيك مقصود',visualType:'illustrative',explicitGraphics:true,voiceover:'رسم توضيحي للاختبار',duration:3,mediaItems:[]}]};activeTopic=activeTikTokTopic='customScript';activeTab='tiktok';switchTab('tiktok');StudioProduction.state.abort=new AbortController();
  StudioProduction.applyBroadcastDirection({...topics.customScript,productionContract:{version:1}},'تقرير تجريبي');const result=await StudioProduction.mediaFor(topics.customScript.slides,true);if(result.missing)throw Error(JSON.stringify(result));const diagnostics=structuredClone(StudioProduction.state.mediaDiagnostics);
  const again=await StudioProduction.mediaFor(topics.customScript.slides,true);if(again.missing)throw Error('Repeat failed');return {result,diagnostics,types:topics.customScript.slides.map(s=>getSceneMedia(s).map(m=>m.kind)),voice:window.humanVoiceoverUrl};
 },(await fs.readFile(voice)).toString('base64'));
 assert.deepEqual(setup.types,[['image'],['video'],[]]);assert(setup.diagnostics.slice(0,2).every(x=>x.stages.some(s=>s.stage==='library')));assert(!requests.some(u=>u.includes('/functions/v1/')),'Library reuse called provider');
 const overlay=await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;const ctx=canvas.getContext('2d'),asset=await loadExportMedia(getSceneMedia(topics.customScript.slides[0])[0]);StudioProduction.paint(ctx,topics.customScript.slides[1],asset,720,1280,3,9);return canvas.toDataURL().split(',')[1];});await fs.writeFile(path.join(out,'broadcast-overlay.png'),Buffer.from(overlay,'base64'));
 await page.locator('#production-preview').click();await page.waitForFunction(()=>!StudioProduction.state.busy,null,{timeout:60000});
 let preview=await page.evaluate(()=>({error:document.getElementById('production-progress').textContent,hasInput:Boolean(StudioProduction.state.ffmpegInput),d:window.lastExportDiagnostics}));assert(preview.hasInput,JSON.stringify(preview));
 await page.locator('#production-ffmpeg').click();await page.waitForFunction(()=>!StudioProduction.state.busy,null,{timeout:180000});
 const result=await page.evaluate(async()=>{if(!StudioProduction.state.previewPassed||socialVideo.blob.type!=='video/mp4')throw Error(document.getElementById('production-progress').textContent);const bytes=await socialVideo.blob.arrayBuffer();let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return {encoded:btoa(s),diagnostics:window.lastExportDiagnostics,rendered:StudioProduction.state.renderedMedia.map(x=>[...x]),report:document.getElementById('production-report').textContent};});
 assert.deepEqual(result.rendered,[['image'],['video'],['graphics']]);assert.equal(result.diagnostics.source,'ffmpeg-wasm-local');
 const output=path.join(out,'mixed-media-proof.mp4');await fs.writeFile(output,Buffer.from(result.encoded,'base64'));
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));assert.equal(probe.streams.find(x=>x.codec_type==='video').pix_fmt,'yuv420p');assert(Math.abs(Number(probe.format.duration)-9)<.15);
 for(const [label,time] of [['image',1],['video-a',4.5],['video-b',5.3],['graphics',7.5]])execFileSync('ffmpeg',['-v','error','-y','-ss',String(time),'-i',output,'-frames:v','1',path.join(out,label+'.png')]);
 // Independently decoded video frames must change; this is not a poster masquerading as a clip.
 const pixels=t=>execFileSync('ffmpeg',['-v','error','-ss',String(t),'-i',output,'-frames:v','1','-vf','crop=600:220:60:150,scale=60:22','-f','rawvideo','-pix_fmt','rgb24','-']);
 const pa=pixels(4.5),pb=pixels(5.3);let changed=0;for(let i=0;i<pa.length;i++)if(Math.abs(pa[i]-pb[i])>15)changed++;assert(changed/pa.length>.005,'Exported video is static');
 // Missing video stays missing and cannot invoke another speech generation or export.
 const blocked=await page.evaluate(async()=>{const s=topics.customScript.slides[1],n=window.humanVoiceoverUrl;s.mediaItems=[];s.mediaUrl='';s.mediaVideoUrl='';let message='';try{await StudioProduction.render();}catch(e){message=e.message;}return {message,unchanged:n===window.humanVoiceoverUrl,type:s.visualType};});assert.match(blocked.message,/وسائط/);assert(blocked.unchanged);assert.equal(blocked.type,'broll');
 assert.equal(errors.length,0,errors.join('\n'));await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({setup,diagnostics:result.diagnostics,rendered:result.rendered,blocked,probe,errors},null,2));console.log('PASS: persistent library -> image/video/intentional graphics -> real browser MP4 -> independent moving-frame decode. No provider requests.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
