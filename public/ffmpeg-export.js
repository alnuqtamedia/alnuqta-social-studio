/* Lazy single-thread FFmpeg.wasm, local-only finalization using a fresh complete audio mix. */
(function(root){
'use strict';
let loading=null;
function inspectMp4(bytes){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),ascii=at=>String.fromCharCode(...bytes.subarray(at,at+4));
 function boxes(start,end){const out=[];for(let at=start;at+8<=end;){let size=v.getUint32(at),header=8;if(size===1){if(at+16>end)throw Error('invalid_mp4');size=Number(v.getBigUint64(at+8));header=16;}if(!size)size=end-at;if(size<header||at+size>end)throw Error('invalid_mp4');out.push({type:ascii(at+4),start:at+header,end:at+size});at+=size;}return out;}
 const moov=boxes(0,bytes.length).find(x=>x.type==='moov');if(!moov)throw Error('missing_mp4_index');
 const streams=boxes(moov.start,moov.end).filter(x=>x.type==='trak').map(track=>{const mdia=boxes(track.start,track.end).find(x=>x.type==='mdia');if(!mdia)throw Error('missing_mp4_track');const b=boxes(mdia.start,mdia.end),mdhd=b.find(x=>x.type==='mdhd'),hdlr=b.find(x=>x.type==='hdlr');if(!mdhd||!hdlr)throw Error('missing_mp4_timing');const at=mdhd.start,version=v.getUint8(at),scale=v.getUint32(at+(version===1?20:12)),length=version===1?Number(v.getBigUint64(at+24)):v.getUint32(at+16);if(!scale||!length)throw Error('empty_mp4_track');return {type:ascii(hdlr.start+8),duration:length/scale};});
 const video=streams.find(s=>s.type==='vide'),audio=streams.find(s=>s.type==='soun');if(!video||!audio||!Number.isFinite(video.duration)||!Number.isFinite(audio.duration))throw Error('missing_mp4_audio_video');return {video:video.duration,audio:audio.duration,duration:Math.max(video.duration,audio.duration)};
}
function script(url){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('تعذر تحميل محرك التصدير'));};document.head.appendChild(s);});}
async function load(signal){
 if(!loading)loading=(async()=>{if(!root.FFmpegWASM)await script(new URL('public/vendor/ffmpeg/ffmpeg.js',document.baseURI).href);const engine=new root.FFmpegWASM.FFmpeg();try{await engine.load({coreURL:new URL('public/vendor/ffmpeg/ffmpeg-core.js',document.baseURI).href,wasmURL:new URL('public/vendor/ffmpeg/ffmpeg-core.wasm',document.baseURI).href},{signal});return engine;}catch(e){engine.terminate();throw e;}})().catch(e=>{loading=null;throw e;});return loading;
}
async function finalize(video,audio,duration,{signal,onProgress=()=>{}}={}){
 if(!Number.isFinite(duration)||duration<=0||duration>600)throw Error('مدة التصدير غير صالحة');
 if(video.size>180*1024*1024)throw Error('الملف كبير على معالجة المتصفح؛ صدّر بدقة 720p');
 onProgress('تحميل FFmpeg المحلي أول مرة؛ قد يستغرق وقتاً على الأجهزة القديمة…');
 const engine=await load(signal),abort=()=>{engine.terminate();loading=null;};signal?.addEventListener('abort',abort,{once:true});const names=['capture','sound.wav','final.mp4'];
 try{
  if(signal?.aborted)throw Error('أُلغي التصدير');await engine.writeFile(names[0],new Uint8Array(await video.arrayBuffer()),{signal});await engine.writeFile(names[1],new Uint8Array(await audio.arrayBuffer()),{signal});
  onProgress('توحيد توقيت الفيديو ومزجه مع الصوت الكامل…');
  // Do not trim speech. Video timestamps start at zero; pad the final image if needed.
  const code=await engine.exec(['-i',names[0],'-i',names[1],'-map','0:v:0','-map','1:a:0','-vf','setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=2','-af','asetpts=PTS-STARTPTS','-t',String(duration),'-c:v','libx264','-preset','ultrafast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',names[2]],-1,{signal});
  if(code!==0)throw Error('تعذر إكمال تصدير MP4؛ المعاينة الأصلية محفوظة');const bytes=await engine.readFile(names[2],undefined,{signal}),probe=inspectMp4(bytes);
  if(Math.abs(probe.video-duration)>.15||Math.abs(probe.audio-duration)>.15||Math.abs(probe.video-probe.audio)>.15)throw Error('ملف MP4 لم يجتز فحص مساري الصوت والصورة');
  const blob=new Blob([bytes],{type:'video/mp4'});return {blob,probe};
 }finally{signal?.removeEventListener('abort',abort);for(const name of names)try{await engine.deleteFile(name);}catch{}engine.terminate();loading=null;}
}
root.StudioFFmpeg={finalize,inspectMp4};
})(window);
