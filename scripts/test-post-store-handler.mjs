import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {stripTypeScriptTypes} from 'node:module';
import {POST_BUCKET,MAX_JPEG_BYTES,validateDesign,designHash,sha256,jpegDimensions} from '../supabase/functions/_shared/studio-post-contract.mjs';
let handler,bucket=false,requests=0,uploads=0;const objects=new Map();
const context=vm.createContext({Response,URL,AbortSignal,Uint8Array,TextDecoder,JSON,Date,atob,console,POST_BUCKET,MAX_JPEG_BYTES,validateDesign,designHash,sha256,jpegDimensions,jwtVerify(){},createRemoteJWKSet(){},createGithubVerifier:()=>async token=>{if(token!=='fixture-valid-runner')throw Error('unauthorized');return {runId:'123456'};},Deno:{env:{get:n=>({SUPABASE_URL:'https://storage.test',SUPABASE_SERVICE_ROLE_KEY:'server-secret-fixture'})[n]},serve(fn){handler=fn;}},fetch:async(url,init)=>{
 requests++;assert.equal(init.headers.apikey,'server-secret-fixture');const p=new URL(url).pathname.replace('/storage/v1/','');if(p==='bucket/'+POST_BUCKET)return bucket?Response.json({public:true}):Response.json({error:'not found'},{status:404});
 if(p==='bucket'){const b=JSON.parse(init.body);assert.equal(b.public,true);assert.deepEqual(b.allowed_mime_types,['image/jpeg','application/json']);bucket=true;return Response.json({id:POST_BUCKET});}
 if(p.startsWith('object/authenticated/')){const key=p.slice(('object/authenticated/'+POST_BUCKET+'/').length);return objects.has(key)?new Response(objects.get(key),{headers:{'Content-Type':'application/json'}}):Response.json({error:'not found'},{status:404});}
 assert(p.startsWith('object/'+POST_BUCKET+'/'));const key=p.slice(('object/'+POST_BUCKET+'/').length);if(objects.has(key))return Response.json({error:'already exists'},{status:409});objects.set(key,init.body);if(key.endsWith('.jpg'))uploads++;return Response.json({Key:key});
}});
vm.runInContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/studio-store-post/index.ts','utf8')).replace(/^import .*;$/mg,''),context);
const design={jobId:'5279880e-16b5-4f51-86a4-ecad9c9db1df',headline:'تجربة',summary:'معاينة',imageUrl:'https://images.pexels.com/photos/1/a.jpg',caption:'تجربة'};const jpeg=Buffer.from([255,216,255,192,0,17,8,5,70,4,56,3,1,17,0,2,17,0,3,17,0,255,217]).toString('base64');
const call=(payload,token='fixture-valid-runner')=>handler(new Request('https://function.test',{method:'POST',headers:{'Content-Type':'application/json',...(token?{'x-studio-runner-token':token}:{})},body:JSON.stringify(payload)}));
let r=await call({design,jpegBase64:jpeg},'');assert.equal(r.status,401);assert.equal(requests,0);
r=await call({design,jpegBase64:jpeg});assert.equal(r.status,201);const result=await r.json();assert.equal(result.status,'completed');assert.equal(result.publishedToSocial,false);assert(result.imageUrl.endsWith('.jpg'));assert.equal(uploads,1);assert(!JSON.stringify(result).includes('server-secret-fixture'));
r=await call({design,jpegBase64:jpeg});assert.equal(r.status,200);assert.equal(uploads,1);assert.deepEqual(await r.json(),result);
r=await call({design:{...design,headline:'محتوى آخر'},jpegBase64:jpeg});assert.equal(r.status,409);assert.equal(uploads,1);
r=await call({design,jpegBase64:Buffer.from('<svg/>').toString('base64')});assert.equal(r.status,400);assert.equal(uploads,1);
console.log('Asset store: authentication before storage, bucket restrictions, image/result URLs, idempotency, conflict protection, invalid-image rejection and no secret leakage passed.');
