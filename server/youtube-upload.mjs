import { Buffer } from 'node:buffer';
import { randomBytes, randomUUID, createCipheriv, createDecipheriv } from 'node:crypto';
export const CHUNK_BYTES=1048576, MAX_BYTES=262144000;
const fail=code=>{const error=new Error(code);error.code=code;throw error;};
const canonical=value=>JSON.stringify(value,(_,v)=>v && typeof v==='object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))) : v);
const uuid=value=>typeof value==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export function uploadURL(value){
 const url=new URL(value);
 if(url.protocol!=='https:' || url.hostname!=='www.googleapis.com' || url.port || url.username || url.password || url.hash || url.pathname!=='/upload/youtube/v3/videos' || !url.searchParams.get('upload_id'))fail('invalid_upload_session');
 return url.href;
}
export function uploadMetadata(input){
 if(typeof input.title!=='string' || !input.title.trim() || input.title.length>100 || /[<>]/.test(input.title))fail('invalid_video_title');
 if(typeof input.description!=='string' || Buffer.byteLength(input.description,'utf8')>5000 || /[<>]/.test(input.description))fail('invalid_video_description');
 if(!['private','unlisted','public'].includes(input.privacyStatus) || typeof input.madeForKids!=='boolean' || typeof input.syntheticMedia!=='boolean')fail('invalid_video_settings');
 return {snippet:{title:input.title.trim(),description:input.description,categoryId:'25'},status:{privacyStatus:input.privacyStatus,selfDeclaredMadeForKids:input.madeForKids,containsSyntheticMedia:input.syntheticMedia}};
}
export function createYouTubeUploads({store,connection,key,fetchImpl=fetch}){
 if(!Buffer.isBuffer(key)||key.length!==32)fail('invalid_encryption_key');
 const aad=row=>JSON.stringify([row.user_id,row.id,'youtube-upload-v1']);
 function seal(url,row){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(aad(row)));const data=Buffer.concat([cipher.update(url,'utf8'),cipher.final()]);return {iv:iv.toString('base64url'),tag:cipher.getAuthTag().toString('base64url'),data:data.toString('base64url')};}
 function unseal(record,row){const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(record.iv,'base64url'));decipher.setAAD(Buffer.from(aad(row)));decipher.setAuthTag(Buffer.from(record.tag,'base64url'));return uploadURL(Buffer.concat([decipher.update(Buffer.from(record.data,'base64url')),decipher.final()]).toString());}
 const view=row=>({id:row.id,status:row.status,totalBytes:Number(row.total_bytes),uploadedBytes:Number(row.uploaded_bytes),videoId:row.video_id||null,privacyStatus:row.actual_privacy||null,requestedPrivacy:row.metadata.status.privacyStatus,url:row.video_id?`https://www.youtube.com/watch?v=${encodeURIComponent(row.video_id)}`:null,chunkBytes:CHUNK_BYTES});
 async function google(url,options,timeout=20000){return fetchImpl(url,{...options,redirect:'manual',signal:AbortSignal.timeout(timeout)});}
 async function rejectGoogle(response){let reason='';try{const body=await response.json();reason=body.error?.errors?.[0]?.reason;}catch{}
  if(['quotaExceeded','dailyLimitExceeded','uploadLimitExceeded'].includes(reason))fail('youtube_quota_exceeded');
  if(response.status===401)fail('youtube_reconnect_required');
  if(response.status===403)fail('youtube_permission_denied');
  if(response.status===404)fail('upload_session_expired');
  fail('youtube_request_failed');
 }
 async function owned(userId,id){if(!uuid(id))fail('invalid_upload_id');const row=await store.get(userId,id);if(!row||row.user_id!==userId)fail('upload_not_found');return row;}
 async function verified(row,token,lease){
  const response=await google(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${encodeURIComponent(row.video_id)}`,{headers:{Authorization:`Bearer ${token}`}});
  if(!response.ok)await rejectGoogle(response);
  const data=await response.json(),video=data.items?.[0];
  if(!video){await store.patch(row.id,lease,{status:'processing'});row.status='processing';return view(row);}
  if(video.id!==row.video_id || video.snippet?.channelId!==row.channel_id)fail('youtube_channel_mismatch');
  const privacy=video.status?.privacyStatus,upload=video.status?.uploadStatus;
  let status='processing';if(['failed','rejected','deleted'].includes(upload))status='failed';
  else if(upload==='processed'){if(privacy==='public')status='published';else if(privacy==='private')status='uploaded_private';else if(privacy==='unlisted')status='uploaded_unlisted';}
  const patch={status,actual_privacy:privacy||null};await store.patch(row.id,lease,patch);Object.assign(row,patch);return view(row);
 }
 async function consume(response,row,token,lease){
  if(response.status===308){const range=response.headers.get('Range');const match=range?.match(/^bytes=0-(\d+)$/);if(range&&!match)fail('invalid_upload_progress');const offset=match?Number(match[1])+1:0;if(offset<0||offset>=row.total_bytes)fail('invalid_upload_progress');await store.patch(row.id,lease,{uploaded_bytes:offset,status:'uploading'});row.uploaded_bytes=offset;row.status='uploading';return view(row);}
  if(response.status!==200&&response.status!==201)await rejectGoogle(response);
  const data=await response.json();if(typeof data.id!=='string'||!/^[A-Za-z0-9_-]{6,64}$/.test(data.id))fail('missing_video_confirmation');
  const patch={video_id:data.id,uploaded_bytes:row.total_bytes,status:'processing'};await store.patch(row.id,lease,patch);Object.assign(row,patch);return verified(row,token,lease);
 }
 async function probe(row,token,lease){if(row.video_id)return verified(row,token,lease);if(!row.upload_secret)fail('upload_initialization_incomplete');const response=await google(unseal(row.upload_secret,row),{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Length':'0','Content-Range':`bytes */${row.total_bytes}`},body:new Uint8Array()});return consume(response,row,token,lease);}
 async function locked(userId,id,action){const original=await owned(userId,id),lease=randomUUID();const row=await store.lease(userId,id,lease);if(!row)fail('upload_busy');try{const {tokens}=await connection(userId,row.channel_id);return await action(row,tokens.accessToken,lease);}finally{await store.release(original.id,lease);}}
 return {
  async init({userId,input}){
   const metadata=uploadMetadata(input);
   if(!uuid(input.requestId)||typeof input.channelId!=='string'||!/^[A-Za-z0-9_-]{6,64}$/.test(input.channelId))fail('invalid_upload_request');
   if(!Number.isSafeInteger(input.totalBytes)||input.totalBytes<=0||input.totalBytes>MAX_BYTES)fail('video_too_large');
   if(!['video/mp4','video/webm','video/quicktime'].includes(input.mimeType))fail('unsupported_video_type');
   if(typeof input.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(input.fingerprint))fail('invalid_file_fingerprint');
   metadata.mimeType=input.mimeType;metadata.fingerprint=input.fingerprint;
   const {tokens}=await connection(userId,input.channelId);
   const claim=await store.claim({user_id:userId,channel_id:input.channelId,request_id:input.requestId,total_bytes:input.totalBytes,metadata});
   const row=claim.row;
   if(row.channel_id!==input.channelId || Number(row.total_bytes)!==input.totalBytes || canonical(row.metadata)!==canonical(metadata))fail('upload_request_conflict');
   if(!claim.created)return view(row);
   try{
    const response=await google('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',{method:'POST',headers:{Authorization:`Bearer ${tokens.accessToken}`,'Content-Type':'application/json','X-Upload-Content-Length':String(input.totalBytes),'X-Upload-Content-Type':input.mimeType},body:JSON.stringify({snippet:metadata.snippet,status:metadata.status})});
    if(!response.ok)await rejectGoogle(response);
    const url=uploadURL(response.headers.get('Location'));const patch={upload_secret:seal(url,row),status:'uploading'};await store.patch(row.id,null,patch);Object.assign(row,patch);return view(row);
   }catch(error){await store.patch(row.id,null,{status:'initialization_failed'});throw error;}
  },
  async status({userId,id}){return locked(userId,id,(row,token,lease)=>probe(row,token,lease));},
  async chunk({userId,id,offset,bytes}){
   if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>CHUNK_BYTES||!Number.isSafeInteger(offset)||offset<0)fail('invalid_upload_chunk');
   return locked(userId,id,async(row,token,lease)=>{
    const before=await probe(row,token,lease);if(before.videoId)return before;
    if(before.uploadedBytes!==offset)return before;
    if(offset+bytes.length>row.total_bytes || (offset+bytes.length<row.total_bytes && bytes.length!==CHUNK_BYTES))fail('invalid_upload_chunk');
    const response=await google(unseal(row.upload_secret,row),{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':row.metadata.mimeType,'Content-Length':String(bytes.length),'Content-Range':`bytes ${offset}-${offset+bytes.length-1}/${row.total_bytes}`},body:bytes},45000);
    return consume(response,row,token,lease);
   });
  }
 };
}
