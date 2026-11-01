import {jwtVerify,createRemoteJWKSet} from 'npm:jose@5.9.6';
import {createGithubVerifier} from '../_shared/studio-runner-auth.mjs';
import {POST_BUCKET,MAX_JPEG_BYTES,validateDesign,designHash,sha256,jpegDimensions} from '../_shared/studio-post-contract.mjs';
const verify=createGithubVerifier({jwtVerify,createRemoteJWKSet});
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
Deno.serve(async req=>{
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 let runner;try{runner=await verify(req.headers.get('x-studio-runner-token'));}catch{return reply({error:'unauthorized_runner'},401);}
 try{
  if(Number(req.headers.get('content-length')||0)>MAX_JPEG_BYTES*1.5)return reply({error:'request_too_large'},413);
  if(!req.body)return reply({error:'empty_request'},400);const reader=req.body.getReader(),chunks=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_JPEG_BYTES*1.5)return reply({error:'request_too_large'},413);chunks.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
  let body,design,image;try{body=JSON.parse(new TextDecoder().decode(bytes));design=validateDesign(body.design);if(typeof body.jpegBase64!=='string'||body.jpegBase64.length>MAX_JPEG_BYTES*1.4||!/^[-A-Za-z0-9+/=]+$/.test(body.jpegBase64))throw Error('invalid_jpeg');image=Uint8Array.from(atob(body.jpegBase64),c=>c.charCodeAt(0));jpegDimensions(image);}catch{return reply({error:'invalid_post_payload'},400);}
  const url=Deno.env.get('SUPABASE_URL'),legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),secret=legacy||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
  if(!url||!secret)return reply({error:'storage_not_configured'},503);
  const headers={apikey:secret,...(legacy?{Authorization:'Bearer '+legacy}:{})};
  async function storage(path:string,init:RequestInit={}){return fetch(url+'/storage/v1/'+path,{...init,headers:{...headers,...init.headers},signal:AbortSignal.timeout(15000),redirect:'error'});}
  const inputHash=await designHash(design),imageHash=await sha256(image),jobPath='jobs/'+design.jobId+'/result.json',runPath='runs/'+runner.runId+'/result.json';
  async function stored(path:string){const r=await storage('object/authenticated/'+POST_BUCKET+'/'+path);if(r.ok)return r.json();if(r.status===404||r.status===400)return null;throw Error('storage_read_failed');}
  async function checkExisting(path:string){const found=await stored(path);if(found&&(found.inputHash!==inputHash||found.jobId!==design.jobId))throw Error('idempotency_conflict');return found;}
  let found=await checkExisting(jobPath);if(found)return reply(found);found=await checkExisting(runPath);if(found)return reply(found);
  // This dedicated public bucket contains only final publication assets and public result manifests.
  const bucket=await storage('bucket/'+POST_BUCKET);if(bucket.ok){const config=await bucket.json();if(config.public!==true)throw Error('bucket_not_public');}else{if(bucket.status!==404&&bucket.status!==400)throw Error('bucket_unavailable');const created=await storage('bucket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:POST_BUCKET,name:POST_BUCKET,public:true,file_size_limit:MAX_JPEG_BYTES,allowed_mime_types:['image/jpeg','application/json']})});if(!created.ok&&created.status!==409){const error=await created.json().catch(()=>({}));if(!/exist/i.test(error.message||error.error||''))throw Error('bucket_create_failed');}}
  const imagePath='runs/'+runner.runId+'/'+imageHash+'.jpg',publicBase=url+'/storage/v1/object/public/'+POST_BUCKET+'/';
  async function put(path:string,data:BodyInit,type:string){const r=await storage('object/'+POST_BUCKET+'/'+path,{method:'POST',headers:{'Content-Type':type,'Cache-Control':'3600','x-upsert':'false'},body:data});if(!r.ok){const detail=await r.json().catch(()=>({}));if(r.status!==409&&!/exist|duplicate/i.test(detail.message||detail.error||''))throw Error('storage_upload_failed');}}
  await put(imagePath,image,'image/jpeg');
  const result={version:1,status:'completed',jobId:design.jobId,runId:runner.runId,inputHash,imageSha256:imageHash,format:'jpeg',width:1080,height:1350,bytes:image.length,imageUrl:publicBase+imagePath,resultUrl:publicBase+jobPath,caption:design.caption,createdAt:new Date().toISOString(),publishedToSocial:false};
  await put(runPath,JSON.stringify(result),'application/json');await checkExisting(runPath);await put(jobPath,JSON.stringify(result),'application/json');const confirmed=await checkExisting(jobPath);if(!confirmed)throw Error('manifest_missing');return reply(confirmed,201);
 }catch(e){if(e instanceof Error&&e.message==='idempotency_conflict')return reply({error:'idempotency_conflict'},409);console.error('studio asset store failed',e instanceof Error?e.message:'error');return reply({error:'asset_store_failed'},503);}
});
