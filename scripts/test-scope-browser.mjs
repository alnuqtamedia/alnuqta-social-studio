/* Real browser export with synthetic fixtures: no provider keys or production content. */
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import http from 'node:http';import path from 'node:path';import {execFileSync} from 'node:child_process';import {chromium} from 'playwright';
const out=path.resolve('artifacts/scoped-media');await fs.mkdir(out,{recursive:true});
const image=path.join(out,'source-image.png'),video=path.join(out,'source-video.webm'),voice=path.join(out,'voice.wav');
execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=0x168ac0:s=720x1280','-vf','drawbox=x=130:y=160:w=420:h=240:color=yellow:t=fill','-frames:v','1',image]);
execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=720x1280:rate=24:duration=4','-c:v','libvpx','-b:v','900k','-threads','2',video]);
execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=frequency=440:sample_rate=24000:duration=15','-c:a','pcm_s16le',voice]);
const root=path.resolve('dist'),types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.ttf':'font/ttf','.wasm':'application/wasm'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html'));if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({...(process.env.STUDIO_CHROMIUM_EXECUTABLE?{executablePath:process.env.STUDIO_CHROMIUM_EXECUTABLE}:{channel:'chromium'}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[],requests=[];await page.addInitScript(()=>{window.tailwind={config:{}};});page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith(origin)||u.startsWith('data:')||u.startsWith('blob:'))return r.continue();requests.push(u);return r.abort();});

let speechRequests=0,reviewRequests=0;
await page.route('https://videos.pexels.com/**',async r=>r.fulfill({status:200,contentType:'video/webm',headers:{'Access-Control-Allow-Origin':'*'},body:await fs.readFile(video)}));
await page.route('https://images.pexels.com/**',async r=>r.fulfill({status:200,contentType:'image/png',headers:{'Access-Control-Allow-Origin':'*'},body:await fs.readFile(image)}));
await page.route('**/functions/v1/**',async r=>{
 const endpoint=r.request().url().split('/').at(-1),b=r.request().postDataJSON();let data;
 if(endpoint==='gemini-tts-preview'){speechRequests++;throw Error('Human voice must remain intact');}
 if(endpoint==='pexels-search-preview'){const i=['syringe','vial','inspection','supplies','consultation'].findIndex(q=>b.query.includes(q)),id=501+i,type=b.type==='photo'?'photo':'video';assert(i>=0,b.query);data={items:[{id,type,mediaUrl:type==='photo'?'https://images.pexels.com/photos/'+id+'/source.png':'https://videos.pexels.com/video-files/'+id+'/source.webm',preview:'https://images.pexels.com/'+(type==='photo'?'photos':'videos')+'/'+id+'/poster.png',pageUrl:'https://www.pexels.com/'+(type==='photo'?'photo':'video')+'/'+id+'/',creator:'Synthetic fixture',duration:4}]};}
 else if(b.action==='review-media'){reviewRequests++;data={reviews:b.reviews.map(row=>({scene:row.scene,intent:'illustrative',candidates:row.candidates.map(c=>({id:c.id,safe:true,score:.9,reason:'Fixture verdict — not live semantic evaluation'}))}))};}
 else throw Error('Unexpected service '+endpoint);
 await r.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
});
try{
 await page.goto(origin,{waitUntil:'load'});await page.waitForFunction(()=>window.StudioProduction&&window.StudioMediaLibrary&&window.StudioFFmpeg);await page.evaluate(()=>StudioDesignPack.load());
 const before=await page.evaluate(async audio=>{
  const blob=new Blob([Uint8Array.from(atob(audio),x=>x.charCodeAt(0))],{type:'audio/wav'});humanVoiceoverBlob=blob;humanVoiceoverUrl=URL.createObjectURL(blob);humanVoiceoverDuration=15;activeVoiceSource='human';aiSceneDurations=[3,3,3,3,3];
  document.getElementById('studio-source-text').value='تقرير التجميل في العراق';document.getElementById('video-total-duration').value='15';document.getElementById('video-quality').value='720';document.getElementById('video-sync-mode').value='fit-audio';
  const queries=['syringe preparation closeup','hands checking vial label','health inspection team Baghdad','medical supplies','doctor patient consultation'],titles=['حقنة مجهولة','فحص المواد','تحرك صحي','سلسلة الرقابة','خاتمة المحاسبة'];
  topics.customScript={title:'اختبار وظيفي بمواد اصطناعية',slides:queries.map((visualQuery,i)=>({title:titles[i],visualQuery,visualType:i===1?'image':'broll',voiceover:'نص اصطناعي لفحص مسار اللقطات في العراق',duration:3,typography:'kinetic',mediaItems:[]}))};activeTopic=activeTikTokTopic='customScript';activeTab='tiktok';switchTab('tiktok');StudioProduction.state.abort=new AbortController();
  const result=await StudioProduction.mediaFor(topics.customScript.slides,true);let refusal='';try{await StudioProduction.render();}catch(e){refusal=e.message;}
  return {result,missing:StudioProduction.missingVisuals(topics.customScript.slides),refusal,voice:humanVoiceoverUrl};
 },(await fs.readFile(voice)).toString('base64'));
 assert.equal(before.result.missing,1);assert.deepEqual(before.missing.map(x=>x.scene),[3]);assert.match(before.refusal,/المكان|البلد|وسائط/);
 // One explicit original-source upload completes the specific event; other scenes are retained.
 await page.locator('summary').filter({hasText:'مكتبة الصور والفيديوهات'}).click();await page.locator('#media-library-tags').fill('health inspection team Baghdad');await page.locator('#media-library-files').setInputFiles(video);await page.waitForFunction(()=>document.getElementById('media-library-status').textContent.includes('حُفظت'));
 const after=await page.evaluate(async()=>{const r=await StudioProduction.mediaFor(topics.customScript.slides,true);window.scopeLabels=0;const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...a){if(t==='لقطات توضيحية')scopeLabels++;return fill.call(this,t,...a);};return {result:r,voice:humanVoiceoverUrl,roles:topics.customScript.slides.map(s=>getSceneMedia(s)[0]?.editorialReview?.intent||'uploaded-original')};});
 assert.equal(after.result.missing,0);assert.equal(after.voice,before.voice);assert.deepEqual(after.roles,['illustrative','illustrative','uploaded-original','illustrative','illustrative']);
 await page.locator('#production-preview').click();await page.waitForFunction(()=>!StudioProduction.state.busy,null,{timeout:60000});
 const preview=await page.evaluate(()=>({hasInput:!!StudioProduction.state.ffmpegInput,status:document.getElementById('production-progress').textContent}));assert(preview.hasInput,JSON.stringify(preview));
 await page.locator('#production-ffmpeg').click();await page.waitForFunction(()=>!StudioProduction.state.busy,null,{timeout:180000});
 const result=await page.evaluate(async()=>{if(!StudioProduction.state.previewPassed)throw Error(document.getElementById('production-progress').textContent);const a=new Uint8Array(await socialVideo.blob.arrayBuffer());let text='';for(let i=0;i<a.length;i+=8192)text+=String.fromCharCode(...a.subarray(i,i+8192));return {encoded:btoa(text),labels:scopeLabels,rendered:StudioProduction.state.renderedMedia.map(s=>[...s]),voice:humanVoiceoverUrl};});
 assert(result.labels>0);assert.equal(result.voice,before.voice);assert.deepEqual(result.rendered,[['video'],['image'],['video'],['video'],['video']]);assert.equal(speechRequests,0);assert.equal(reviewRequests,1);
 const output=path.join(out,'five-scene-proof.mp4');await fs.writeFile(output,Buffer.from(result.encoded,'base64'));const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));assert.equal(probe.streams.find(x=>x.codec_type==='video').pix_fmt,'yuv420p');assert(Math.abs(Number(probe.format.duration)-15)<.15);
 for(const [label,time] of [['illustrative',1],['image',4],['original',7]])execFileSync('ffmpeg',['-v','error','-y','-ss',String(time),'-i',output,'-frames:v','1',path.join(out,label+'.png')]);
 const pixels=t=>execFileSync('ffmpeg',['-v','error','-ss',String(t),'-i',output,'-frames:v','1','-vf','crop=600:220:60:150,scale=60:22','-f','rawvideo','-pix_fmt','rgb24','-']);const a=pixels(.8),b=pixels(1.6);let changed=0;for(let i=0;i<a.length;i++)if(Math.abs(a[i]-b[i])>15)changed++;assert(changed/a.length>.005);
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({before,after,labels:result.labels,rendered:result.rendered,speechRequests,reviewRequests,probe},null,2));console.log('PASS: five Iraq scenes, four reviewed generic details, one protected event completed by upload, real MP4 frames and label, no narration regeneration. Synthetic fixtures only.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
