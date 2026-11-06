import {createHmac,timingSafeEqual} from 'node:crypto';
const API='https://api.heygen.com/v3';
const ORIGIN='https://alnuqta-social-studio.vercel.app';
const safeEqual=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);};
const sign=(s,key)=>createHmac('sha256',key).update(s).digest('base64url');
export function readiness(env){return {ready:Boolean(env.HEYGEN_API_KEY&&env.STUDIO_PRESENTER_ACCESS_TOKEN&&env.HEYGEN_PRESENTER_IMAGE_URL&&env.HEYGEN_VOICE_ID),provider:'heygen',requiresAccessCode:true};}
export function payload(body,env){
 const script=String(body.script||'').trim(),title=String(body.title||'نشرة النقطة').trim();
 if(!script||script.length>1800||title.length>160)throw Error('invalid_script');
 const image=new URL(env.HEYGEN_PRESENTER_IMAGE_URL);if(image.protocol!=='https:')throw Error('invalid_image');
 return {type:'image',image:{type:'url',url:image.href},script,voice_id:env.HEYGEN_VOICE_ID,title,resolution:'1080p',aspect_ratio:'16:9',remove_background:false,expressiveness:'low',motion_prompt:'Professional Arabic news anchor. Preserve the exact person, clothing and newsroom background. Natural restrained gestures. Continuous single take.',voice_settings:{speed:1},caption:{file_format:'srt'}};
}
export function parseSrt(s){return String(s).replace(/\r/g,'').trim().split(/\n\s*\n/).flatMap(block=>{const lines=block.split('\n'),i=lines.findIndex(x=>x.includes('-->'));if(i<0)return[];const match=lines[i].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);if(!match)return[];const n=match.slice(1).map(Number),start=n[0]*3600+n[1]*60+n[2]+n[3]/1000,end=n[4]*3600+n[5]*60+n[6]+n[7]/1000,text=lines.slice(i+1).join(' ').replace(/<[^>]+>/g,'').trim();return text&&end>start?[{start,end,text}]:[];});}
export function makeHandler({env=process.env,fetcher=fetch,now=Date.now}={}){return async function(req,res){
 const send=(code,data)=>res.status(code).json(data);res.setHeader('Cache-Control','no-store');
 if(req.method==='GET')return send(200,readiness(env));
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(405,{error:'method_not_allowed'});}
 if(!readiness(env).ready)return send(503,{error:'presenter_not_configured'});
 if(req.headers.origin!==ORIGIN)return send(403,{error:'origin_not_allowed'});
 if(!safeEqual(req.headers.authorization,`Bearer ${env.STUDIO_PRESENTER_ACCESS_TOKEN}`))return send(401,{error:'access_denied'});
 let b=req.body;try{if(typeof b==='string')b=JSON.parse(b);}catch{return send(400,{error:'invalid_body'});}
 if(!b||typeof b!=='object'||JSON.stringify(b).length>12000)return send(400,{error:'invalid_body'});
 const call=async(path,options={})=>{const r=await fetcher(API+path,{...options,headers:{'x-api-key':env.HEYGEN_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000)});const j=await r.json();if(!r.ok){const e=Error('provider_error');e.status=r.status;throw e;}return j.data||j;};
 try{
  if(b.action==='generate'){
   let p;try{p=payload(b,env);}catch{return send(400,{error:'invalid_script'});}
   // A submitted creation is never retried automatically, even on timeout.
   const j=await call('/videos',{method:'POST',body:JSON.stringify(p)}),id=j.video_id||j.id;
   if(typeof id!=='string'||! /^[a-zA-Z0-9_-]{1,120}$/.test(id))return send(502,{error:'submission_uncertain'});
   const receipt=Buffer.from(JSON.stringify({id,expires:now()+7*86400000})).toString('base64url');
   return send(202,{receipt:receipt+'.'+sign(receipt,env.STUDIO_PRESENTER_ACCESS_TOKEN),status:'pending'});
  }
  if(b.action!=='status')return send(400,{error:'invalid_action'});
  const [r,s,...extra]=String(b.receipt||'').split('.');if(extra.length||!r||!safeEqual(sign(r,env.STUDIO_PRESENTER_ACCESS_TOKEN),s))return send(403,{error:'invalid_receipt'});
  let ticket;try{ticket=JSON.parse(Buffer.from(r,'base64url').toString());}catch{return send(403,{error:'invalid_receipt'});}
  if(ticket.expires<now()||! /^[a-zA-Z0-9_-]{1,120}$/.test(ticket.id))return send(403,{error:'expired_receipt'});
  const j=await call('/videos/'+ticket.id),status=j.status;
  if(status==='failed'||status==='cancelled')return send(200,{status:'failed',error:'generation_failed'});
  if(status!=='completed')return send(200,{status:'processing'});
  if(!j.video_url||!j.subtitle_url)return send(502,{error:'incomplete_result'});
  // Only the provider's returned subtitle URL is read; callers cannot supply URLs.
  const url=new URL(j.subtitle_url);if(url.protocol!=='https:')return send(502,{error:'invalid_subtitles'});
  const sr=await fetcher(url,{signal:AbortSignal.timeout(15000),redirect:'error'});if(!sr.ok)return send(502,{error:'subtitles_unavailable'});
  const st=await sr.text();if(st.length>250000)return send(502,{error:'invalid_subtitles'});
  const captions=parseSrt(st);if(!captions.length)return send(502,{error:'subtitles_unavailable'});
  return send(200,{status:'completed',videoUrl:j.video_url,duration:j.duration,captions});
 }catch(e){const errors={401:'provider_auth_failed',402:'provider_credit_required',403:'provider_access_denied',429:'provider_busy'};return send(e.status===402?402:502,{error:errors[e.status]||(b.action==='generate'?'submission_uncertain':'status_unavailable')});}
};}
export default makeHandler();
