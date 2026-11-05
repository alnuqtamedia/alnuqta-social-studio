import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {chromium} from 'playwright';
const exec=promisify(execFile),STUDIO='https://alnuqta-social-studio.vercel.app';
const hosts=new Set(['alnuqta-social-studio.vercel.app','zsqvmuqlmtnhndwuqlfy.supabase.co','images.pexels.com','videos.pexels.com','upload.wikimedia.org','thumb.wikimedia.org','fonts.googleapis.com','fonts.gstatic.com']);
async function atomic(file,value){const tmp=file+'.tmp';await fs.writeFile(tmp,JSON.stringify(value),{mode:0o600});await fs.rename(tmp,file);}
function wav(samples,rate){const b=Buffer.alloc(44+samples.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);samples.forEach((v,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*(v<0?32768:32767)),44+i*2));return b;}
export class BrowserAdapter{
 constructor({studioUrl=STUDIO,configurePage}={}){const u=new URL(studioUrl);if(u.origin!==STUDIO&&!['127.0.0.1','localhost'].includes(u.hostname))throw Error('invalid_studio_origin');this.studioUrl=studioUrl;this.configurePage=configurePage;}
 async open(job,dir){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1100},timezoneId:'Asia/Baghdad'});page.setDefaultTimeout(180000);
 const requests=[],begins=new WeakMap();page.on('request',r=>begins.set(r,Date.now()));
 page.on('response',r=>{try{const u=new URL(r.url());if(u.hostname==='zsqvmuqlmtnhndwuqlfy.supabase.co'&&u.pathname.startsWith('/functions/v1/')){const req=r.request();let action='';try{action=JSON.parse(req.postData()||'{}').action||'';}catch{}requests.push({service:u.pathname.split('/').at(-1),action,status:r.status(),elapsedMs:Date.now()-(begins.get(req)||Date.now())});}}catch{}});
 const assets=path.join(dir,'assets');await fs.mkdir(assets,{recursive:true});let total=0;
 await page.exposeFunction('workerSaveAsset',async(base64,mime)=>{if(typeof base64!=='string'||base64.length>70*1024*1024||!/^[-\w+/=]*$/.test(base64))throw Error('asset_too_large');const bytes=Buffer.from(base64,'base64');total+=bytes.length;if(total>600*1024*1024)throw Error('job_asset_limit');const hash=createHash('sha256').update(bytes).digest('hex');await fs.writeFile(path.join(assets,hash),bytes,{mode:0o600});return {hash,mime};});
 await page.route('**/*',async route=>{const raw=route.request().url();if(raw.startsWith('data:')||raw.startsWith('blob:'))return route.continue();const u=new URL(raw);
 if(u.hostname==='worker-assets.invalid'){const hash=u.pathname.slice(1);if(!/^[a-f0-9]{64}$/.test(hash))return route.abort();try{return await route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},body:await fs.readFile(path.join(assets,hash))});}catch{return route.abort();}}
 if((u.origin!==new URL(this.studioUrl).origin&&(u.protocol!=='https:'||!hosts.has(u.hostname)))||u.username||u.password||(u.port&&u.origin!==new URL(this.studioUrl).origin))return route.abort();return route.continue();});
 try{await this.configurePage?.(page);await page.goto(this.studioUrl,{waitUntil:'load',timeout:45000});await page.waitForFunction(()=>window.StudioProduction&&window.StudioSceneContract);
 await page.evaluate(input=>{document.getElementById('studio-source-text').value=input.source;document.getElementById('video-total-duration').value=input.duration;document.getElementById('video-sync-mode').value='fit-audio';document.getElementById('production-orientation').value=input.orientation;document.getElementById('video-quality').value=String(input.quality||720);document.getElementById('production-auto').checked=false;document.getElementById('ai-command-input').value=input.command+'\nأنتج فيديو '+input.duration+' ثانية '+(input.orientation==='landscape'?'أفقي':'عمودي')+'.';StudioProduction.state.abort=new AbortController();},job.input);
 if(job.input.audio){const encoded=(await fs.readFile(path.join(dir,'input-audio.bin'))).toString('base64');await page.evaluate(async({encoded,mime})=>{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));humanVoiceoverBlob=new Blob([bytes],{type:mime});humanVoiceoverUrl=URL.createObjectURL(humanVoiceoverBlob);const ctx=new AudioContext();try{humanVoiceoverDuration=(await ctx.decodeAudioData(bytes.buffer.slice(0))).duration;}finally{await ctx.close();}activeVoiceSource='human';},{encoded,mime:job.input.audio.mime});}
 const checkpoint=path.join(dir,'checkpoint.json');let saved;try{saved=JSON.parse(await fs.readFile(checkpoint,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(saved)await page.evaluate(async saved=>{
 const restore=async item=>{const bytes=await(await fetch('https://worker-assets.invalid/'+item.hash)).arrayBuffer();return new Blob([bytes],{type:item.mime});};
 for(const slide of saved.topic.slides){for(const m of slide.mediaItems||[]){if(m.workerAsset)m.url=URL.createObjectURL(await restore(m.workerAsset));}slide.mediaUrl='';slide.mediaVideoUrl='';}
 topics.customScript=saved.topic;activeTopic=activeTikTokTopic='customScript';activeTab='tiktok';switchTab('tiktok');
 if(saved.audio&&saved.voiceSource==='human'){humanVoiceoverBlob=await restore(saved.audio);humanVoiceoverUrl=URL.createObjectURL(humanVoiceoverBlob);humanVoiceoverDuration=saved.audioDuration;aiSceneDurations=saved.durations;activeVoiceSource='human';}
 if(saved.audio&&saved.voiceSource!=='human'){aiVoiceoverBlob=await restore(saved.audio);aiVoiceoverUrl=URL.createObjectURL(aiVoiceoverBlob);aiVoiceoverDuration=saved.audioDuration;aiSceneDurations=saved.durations;aiNarrationText=saved.narration;activeVoiceSource='gemini';}
 updateTikTokInputs();renderCanvas();
 },saved);
 const save=async()=>{const snapshot=await page.evaluate(async()=>{
 const encode=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.slice(r.result.lastIndexOf(',')+1));r.onerror=reject;r.readAsDataURL(blob);});
 const topic=JSON.parse(JSON.stringify(topics[activeTikTokTopic]));for(let i=0;i<topic.slides.length;i++){
 topic.slides[i].mediaItems=JSON.parse(JSON.stringify(getSceneMedia(topics[activeTikTokTopic].slides[i])));
 for(const m of topic.slides[i].mediaItems){if(m.loadStatus==='failed')continue;const r=await fetch(m.url);if(!r.ok)throw Error('تعذر حفظ ملف المشهد');const b=await r.blob();m.workerAsset=await workerSaveAsset(await encode(b),b.type);delete m.url;}
 topic.slides[i].mediaUrl='';topic.slides[i].mediaVideoUrl='';}
 const voice=getActiveVoiceover(),blob=voice?.source==='human'?window.humanVoiceoverBlob:window.aiVoiceoverBlob;return {topic,audio:blob?await workerSaveAsset(await encode(blob),blob.type):null,voiceSource:voice?.source,audioDuration:voice?.duration||0,durations:window.aiSceneDurations,narration:window.aiNarrationText||''};
 });snapshot.requests=[...(saved?.requests||[]),...requests.splice(0)];await atomic(checkpoint,snapshot);saved=snapshot;};
 return {close:()=>browser.close(),run:async stage=>{
 await page.evaluate(()=>{StudioProduction.state.abort=new AbortController();});
 if(stage==='plan'){await page.evaluate(async()=>{await runGeminiStudioCommand();const slides=topics[activeTikTokTopic]?.slides||[];if(!slides.length||document.getElementById('ai-status-dot')?.classList.contains('bg-red-500'))throw Error(document.getElementById('production-progress').textContent||'فشل التخطيط');for(const s of slides)StudioSceneContract.apply(s);});await save();}
 if(stage==='media'){const result=await page.evaluate(async()=>{const slides=topics[activeTikTokTopic].slides;const r=await StudioProduction.mediaFor(slides,true);return {...r,error:StudioProduction.visualReadinessError(slides)};});await save();if(result.missing||result.error){const technical=await page.evaluate(()=>StudioProduction.state.mediaDiagnostics?.flatMap(d=>d.stages.filter(s=>s.stage==='review-failed'||s.stage==='search-failed').map(s=>s.detail)).find(s=>/مهلة|429|quota|503|network/i.test(s)));throw Error(technical||result.error||'وسائط ناقصة');}}
 if(stage==='voice'){await page.evaluate(async duration=>{if(getActiveVoiceover()?.source==='human'){const slides=topics[activeTikTokTopic].slides;aiSceneDurations=await detectNarrationSceneDurations(humanVoiceoverBlob,slides.map(s=>s.voiceover),humanVoiceoverDuration);slides.forEach((s,i)=>s.duration=aiSceneDurations[i]);}else await StudioProduction.narration(topics[activeTikTokTopic].slides,duration);if(!getActiveVoiceover())throw Error('التعليق غير مكتمل');},job.input.duration);await save();}
 if(stage==='render'){
 const captured=await page.evaluate(async()=>{await StudioProduction.render();const input=StudioProduction.state.ffmpegInput;if(!input)throw Error('فشل التقاط الفيديو');
 const offline=new OfflineAudioContext(1,input.buffer.length,input.buffer.sampleRate);const mix=StudioSoundscape.createMix(offline,{narration:input.buffer,slides:input.slides,durations:input.durations,prepared:input.prepared,destination:offline.destination,monitor:false});let audio;try{mix.start(0);audio=await offline.startRendering();}finally{mix.stop();}
 const bytes=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.slice(r.result.lastIndexOf(',')+1));r.onerror=reject;r.readAsDataURL(input.blob);});
 return {video:bytes,samples:Array.from(audio.getChannelData(0)),rate:audio.sampleRate,duration:input.duration,target:input.target,rendered:StudioProduction.state.renderedMedia.map(s=>[...s]),diagnostics:window.lastExportDiagnostics};});
 if(captured.rendered.some((m,i)=>!m.length&&!(saved?.topic?.slides?.[i]?.explicitGraphics||saved?.topic?.slides?.[i]?.visualType==='data'||saved?.topic?.slides?.[i]?.visualType==='text-only')))throw Error('لم تُرسم وسائط المشهد');
 await fs.writeFile(path.join(dir,'capture.bin'),Buffer.from(captured.video,'base64'));await fs.writeFile(path.join(dir,'mix.wav'),wav(captured.samples,captured.rate));
 const temporary=path.join(dir,'output.tmp.mp4');await exec('ffmpeg',['-v','error','-y','-i',path.join(dir,'capture.bin'),'-i',path.join(dir,'mix.wav'),'-map','0:v:0','-map','1:a:0','-vf','setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=2','-af','asetpts=PTS-STARTPTS','-t',String(captured.duration),'-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',temporary],{timeout:240000,maxBuffer:1024*1024});
 const probe=JSON.parse((await exec('ffprobe',['-v','error','-show_streams','-show_format','-of','json',temporary])).stdout),video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
 if(!video||!audio||video.pix_fmt!=='yuv420p'||Math.abs(Number(video.duration)-Number(audio.duration))>.5||Math.abs(Number(probe.format.duration)-captured.target)>Math.max(1,captured.target*.03))throw Error('فشل فحص MP4 والمدة والتزامن');
 await fs.rename(temporary,path.join(dir,'output.mp4'));delete captured.video;delete captured.samples;await atomic(path.join(dir,'verification.json'),{...captured,probe});
 }
 }};
 }catch(e){await browser.close();throw e;}
 }
}
