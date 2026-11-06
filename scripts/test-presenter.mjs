import assert from 'node:assert/strict';
import {makeHandler,readiness,payload,parseSrt} from '../api/presenter.mjs';
const env={HEYGEN_API_KEY:'server-secret',STUDIO_PRESENTER_ACCESS_TOKEN:'owner-secret',HEYGEN_PRESENTER_IMAGE_URL:'https://example.com/approved.jpg',HEYGEN_VOICE_ID:'verified-voice'};
assert.equal(readiness({}).ready,false);assert(!JSON.stringify(readiness(env)).includes('server-secret'));
assert.throws(()=>payload({script:'x'.repeat(1801)},env));assert.equal(payload({script:'خبر'},env).voice_settings.speed,1);assert.equal(payload({script:'خبر'},env).image.url,env.HEYGEN_PRESENTER_IMAGE_URL);
assert.deepEqual(parseSrt('1\n00:00:01,000 --> 00:00:02,500\nنص الخبر\n'),[{start:1,end:2.5,text:'نص الخبر'}]);
const calls=[];const fetcher=async(url,opt={})=>{url=String(url);calls.push({url,opt});if(url.endsWith('/videos'))return {ok:true,json:async()=>({data:{video_id:'job123'}})};if(url.endsWith('/videos/job123'))return {ok:true,json:async()=>({data:{status:'completed',video_url:'https://example.com/out.mp4',subtitle_url:'https://example.com/out.srt',duration:3}})};return{ok:true,text:async()=> '1\n00:00:01,000 --> 00:00:02,500\nنص الخبر'};};
const handler=makeHandler({env,fetcher,now:()=>1000});
async function request(body,headers={origin:'https://alnuqta-social-studio.vercel.app',authorization:'Bearer owner-secret'},method='POST',h=handler){const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};await h({method,headers,body},res);return res;}
assert.equal((await request({},undefined,'GET')).data.ready,true);
assert.equal((await request({action:'generate',script:'خبر'},{})).code,403);assert.equal(calls.length,0);
assert.equal((await request({action:'generate',script:'خبر'},{origin:'https://alnuqta-social-studio.vercel.app'})).code,401);assert.equal(calls.length,0);
const created=await request({action:'generate',script:'خبر',title:'عنوان'});assert.equal(created.code,202);assert.equal(calls.length,1);assert(!JSON.stringify(created.data).includes('server-secret'));
assert.equal((await request({action:'status',receipt:created.data.receipt+'x'})).code,403);
const complete=await request({action:'status',receipt:created.data.receipt});assert.equal(complete.data.status,'completed');assert.equal(complete.data.captions.length,1);
let count=0;const uncertain=makeHandler({env,fetcher:async()=>{count++;throw Error('timeout');}});assert.equal((await request({action:'generate',script:'خبر'},undefined,'POST',uncertain)).data.error,'submission_uncertain');assert.equal(count,1);
const missing=makeHandler({env:{},fetcher});assert.equal((await request({action:'generate',script:'خبر'},undefined,'POST',missing)).code,503);
console.log('PASS: configuration, owner authorization, signed job ownership, real subtitles, natural speed and no generation retry.');
