import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {timingSafeEqual,createHash} from 'node:crypto';
import {JobStore,Worker,publicJob} from './jobs.mjs';
export async function createServer({root,token,origin,adapter}){
 if(!token||token.length<32)throw Error('Set STUDIO_WORKER_TOKEN to at least 32 random characters');
 const u=new URL(origin);if(u.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(u.hostname))throw Error('invalid_origin');
 const digest=createHash('sha256').update(token).digest(),store=new JobStore(root);await store.init();await store.recover();const worker=new Worker(store,adapter);
 const server=http.createServer(async(req,res)=>{
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  if(req.headers.origin){if(req.headers.origin!==origin)return reply(403,{error:'origin_denied'});res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'});return res.end();}
  if(req.url==='/health'&&req.method==='GET')return reply(200,{status:'ready',version:1});
  const actual=createHash('sha256').update((req.headers.authorization||'').replace(/^Bearer /,'')).digest();if(!timingSafeEqual(digest,actual))return reply(401,{error:'unauthorized'});
  try{
   const url=new URL(req.url,'http://worker'),match=url.pathname.match(/^\/v1\/jobs\/([0-9a-f-]{36})(?:\/(file|retry|trace))?$/i);
   if(req.method==='POST'&&url.pathname==='/v1/jobs'){
    let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>30*1024*1024)return reply(413,{error:'body_too_large'});body+=chunk;}
    const job=await store.submit(JSON.parse(body));return reply(202,publicJob(job));
   }
   if(req.method==='GET'&&url.pathname==='/v1/jobs')return reply(200,(await store.list()).sort((a,b)=>b.createdAt-a.createdAt).slice(0,30).map(publicJob));
   if(match){const job=await store.read(match[1]);if(!match[2]&&req.method==='GET')return reply(200,publicJob(job));
    if(match[2]==='trace'&&req.method==='GET'){let snapshot;try{snapshot=JSON.parse(await fs.promises.readFile(path.join(store.dir(job.id),'checkpoint.json'),'utf8'));}catch{}return reply(200,{job:publicJob(job),requests:snapshot?.requests||[]});}
    if(match[2]==='file'&&req.method==='GET'){if(job.status!=='completed')return reply(409,{error:'job_not_completed'});const file=path.join(store.dir(job.id),'output.mp4'),stat=fs.statSync(file);res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':stat.size,'Content-Disposition':'attachment; filename="alnuqta-'+job.id+'.mp4"','Cache-Control':'no-store'});return fs.createReadStream(file).pipe(res);}
    if(match[2]==='retry'&&req.method==='POST'){if(job.status!=='failed'||!job.error?.retryable)return reply(409,{error:'not_retryable'});job.status='queued';job.nextAttemptAt=0;job.attempts[job.stage]=0;await store.write(job);return reply(202,publicJob(job));}
   }
   reply(404,{error:'not_found'});
  }catch(e){reply(e.code==='ENOENT'?404:/conflict|queue_full/.test(e.message)?409:400,{error:String(e.message).slice(0,200)});}
 });
 const timer=setInterval(()=>worker.tick().catch(()=>{}),1000);timer.unref();server.on('close',()=>clearInterval(timer));return {server,store,worker};
}
if(import.meta.url===new URL(process.argv[1]||'', 'file:').href){const {BrowserAdapter}=await import('./studio-adapter.mjs');const {server}=await createServer({root:process.env.STUDIO_JOB_DIR||'/data/jobs',token:process.env.STUDIO_WORKER_TOKEN,origin:process.env.STUDIO_ALLOWED_ORIGIN||'https://alnuqta-social-studio.vercel.app',adapter:new BrowserAdapter()});server.listen(Number(process.env.PORT||8080),'0.0.0.0');}
