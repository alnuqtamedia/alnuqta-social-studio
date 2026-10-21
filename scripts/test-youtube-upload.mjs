import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {createYouTubeUploads,uploadURL,uploadMetadata,CHUNK_BYTES,MAX_BYTES} from '../server/youtube-upload.mjs';
const queue=[],calls=[],rows=new Map(),key=randomBytes(32),userId=randomUUID(),channelId='UCtestchannel';
const store={
 async claim(input){const existing=[...rows.values()].find(row=>row.user_id===input.user_id&&row.request_id===input.request_id);if(existing)return {row:existing,created:false};const row={...input,id:randomUUID(),status:'initializing',uploaded_bytes:0};rows.set(row.id,row);return {row,created:true};},
 async get(user,id){const row=rows.get(id);return row?.user_id===user?row:null;},
 async lease(user,id,lease){const row=await this.get(user,id);if(!row||row.lease_id)return null;row.lease_id=lease;return row;},
 async patch(id,lease,patch){const row=rows.get(id);if(lease && row.lease_id!==lease)throw new Error('lost lease');Object.assign(row,patch);},
 async release(id,lease){const row=rows.get(id);if(row.lease_id===lease)row.lease_id=null;}
};
const reply=(status,body={},headers={})=>queue.push({status,body,headers});
const api=createYouTubeUploads({store,key,connection:async(user,channel)=>{assert.equal(user,userId);assert.equal(channel,channelId);return {tokens:{accessToken:'fake-server-only-token'}};},fetchImpl:async(url,options)=>{calls.push({url,options});const r=queue.shift();if(r instanceof Error)throw r;if(!r)throw new Error('Unexpected request');return {status:r.status,ok:r.status>=200&&r.status<300,json:async()=>r.body,headers:new Headers(r.headers)};}});
const input={title:'اختبار',description:'تقرير',privacyStatus:'public',madeForKids:false,syntheticMedia:true,totalBytes:CHUNK_BYTES+3,mimeType:'video/mp4',fingerprint:'a'.repeat(64),channelId,requestId:randomUUID()};
reply(200,{}, {Location:'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=private-session'});
const initial=await api.init({userId,input});assert.equal(initial.status,'uploading');assert.ok(!JSON.stringify(initial).includes('private-session'));assert.ok(!JSON.stringify(rows.get(initial.id).upload_secret).includes('private-session'));
assert.equal((await api.init({userId,input})).id,initial.id);assert.equal(calls.length,1);
await assert.rejects(api.init({userId,input:{...input,title:'different'}}),/upload_request_conflict/);
await assert.rejects(api.init({userId,input:{...input,totalBytes:MAX_BYTES+1}}),/video_too_large/);
reply(308);reply(308,{}, {Range:`bytes=0-${CHUNK_BYTES-1}`});
const progress=await api.chunk({userId,id:initial.id,offset:0,bytes:new Uint8Array(CHUNK_BYTES)});assert.equal(progress.uploadedBytes,CHUNK_BYTES);assert.equal(calls.at(-1).options.headers['Content-Range'],`bytes 0-${CHUNK_BYTES-1}/${CHUNK_BYTES+3}`);assert.equal(calls.at(-1).options.redirect,'manual');
reply(308,{}, {Range:`bytes=0-${CHUNK_BYTES-1}`});
const stale=await api.chunk({userId,id:initial.id,offset:0,bytes:new Uint8Array(CHUNK_BYTES)});assert.equal(stale.uploadedBytes,CHUNK_BYTES);assert.equal(calls.at(-1).options.headers['Content-Range'],`bytes */${CHUNK_BYTES+3}`);
reply(308,{}, {Range:`bytes=0-${CHUNK_BYTES-1}`});reply(201,{id:'video1234567'});reply(200,{items:[{id:'video1234567',snippet:{channelId},status:{uploadStatus:'uploaded',privacyStatus:'private'}}]});
const processing=await api.chunk({userId,id:initial.id,offset:CHUNK_BYTES,bytes:new Uint8Array(3)});assert.equal(processing.status,'processing');assert.equal(processing.videoId,'video1234567');
reply(200,{items:[{id:'video1234567',snippet:{channelId},status:{uploadStatus:'processed',privacyStatus:'private'}}]});const complete=await api.status({userId,id:initial.id});assert.equal(complete.status,'uploaded_private');assert.equal(complete.requestedPrivacy,'public');assert.equal(complete.privacyStatus,'private');
reply(200,{items:[{id:'video1234567',snippet:{channelId},status:{uploadStatus:'processed',privacyStatus:'public'}}]});assert.equal((await api.status({userId,id:initial.id})).status,'published');
reply(200,{items:[{id:'video1234567',snippet:{channelId:'other'},status:{uploadStatus:'processed',privacyStatus:'public'}}]});await assert.rejects(api.status({userId,id:initial.id}),/youtube_channel_mismatch/);
await assert.rejects(api.status({userId:randomUUID(),id:initial.id}),/upload_not_found/);
rows.get(initial.id).lease_id='occupied';await assert.rejects(api.status({userId,id:initial.id}),/upload_busy/);rows.get(initial.id).lease_id=null;
for(const url of ['http://www.googleapis.com/upload/youtube/v3/videos?upload_id=x','https://evil.example/upload/youtube/v3/videos?upload_id=x','https://www.googleapis.com/upload/youtube/v3/videos?upload_id=x#x'])assert.throws(()=>uploadURL(url));
assert.throws(()=>uploadMetadata({...input,title:'<script>'}));
reply(403,{error:{errors:[{reason:'quotaExceeded'}]}});await assert.rejects(api.init({userId,input:{...input,requestId:randomUUID()}}),/youtube_quota_exceeded/);
assert.equal(queue.length,0);assert.ok(!JSON.stringify(complete).includes('fake-server-only-token'));
console.log('YouTube upload checks passed: ownership, duplicate initialization, encrypted session, offsets, chunks, leases, processing/private/public distinctions, SSRF, quota and token isolation. Mock Google only.');
