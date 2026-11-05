/* Real worker adapter + native FFmpeg. Provider responses and voice are synthetic. */
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';import {execFileSync} from 'node:child_process';import {BrowserAdapter} from '../production-server/studio-adapter.mjs';
const dir=path.resolve('artifacts/background-worker');await fs.mkdir(dir,{recursive:true});const clip=path.join(dir,'clip.webm'),voice=path.join(dir,'voice.wav');
execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=720x1280:rate=24:duration=3','-c:v','libvpx','-b:v','400k','-threads','2',clip]);execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=frequency=440:sample_rate=24000:duration=10','-c:a','pcm_s16le',voice]);
const root=path.resolve('dist'),server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html'));if(!file.startsWith(root+path.sep))throw Error('path');const ext=path.extname(file);res.setHeader('Content-Type',ext==='.html'?'text/html':ext==='.js'?'text/javascript':ext==='.ttf'?'font/ttf':'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let searches=0,reviews=0,plans=0;
const adapter=new BrowserAdapter({studioUrl:'http://127.0.0.1:'+server.address().port,configurePage:async page=>{
 await page.addInitScript(()=>{window.tailwind={config:{}};});
 await page.route('https://videos.pexels.com/**',async r=>r.fulfill({status:200,contentType:'video/webm',headers:{'Access-Control-Allow-Origin':'*'},body:await fs.readFile(clip)}));
 await page.route('https://images.pexels.com/**',r=>r.fulfill({status:200,contentType:'image/svg+xml',headers:{'Access-Control-Allow-Origin':'*'},body:'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="blue"/></svg>'}));
 await page.route('**/functions/v1/**',async r=>{const b=r.request().postDataJSON(),endpoint=r.request().url().split('/').at(-1);let data;
 if(endpoint==='pexels-search-preview'){searches++;data={results:b.searches.map((s,i)=>({items:[{id:i+searches*10,type:'video',mediaUrl:'https://videos.pexels.com/video-files/'+(i+searches*10)+'/clip.webm',preview:'https://images.pexels.com/videos/'+(i+searches*10)+'/poster.jpg',pageUrl:'https://www.pexels.com/video/123/',creator:'fixture',duration:3}]}))};}
 else if(b.action==='review-media'){reviews++;data={reviews:b.reviews.map(s=>({scene:s.scene,intent:'illustrative',candidates:s.candidates.map(c=>({id:c.id,safe:true,score:.95,reason:'fixture'}))}))};}
 else if(b.action==='align-audio')data={complete:true,segments:[{scene:1,start:0,text:'فقرة أولى'},{scene:2,start:5,text:'فقرة ثانية'}]};
 else{plans++;data={action:'replace',outputType:'video',title:'اختبار العامل',subtitle:'fixture',slides:[0,1].map(i=>({type:'cover',title:'مشهد '+i,header:'عنوان',subtitle:'نص الاختبار',points:[],duration:5,voiceover:i?'فقرة ثانية':'فقرة أولى',visualType:'broll',evidenceKind:'generic_illustration',visualQuery:i?'hands writing notebook':'hands typing keyboard',motion:'zoom-in',transition:'cut',cinema:{look:'natural',motion:'static',intensity:.2,transition:'cut',transitionSeconds:0}}))};}
 await r.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
 });
}});
try{
 await fs.copyFile(voice,path.join(dir,'input-audio.bin'));const job={input:{command:'أنشئ فيديو 10 ثواني بلا موسيقى وبلا مؤثرات',source:'فقرة أولى. فقرة ثانية.',duration:10,quality:720,orientation:'portrait',audio:{mime:'audio/wav'}}};
 let session=await adapter.open(job,dir);await session.run('plan');await session.run('media');await session.run('voice');await session.close();const before={plans,searches,reviews};
 // Browser restart: restore downloaded bytes and the human voice; render only.
 session=await adapter.open(job,dir);try{await session.run('render');}finally{await session.close();}
 assert.deepEqual({plans,searches,reviews},before);const proof=JSON.parse(await fs.readFile(path.join(dir,'verification.json'),'utf8'));assert(proof.rendered.every(m=>m.includes('video')));assert.equal(proof.probe.streams.find(s=>s.codec_type==='video').pix_fmt,'yuv420p');assert(Math.abs(Number(proof.probe.format.duration)-10)<.2);console.log('PASS: command -> plan -> reviewed/downloaded media -> human voice -> browser restart -> native MP4, with no repeated provider requests on resume. Synthetic provider fixtures only.');
}finally{await new Promise(r=>server.close(r));}
