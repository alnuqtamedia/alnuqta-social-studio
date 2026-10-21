import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {chromium} from 'playwright';

const testSeconds=Number(process.env.CINEMA_TEST_SECONDS||6),testOrientation=process.env.CINEMA_TEST_ORIENTATION||'portrait';
assert([6,45,120].includes(testSeconds));assert(['portrait','landscape'].includes(testOrientation));
const config={testSeconds,testOrientation};
const out=path.resolve('artifacts/creative-browser',testOrientation+'-'+testSeconds);
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
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
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
 await page.waitForFunction(()=>window.StudioProduction&&window.StudioMotion?.parseCreativeCommand&&window.StudioCinema);
 // Exercise the ordinary command button, with a mocked planner response and no provider traffic.
 let automaticRequests=0;
 await page.route('**/functions/v1/gemini-studio-preview',async route=>{
  const body=route.request().postDataJSON();
  assert.match(body.command,/وثائقي اقتصادي/);
  assert.equal(body.currentContent.durationTarget,60);
  assert.equal(body.currentContent.sourceMaterial,'التقرير: العمل مستمر');
  automaticRequests++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({outputType:'video',title:'اختبار تلقائي',subtitle:'مادة اصطناعية',slides:[{
   title:'خبر',voiceover:'قال التقرير إن العمل مستمر',duration:5,visualType:'illustrative',visualQuery:'general work',
   cinema:{motion:'zoom-in',look:'cinematic',intensity:.5,vignette:.1,grain:false,transition:'dip-black',transitionSeconds:.4},
   creative:{kind:'quote',text:'العمل مستمر',source:'التقرير'}
  }]})});
 });
 await page.locator('#production-auto').uncheck();
 await page.locator('#studio-source-text').fill('التقرير: العمل مستمر');
 await page.locator('#ai-command-input').fill('حوّل التقرير إلى فيديو وثائقي اقتصادي مدته 60 ثانية. اضبط السرد نحو 60 ثانية.');
 await page.locator('#ai-run-btn').click();
 await page.waitForFunction(()=>topics.customScript?.title==='اختبار تلقائي'&&!StudioProduction.state.busy);
 const automatic=await page.evaluate(()=>{
  const scene=topics.customScript.slides[0];
  return {look:scene.cinema?.look,motion:scene.cinema?.motion,transition:scene.cinema?.transition,quote:scene.creative?.text,typography:scene.typography,design:scene.design?.preset};
 });
 assert.deepEqual(automatic,{look:'cinematic',motion:'zoom-in',transition:'dip-black',quote:'العمل مستمر',typography:'kinetic',design:'finance'});
 assert.equal(automaticRequests,1);
 console.log('Natural command automatic scene settings',JSON.stringify(automatic));
 await page.unroute('**/functions/v1/gemini-studio-preview');
 await page.evaluate(()=>StudioDesignPack.load());
 const designCheck=await page.evaluate(()=>{const D=StudioDesignPack;for(const d of Object.values(D.state.icons))new Path2D(d);return {icons:Object.keys(D.state.icons).length,font:document.fonts.check('700 32px StudioCairo'),catalog:D.state.catalog.length};});
 assert.equal(designCheck.icons,4808);assert.equal(designCheck.font,true);assert.equal(designCheck.catalog,16);
 const fallbackCheck=await page.evaluate(()=>{const s={title:'مثال تدريبي',voiceover:'هذا مثال توضيحي وليس متوسطاً وطنياً',visualType:'illustrative',design:{pack:'press-v1',preset:'finance'},mediaItems:[]};if(StudioProduction.prepareLocalVisual(s))throw Error('Text fallback bypassed media search');if(!StudioProduction.prepareLocalVisual(s,true)||StudioProduction.needsMedia(s))throw Error('Local motion-text blocked');const c=document.createElement('canvas');c.width=720;c.height=1280;const ctx=c.getContext('2d'),draw=ctx.fillText.bind(ctx),labels=[];ctx.fillText=(text,...args)=>{labels.push(text);draw(text,...args);};StudioProduction.paint(ctx,s,null,720,1280,4,8);if(!labels.some(t=>t.includes('مثال')))throw Error('Fallback title not painted');const issues=StudioProduction.missingVisuals([s,{title:'وثيقة أصلية',visualType:'document',mediaItems:[]}]);return {kind:s.productionVisual.kind,missing:issues.map(x=>x.scene),note:s.productionMediaReview.note};});
 assert.equal(fallbackCheck.kind,'motion-text');assert.deepEqual(fallbackCheck.missing,[2]);assert.match(fallbackCheck.note,/ليس فيديو مصوراً/);

 // Verify the real Chart.js adapter: shared zero baseline, exact ratios, no live instances,
 // bounded cache, deterministic seek and both render orientations.
 const chartChecks=await page.evaluate(()=>{
  const D=StudioDesignPack,Actual=window.Chart,records=[];
  window.Chart=new Proxy(Actual,{construct(Target,args){const chart=Reflect.construct(Target,args);records.push({min:chart.scales.x.min,max:chart.scales.x.max,animation:chart.options.animation,widths:chart.getDatasetMeta(0).data.map(b=>Math.abs(b.x-b.base))});return chart;}});
  const slide={design:{pack:'press-v1',preset:'finance'}},c={kind:'comparison',source:'بيانات تدريبية افتراضية',unit:'مليون دينار',items:[{label:'المبيعات',value:100},{label:'التكاليف',value:50}]};
  function render(W,H,time,data=c){const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;D.comparison(canvas.getContext('2d'),slide,data,{W,H,S:Math.min(W,H*.85),M:Math.min(W,H*.85)*.065,time});return canvas.toDataURL();}
  try{
   const end=render(720,1280,2),same=render(720,1280,2),mid=render(720,1280,.1);if(end!==same||end===mid)throw Error('Chart seek is not deterministic or reveal is static');
   render(1280,720,2);const zero={...c,items:[{label:'صفر',value:0},{label:'قيمة',value:12}]};render(720,1280,2,zero);
   const first=records[0],z=records.at(-1);if(first.min!==0||first.max!==100||Math.abs(first.widths[1]/first.widths[0]-.5)>.001||z.widths[0]!==0)throw Error('Comparison baseline or ratios changed');
   if(records.some(r=>r.animation!==false)||Object.keys(Actual.instances).length)throw Error('Chart animation or instance leaked');
   for(let i=0;i<5;i++)render(720,1280,2,{...c,items:[{label:'أ',value:i},{label:'ب',value:20}]});
   if(D.state.charts.size!==3)throw Error('Chart bitmap cache is not bounded');
   const count=D.state.charts.size,canvas=document.createElement('canvas');if(D.comparison(canvas.getContext('2d'),slide,{...c,items:[{label:'أ',value:-1},{label:'ب',value:2}]},{W:720,H:1280,S:720,M:45,time:1})!==false||D.state.charts.size!==count)throw Error('Invalid values accepted');
   return {instances:Object.keys(Actual.instances).length,cache:D.state.charts.size,ratio:first.widths[1]/first.widths[0],zero:z.widths[0]};
  }finally{window.Chart=Actual;}
 });
 assert.equal(chartChecks.instances,0);assert.equal(chartChecks.cache,3);assert.equal(chartChecks.zero,0);assert(Math.abs(chartChecks.ratio-.5)<.001);
 console.log('Chart adapter',JSON.stringify(chartChecks));
 await page.locator('summary').filter({hasText:'مكتبة الجرافيك:'}).click();
 await page.waitForFunction(()=>document.querySelectorAll('#design-icons button').length>0);
 const firstIcon=await page.locator('#design-icons button').first().getAttribute('aria-label');
 await page.locator('#design-next').click();
 assert.notEqual(await page.locator('#design-icons button').first().getAttribute('aria-label'),firstIcon);
 await page.locator('#design-prev').click();
 assert.equal(await page.locator('#design-icons button').first().getAttribute('aria-label'),firstIcon);
 await page.locator('#design-preset').selectOption('finance');
 await page.waitForFunction(()=>topics.customScript.slides[0].design?.preset==='finance');
 await page.locator('#design-search').fill('briefcase');
 await page.getByRole('button',{name:'briefcase',exact:true}).click();
 await page.locator('#design-label').fill('العمل');
 await page.locator('#design-apply-icon').click();
 await page.waitForFunction(()=>topics.customScript.slides[0].design?.icon==='briefcase');
 assert.equal(await page.evaluate(()=>topics.customScript.slides[0].creative.kind),'quote');
 await page.locator('#design-label').fill('عبارة غير موجودة');
 await page.locator('#design-apply-icon').click();
 assert.match(await page.locator('#design-status').textContent(),/موجودة حرفياً/);
 console.log('Design resources/UI',JSON.stringify(designCheck));
 await page.locator('#studio-source-text').fill('');
 for(const [width,height] of [[720,1280],[1280,720]]){
  for(const [name,time] of [['opening',.8],['settled',3]]){
   const png=await page.evaluate(({width,height,time})=>{
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    StudioProduction.paint(canvas.getContext('2d'),{title:'المبيعات ليست أرباحاً',voiceover:'المبيعات ليست أرباحاً، فالتكاليف تغير حسابات المشروع.',typography:'kinetic'},null,width,height,time,8);
    return canvas.toDataURL('image/png').split(',')[1];
   },{width,height,time});
   await fs.writeFile(path.join(out,'kinetic-'+name+'-'+width+'x'+height+'.png'),Buffer.from(png,'base64'));
  }
 }
 // Only synthetic fixtures. No provider calls, real credentials, or source documents.
 await page.evaluate(({testSeconds,testOrientation})=>{
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#254d60';ctx.fillRect(0,0,720,1280);
  ctx.fillStyle='#dae4e8';ctx.fillRect(60,180,600,650);ctx.fillStyle='#1a2631';ctx.font='28px sans-serif';
  for(let i=0;i<10;i++)ctx.fillText('SYNTHETIC TEST DOCUMENT '+i,90,230+i*50);
  const image=canvas.toDataURL('image/png');
  const media=()=>[{url:image,preview:image,kind:'image',local:false,credit:'Synthetic test fixture'}];
  topics.customScript={title:'اختبار إبداعي اصطناعي',slides:[
   {id:1,type:'cover',title:'الاقتباس',subtitle:'نص اختبار',voiceover:'هذا اقتباس حرفي موجود في التعليق',duration:2,visualType:'illustrative',mediaItems:media()},
   {id:2,type:'content',title:'المقارنة',subtitle:'بيانات اختبار اصطناعية',voiceover:'هذه مقارنة بين أرقام اصطناعية للاختبار',duration:2,visualType:'data',mediaItems:media()},
   {id:3,type:'outro',title:'الوثيقة',subtitle:'وثيقة اختبار اصطناعية',voiceover:'هنا نبرز منطقة من وثيقة اختبار',duration:2,visualType:'document',mediaItems:media()}
  ]};
  activeTopic=activeTikTokTopic='customScript';activeTikTokSlide=currentSlideIndex=0;activeTab='tiktok';
  topics.customScript.slides.forEach((s,i)=>{s.duration=testSeconds/3;s.typography='kinetic';s.design={pack:'press-v1',preset:i===2?'investigation':i===1?'finance':'editorial'};});
  window.aiSceneDurations=[testSeconds/3,testSeconds/3,testSeconds/3];
  document.getElementById('production-motion').checked=true;
  document.getElementById('production-orientation').value=testOrientation;
  document.getElementById('video-quality').value='720';
  document.getElementById('video-total-duration').value=String(testSeconds);
  document.getElementById('video-sync-mode').value='fit-audio';
  initTikTokSlideButtons();updateTikTokInputs();
 },config);
 await page.locator('summary').filter({hasText:'إخراج المشهد:'}).click();
 await page.locator('#creative-scene').fill('1');
 await page.locator('#creative-load').click();
 console.log('Creative select before action',await page.locator('#creative-kind').evaluate(el=>({html:el.outerHTML,options:Array.from(el.options).map(x=>({value:x.value,text:x.textContent})),count:document.querySelectorAll('#creative-kind').length})));
 await page.locator('#creative-kind').selectOption('quote');
 await page.locator('#creative-source').fill('مصدر اصطناعي للاختبار');
 await page.locator('#creative-quote').fill('اقتباس حرفي');
 await page.locator('#creative-apply').click();
 await page.locator('summary').filter({hasText:'السينما: حركة الصورة'}).click();
 await page.locator('#cinema-scene').fill('1');
 await page.locator('#cinema-load').click();
 await page.locator('#cinema-look').selectOption('cinematic');
 await page.locator('#cinema-motion').selectOption('zoom-in');
 await page.locator('#cinema-intensity').fill('65');
 await page.locator('#cinema-vignette').fill('15');
 await page.locator('#cinema-grain').check();
 await page.locator('#cinema-transition').selectOption('fade');
 await page.locator('#cinema-apply').click();
 assert.match(await page.locator('#cinema-status').textContent(),/حُفظت/);
 assert.match(await page.locator('#creative-status').textContent(),/طُبّق/);
 const checks=await page.evaluate(async()=>{
  const first=topics.customScript.slides[0];
  if(first.cinema?.motion!=='zoom-in'||first.cinema?.intensity!==.65)throw Error('Cinema UI did not apply');
  StudioProduction.applyCinemaCommand('سينما للمشهد 2: وثائقي حركة يسار انتقال مسح يسار');
  StudioProduction.applyCinemaCommand('سينما للمشهد 3: سينمائي حركة تقريب انتقال سواد');
  if(topics.customScript.slides[2].cinema.look!=='natural'||topics.customScript.slides[2].cinema.motion!=='static')throw Error('Document grading protection failed');
  if(first.creative?.kind!=='quote')throw Error('UI quote not applied');
  StudioProduction.applyCreativeCommand('مقارنة للمشهد 2: "أ" 0 و "ب" 12 الوحدة "دينار" المصدر "جدول اصطناعي"');
  if(topics.customScript.slides[1].creative?.items[0].value!==0)throw Error('Zero value was lost');
  topics.customScript.slides[2].creative={kind:'document-focus',source:'وثيقة اصطناعية',rect:{x:.1,y:.2,width:.8,height:.1}};
  const originalVoice=JSON.stringify(topics.customScript.slides.map(s=>s.voiceover));
  StudioProduction.state.previewPassed=true;
  StudioProduction.applyCreativeCommand('أزل القالب من المشهد 1');
  if(StudioProduction.state.previewPassed)throw Error('Stale preview accepted');
  StudioProduction.applyCreativeCommand('اقتباس للمشهد 1: "اقتباس حرفي" المصدر "مصدر اصطناعي"');
  if(JSON.stringify(topics.customScript.slides.map(s=>s.voiceover))!==originalVoice)throw Error('Narration changed');
  await saveStudioProject();
  const snapshots=await projectStore('readonly',store=>store.getAll());
  const snapshot=snapshots.at(-1);
  if(!snapshot?.topic?.slides[0].creative)throw Error('IndexedDB snapshot missing creative settings');
  document.getElementById('saved-studio-projects').value=snapshot.id;
  await restoreStudioProject();
  if(topics.customScript.slides[1].creative?.kind!=='comparison')throw Error('Snapshot restore failed');
  if(topics.customScript.slides[2].design?.preset!=='investigation')throw Error('Design pack lost on restore');
  if(topics.customScript.slides[0].typography!=='kinetic')throw Error('Kinetic typography lost on restore');
  if(topics.customScript.slides[0].cinema?.intensity!==.65||topics.customScript.slides[1].cinema?.transition!=='wipe-left')throw Error('Cinema settings lost after restore');
  return {ui:true,commands:true,cinemaUI:true,evidenceProtected:true,cinemaSnapshot:true,voiceUnchanged:true,indexedDBRoundtrip:true};
 });
 const cinemaPixels=await page.evaluate(async()=>{
  const C=window.StudioCinema,canvas=document.createElement('canvas');canvas.width=200;canvas.height=200;const ctx=canvas.getContext('2d');
  const current=()=>{ctx.fillStyle='#0000ff';ctx.fillRect(0,0,200,200);},previous=()=>{ctx.fillStyle='#ff0000';ctx.fillRect(0,0,200,200);};
  const pixel=x=>Array.from(ctx.getImageData(x,100,1,1).data).slice(0,3);
  for(const type of ['cut','fade','dip-black','wipe-left','wipe-right']){
   C.transition(ctx,current,previous,{type,progress:1,width:200,height:200});if(pixel(100)[2]!==255)throw Error('Transition final frame: '+type);
  }
  C.transition(ctx,current,previous,{type:'dip-black',progress:.5,width:200,height:200});if(pixel(100).some(x=>x!==0))throw Error('Dip black midpoint');
  C.transition(ctx,current,previous,{type:'wipe-left',progress:.5,width:200,height:200});if(pixel(10)[0]!==255||pixel(190)[2]!==255)throw Error('Wipe direction or clipping');
  const image=new Image();image.src=topics.customScript.slides[0].mediaItems[0].url;await image.decode();
  const scene=topics.customScript.slides[0];
  const sample=t=>{ctx.clearRect(0,0,200,200);C.drawMedia(ctx,image,scene,200,200,t,2);C.drawFinish(ctx,scene,200,200,t);return new Uint8Array(ctx.getImageData(0,0,200,200).data);};
  const a=sample(.2),b=sample(1.8),repeat=sample(1.8);let changed=0;
  for(let i=0;i<a.length;i++){if(a[i]!==b[i])changed++;if(b[i]!==repeat[i])throw Error('Nondeterministic cinema frame');}
  if(changed<500)throw Error('Motion/grain does not animate');if(ctx.filter!=='none'||ctx.globalAlpha!==1)throw Error('Cinema leaked canvas state');
  return {transitions:true,motionChangedChannels:changed,deterministicGrain:true,isolatedFilter:true};
 });
 console.log('Cinema real pixels',JSON.stringify(cinemaPixels));
 for(const preset of ['editorial','finance','investigation','minimal']){
  const png=await page.evaluate(async preset=>{
   const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;
   const im=new Image();im.src=topics.customScript.slides[0].mediaItems[0].url;await im.decode();
   const scene={title:'متابعة المال',voiceover:'تبدأ مراجعة الأموال في سجلات المشروع.',typography:'kinetic',design:{pack:'press-v1',preset,icon:'cash',label:'الأموال'}};
   let calls=0;const original=StudioDesignPack.drawCue;StudioDesignPack.drawCue=(...args)=>{calls++;return original(...args);};
   try{StudioProduction.paint(canvas.getContext('2d'),scene,{element:im,kind:'image'},720,1280,4,8);}finally{StudioDesignPack.drawCue=original;}
   if(!calls)throw Error('External graphic resources were not used by the renderer');
   return canvas.toDataURL('image/png').split(',')[1];
  },preset);
  await fs.writeFile(path.join(out,'design-'+preset+'.png'),Buffer.from(png,'base64'));
 }

 await page.evaluate(()=>{const s=topics.customScript.slides[1];s.mediaItems=[];s.points=['أ: 0 دينار','ب: 12 دينار'];s.visualType='illustrative';StudioProduction.prepareLocalVisual(s);if(!StudioProduction.localDataReady(s))throw Error('Standalone numeric scene not ready');});
 // Capture actual pixels in portrait and landscape, using the same renderer as export.
 for(const [width,height] of [[720,1280],[1280,720]]){
  for(let i=0;i<3;i++){
   const rendered=await page.evaluate(async({width,height,i,testSeconds})=>{
    const s=topics.customScript.slides[i];let image=null;if(s.mediaItems.length){image=new Image();image.src=s.mediaItems[0].url;await image.decode();}
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');
    const render=(time,creative)=>{
     const scene={...s};if(!creative)delete scene.creative;
     StudioProduction.paint(ctx,scene,image?{element:image,kind:'image'}:null,width,height,time,testSeconds/3);
     return new Uint8Array(ctx.getImageData(0,0,width,height).data);
    };
    const baseline=render(testSeconds/6,false),pixels=render(testSeconds/6,true);let changed=0;
    for(let k=0;k<pixels.length;k+=4)if(Math.abs(pixels[k]-baseline[k])+Math.abs(pixels[k+1]-baseline[k+1])+Math.abs(pixels[k+2]-baseline[k+2])>20)changed++;
    if(changed<500)throw Error('Overlay produced too few changed pixels: '+changed);
    return {png:canvas.toDataURL('image/png').split(',')[1],changed};
   },{width,height,i,testSeconds});
   await fs.writeFile(path.join(out,'scene-'+(i+1)+'-'+width+'x'+height+'.png'),Buffer.from(rendered.png,'base64'));
   console.log('Rendered pixels',i+1,width,height,rendered.changed);
  }
 }
 // Continuous synthetic tone, through the real MediaRecorder export path.
 const result=await page.evaluate(async(testSeconds)=>{
  const rate=24000,seconds=testSeconds,count=rate*seconds,raw=new ArrayBuffer(44+count*2),view=new DataView(raw);
  const text=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,36+count*2,true);text(8,'WAVE');text(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);
  view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,count*2,true);
  for(let i=0;i<count;i++)view.setInt16(44+i*2,Math.round(800*Math.sin(2*Math.PI*440*i/rate)),true);
  window.humanVoiceoverBlob=new Blob([raw],{type:'audio/wav'});
  window.humanVoiceoverUrl=URL.createObjectURL(window.humanVoiceoverBlob);window.humanVoiceoverDuration=seconds;window.activeVoiceSource='human';
  window.aiSceneDurations=[seconds/3,seconds/3,seconds/3];window.aiTimelineApproximate=false;window.aiAlignmentMethod='manual';
  StudioProduction.state.abort=new AbortController();
  await StudioProduction.render();
  if(!StudioProduction.state.previewPassed)throw Error('Export rejected: '+document.getElementById('production-report').textContent);
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.slice(reader.result.indexOf(';base64,')+8));reader.onerror=reject;reader.readAsDataURL(socialVideo.blob);});
  return {data,diagnostics:window.lastExportDiagnostics};
 },testSeconds);
 console.log('Export transfer',JSON.stringify({diagnostics:result.diagnostics,base64Length:result.data.length,bytes:Buffer.from(result.data,'base64').length,header:Buffer.from(result.data,'base64').subarray(0,64).toString('hex')}));
 const ext=result.diagnostics.mimeType.startsWith('video/mp4')?'mp4':'webm';
 const file=path.join(out,'synthetic-creative-export.'+ext);
 await fs.writeFile(file,Buffer.from(result.data,'base64'));
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8',maxBuffer:8*1024*1024}));
 assert(probe.streams.some(s=>s.codec_type==='audio'));
 assert(probe.streams.some(s=>s.codec_type==='video'));
 const packetData=JSON.parse(execFileSync('ffprobe',['-v','error','-show_packets','-show_entries','packet=codec_type,stream_index,pts_time,dts_time,duration_time','-of','json',file],{encoding:'utf8',maxBuffer:8*1024*1024}));
 const packets=type=>packetData.packets.filter(p=>(p.codec_type||probe.streams.find(s=>s.index===p.stream_index)?.codec_type)===type);
 const end=type=>{const times=packets(type).map(p=>Number(p.pts_time??p.dts_time)+Number(p.duration_time||0)).filter(Number.isFinite);assert(times.length,'No timestamped packets: '+type);return Math.max(...times);};
 console.log('Independent packet verification',JSON.stringify({streams:probe.streams.map(s=>({index:s.index,type:s.codec_type})),audioPackets:packets('audio').length,videoPackets:packets('video').length,audioEnd:end('audio'),videoEnd:end('video'),sample:packetData.packets.slice(-3)}));
 assert(Math.abs(end('audio')-testSeconds)<.6,'audio duration');
 assert(Math.abs(end('video')-testSeconds)<.6,'video duration');
 assert(Math.abs(end('audio')-end('video'))<.6,'audio/video sync');
 const frameSimilarity=[];
 for(let i=0;i<3;i++){
  const decoded=path.join(out,'decoded-scene-'+(i+1)+'.png');
  execFileSync('ffmpeg',['-v','error','-y','-ss',String((i+.5)*testSeconds/3),'-i',file,'-frames:v','1',decoded]);
  const metrics=spawnSync('ffmpeg',['-i',path.join(out,'scene-'+(i+1)+(testOrientation==='landscape'?'-1280x720.png':'-720x1280.png')),'-i',decoded,'-lavfi','ssim','-f','null','-'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const match=String(metrics.stderr).match(/All:([0-9.]+)/);assert.equal(metrics.status,0,'frame comparison failed');
  assert(match&&Number(match[1])>.90,'Decoded frame differs from composed preview: '+metrics.stderr);
  frameSimilarity.push({scene:i+1,decoded:true,ssim:Number(match[1])});
 }
 const summary={...config,...checks,cinemaPixels,decodedFrames:frameSimilarity,diagnostics:result.diagnostics,packetEnds:{audio:end('audio'),video:end('video')},pageErrors:errors,note:'Synthetic media and synthetic tone; does not verify spoken narration or editorial accuracy.'};
 await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(summary,null,2));
 assert.equal(errors.length,0,'Browser page errors: '+errors.join('; '));
 console.log(JSON.stringify(summary));
}catch(error){
 await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});
 const dom=await page.evaluate(()=>({select:document.getElementById('creative-kind')?.outerHTML,status:document.getElementById('creative-status')?.textContent})).catch(()=>({}));
 console.error('Browser diagnostics',JSON.stringify(dom),errors);
 await fs.writeFile(path.join(out,'error.txt'),String(error.stack)+'\n'+errors.join('\n')+'\n'+JSON.stringify(dom));
 throw error;
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
