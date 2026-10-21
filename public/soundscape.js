/* Local licensed score + ZzFX synthesis. All nodes share the narration clock and export bus. */
(function(root){
'use strict';
const names={ambient:'جوي هادئ',documentary:'وثائقي هادئ',finance:'اقتصادي إيقاعي',investigation:'استقصائي متحفظ',cinematic:'سينمائي',action:'أكشن'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function normalize(value){
 if(!value||!names[value.style])return null;
 return {version:1,style:value.style,music:value.music!==false,sfx:value.sfx!==false,musicLevel:Number.isFinite(value.musicLevel)?clamp(value.musicLevel,0,.2):.1,sfxLevel:Number.isFinite(value.sfxLevel)?clamp(value.sfxLevel,0,.3):.16,visuals:value.visuals!==false};
}
function fromCommand(command){
 const t=String(command||'');let style=/جوي|هادئة|ambient/i.test(t)?'ambient':/أكشن|اكشن|action/i.test(t)?'action':/استقصا|تحقيق/.test(t)?'investigation':/اقتصاد|مالي|تجارة/.test(t)?'finance':/سينما|cinematic/i.test(t)?'cinematic':'documentary';
 const music=!/(?:بدون|بلا|دون)\s*(?:أي\s*)?(?:موسيقى|موسيقي|خلفية موسيقية)|تعليق\s*(?:صوتي\s*)?فقط|voice\s*only/i.test(t),sfx=!/(?:بدون|بلا|دون)\s*(?:أي\s*)?(?:مؤثرات|مؤثر صوتي)|تعليق\s*(?:صوتي\s*)?فقط|voice\s*only/i.test(t);
 return normalize({style,music,sfx,visuals:!/(?:بدون|بلا|دون)\s*(?:حركات|حركة|مؤثرات)|ثابتة|بسيط|minimal/i.test(t)});
}
function describe(value){const s=normalize(value);return s?`${names[s.style]}؛ ${s.music?'موسيقى مرخّصة منخفضة تحت الكلام':'الموسيقى متوقفة'}؛ ${s.sfx?'مؤثرات تصميمية عند العناوين والانتقالات':'المؤثرات الصوتية متوقفة'}`:'تعليق فقط — الحزمة الصوتية متوقفة';}
function events(slides,durations,value){
 const s=normalize(value);if(!s?.sfx)return [];let time=0;const result=[];const add=(at,kind,scene)=>{if(at>=0&&(!result.length||at-result.at(-1).at>=.65))result.push({at,kind,scene});};
 slides.forEach((slide,i)=>{const d=durations[i];if(!Number.isFinite(d)||d<=0)throw Error('توقيت المؤثرات غير صالح');
  if(i)add(time,s.style==='documentary'?'sweep':s.style==='ambient'?'close':'whoosh',i);else if(['action','cinematic'].includes(s.style))add(.1,s.style==='action'?'subdrop':'impact',i);
  if(d>2.5)add(time+1.1,slide.visualType==='data'?({documentary:'tick',investigation:'tick',cinematic:'soft-hit'}[s.style]||'data'):({documentary:'paper',investigation:'paper',cinematic:'reveal',action:'soft-hit',ambient:'title'}[s.style]||'title'),i);
  if(i===slides.length-1&&d>4&&s.style==='cinematic')add(time+2.2,'shimmer',i);
  if(s.style==='action'&&d>6)add(time+d-1,'riser',i);
  time+=d;
 });return result.filter(e=>e.at<time-.2);
}
function applyVisuals(slides,value){
 const s=normalize(value);if(!s?.visuals)return;
 slides.forEach((slide,i)=>{if(slide.visualType==='document'||slide.creative?.kind==='document-focus')return;
  const c=root.StudioCinema?.normalize(slide)||{look:s.style==='finance'?'documentary':'cinematic',intensity:.45,vignette:.12,grain:false,motion:'static',transition:'fade',transitionSeconds:.45};
  if(c.motion==='static')c.motion=i%2?'zoom-out':'zoom-in';
  if(i%2===1){c.transition=s.style==='action'?'push-left':s.style==='finance'?'diagonal-wipe':'circle-reveal';c.transitionSeconds=s.style==='action'?.35:.55;}
  slide.cinema=c;
 });
}
const synth={
 impact:[1,0,65,.004,.08,.85,0,1,-.18,0,0,0,0,.3,0,0,.12,.5,.12,0,500],
 whoosh:[.8,0,200,.12,.03,.24,4,1,2,0,0,0,0,1,0,0,0,.7,0,0,1800],
 riser:[.6,0,100,.6,.03,.14,4,1,3,0,0,0,0,.75,0,0,0,.5,0,0,2000],
 subdrop:[.8,0,90,.01,.05,.8,0,1,-.16,0,0,0,0,0,0,0,0,.6,.1],
 shimmer:[.5,0,1200,.03,.08,.65,0,1,0,0,0,0,0,0,8,0,.12,.25,.1]
};
function speechEnvelope(buffer,step=.04){
 const frames=Math.ceil(buffer.duration/step),env=new Float32Array(frames),rmsFrames=new Float32Array(frames);let gain=1,peakRms=0;
 for(let f=0;f<frames;f++){let power=0,count=0;for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch),a=Math.floor(f*step*buffer.sampleRate),b=Math.min(data.length,Math.ceil((f+1)*step*buffer.sampleRate));for(let i=a;i<b;i+=8){power+=data[i]*data[i];count++;}}
  const rms=Math.sqrt(power/Math.max(1,count));rmsFrames[f]=rms;peakRms=Math.max(peakRms,rms);
 }const threshold=Math.max(.0006,Math.min(.012,peakRms*.12));for(let f=0;f<frames;f++){const rms=rmsFrames[f],target=rms>threshold?.22*clamp(rms/.08,.05,1):1;gain=target<gain?target:Math.min(target,gain+.065);env[f]=gain;}return {step,values:env};
}
function loopBuffer(ac,input){
 const overlap=Math.min(1.2,input.duration/8),n=Math.floor(overlap*input.sampleRate),length=input.length-n,out=ac.createBuffer(input.numberOfChannels,length,input.sampleRate);
 for(let ch=0;ch<input.numberOfChannels;ch++){const src=input.getChannelData(ch),dst=out.getChannelData(ch);dst.set(src.subarray(n));for(let i=0;i<n;i++){const p=i/n;dst[length-n+i]=src[length+i]*(1-p)+src[i]*p;}}
 return out;
}
function peakNormalize(buffer){let peak=0;for(let ch=0;ch<buffer.numberOfChannels;ch++)for(const v of buffer.getChannelData(ch))peak=Math.max(peak,Math.abs(v));if(peak>0)for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]/=peak;}return buffer;}
let manifestPromise;const bytes=new Map();
async function manifest(){return manifestPromise||=(fetch(new URL('public/audio/catalog.json',document.baseURI)).then(r=>{if(!r.ok)throw Error('تعذر تحميل فهرس الصوت');return r.json();}).catch(e=>{manifestPromise=null;throw e;}));}
async function prepare(ac,value,signal){
 const s=normalize(value);if(!s||(!s.music&&!s.sfx))return {settings:s,buffers:{},credits:[]};
 const catalog=await manifest(),buffers={},credits=[];
 const load=async id=>{const item=catalog.assets.find(x=>x.id===id);if(!item)throw Error('مورد صوتي غير موجود: '+id);let data=bytes.get(id);if(!data){const r=await fetch(new URL('public/audio/'+item.file,document.baseURI),{signal});if(!r.ok)throw Error('تعذر تحميل '+item.title);data=await r.arrayBuffer();bytes.set(id,data);}buffers[id]=peakNormalize(await ac.decodeAudioData(data.slice(0)));credits.push({id,title:item.title,license:item.license,source:item.source,author:item.author});};
 if(s.music)await load('score-'+(s.style==='action'?'cinematic':s.style));
 if(s.sfx){for(const id of ['title','data','paper','sweep','close','tick','reveal','soft-hit'])await load(id);if(!root.StudioZZFX)throw Error('مكتبة المؤثرات الصوتية غير محملة');for(const [key,args] of Object.entries(synth)){const samples=root.StudioZZFX.buildSamples(...args),b=ac.createBuffer(1,samples.length,root.StudioZZFX.sampleRate);b.getChannelData(0).set(samples);buffers[key]=peakNormalize(b);}credits.push({id:'zzfx',title:'ZzFX — original studio effect presets',license:'MIT',author:'Frank Force',source:'https://github.com/KilledByAPixel/ZzFX'});}
 return {settings:s,buffers,credits};
}
function createMix(ac,{narration,slides,durations,prepared,destination,monitor=true}){
 const s=prepared.settings,enabled=s&&(s.music||s.sfx),master=ac.createGain(),sources=[],nodes=[master];let compressor;
 if(enabled){compressor=ac.createDynamicsCompressor();compressor.threshold.value=-3;compressor.knee.value=3;compressor.ratio.value=16;compressor.attack.value=.003;compressor.release.value=.12;master.gain.value=.94;master.connect(compressor);nodes.push(compressor);compressor.connect(destination);if(monitor)compressor.connect(ac.destination);}else{master.connect(destination);if(monitor)master.connect(ac.destination);}
 const voice=ac.createBufferSource();voice.buffer=narration;const vg=ac.createGain();vg.gain.value=enabled?.9:1;voice.connect(vg);vg.connect(master);nodes.push(vg);sources.push(voice);
 const envelope=speechEnvelope(narration),plan=events(slides,durations,s);let stopped=false;
 function start(at){
  voice.start(at);
  if(s?.music){const id='score-'+(s.style==='action'?'cinematic':s.style),b=prepared.buffers[id];if(!b)throw Error('الموسيقى لم تُجهّز');const source=ac.createBufferSource(),gain=ac.createGain();source.buffer=loopBuffer(ac,b);source.loop=true;source.connect(gain);gain.connect(master);nodes.push(gain);sources.push(source);
   gain.gain.setValueAtTime(0,at);for(let i=1;i<envelope.values.length;i++){const t=Math.min(narration.duration,i*envelope.step),fade=Math.min(1,t/.7,Math.max(0,(narration.duration-t)/1.2));gain.gain.linearRampToValueAtTime(s.musicLevel*envelope.values[i]*fade,at+t);}gain.gain.linearRampToValueAtTime(0,at+narration.duration);source.start(at);source.stop(at+narration.duration);
  }
  for(const event of plan){const buffer=prepared.buffers[event.kind];if(!buffer)throw Error('مؤثر لم يُجهّز: '+event.kind);const source=ac.createBufferSource(),gain=ac.createGain();source.buffer=buffer;source.connect(gain);gain.connect(master);const level=s.sfxLevel*.5,end=Math.min(event.at+buffer.duration,narration.duration);gain.gain.setValueAtTime(0,at+event.at);for(let t=event.at+.01;t<end;t+=envelope.step){const duck=envelope.values[Math.min(envelope.values.length-1,Math.floor(t/envelope.step))],fade=Math.min(1,(t-event.at)/.01,(end-t)/.06);gain.gain.linearRampToValueAtTime(level*duck*fade,at+t);}gain.gain.linearRampToValueAtTime(0,at+end);source.start(at+event.at);source.stop(at+end);sources.push(source);nodes.push(gain);}
 }
 function stop(){if(stopped)return;stopped=true;for(const node of sources){try{node.stop();}catch{}node.disconnect();}for(const node of nodes)node.disconnect();}
 return {start,stop,plan,credits:prepared.credits,voice};
}
root.StudioSoundscape={names,normalize,fromCommand,describe,events,applyVisuals,speechEnvelope,loopBuffer,peakNormalize,prepare,createMix};
})(typeof window==='undefined'?globalThis:window);
