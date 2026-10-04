import { randomBytes, createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { createSocialOAuth } from './social-oauth.mjs';
import { createYouTubeOAuth } from './youtube-oauth.mjs';

const base = Deno.env.get('SUPABASE_URL')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const endpoint = `${base}/functions/v1/studio-social`;
const callback = `${endpoint}/youtube/callback`;
const origins = new Set(['https://alnuqtamedia.github.io','https://alnuqta-social-studio.vercel.app']);
const cookieName = '__Host-alnuqta-studio-oauth';
const hash = (s:string) => createHash('sha256').update(s).digest('base64url');
const random = () => randomBytes(32).toString('base64url');
const cookie = (value:string, age=600) => `${cookieName}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`;

async function db(path:string, method='GET', body?:unknown) {
  const response = await fetch(`${base}/rest/v1/${path}`, {method, headers:{apikey:service, Authorization:`Bearer ${service}`, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=representation'}, ...(body !== undefined ? {body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('Private storage unavailable');
  const text = await response.text(); return text ? JSON.parse(text) : null;
}
const filter = (kind:string,key:string) => `studio_oauth_records?kind=eq.${encodeURIComponent(kind)}&key=eq.${encodeURIComponent(key)}`;
async function put(kind:string,key:string,userId:string,payload:unknown,expiresAt?:number) {
  await db('studio_oauth_records?on_conflict=kind,key','POST',{kind,key,user_id:userId,payload,expires_at:expiresAt ? new Date(expiresAt).toISOString() : null});
}
async function get(kind:string,key:string) { const rows=await db(filter(kind,key)); return rows?.[0] || null; }
async function take(kind:string,key:string) { return db('rpc/studio_oauth_take','POST',{p_kind:kind,p_key:key}); }
async function active(userId:string,sessionId:string) { return db('rpc/studio_oauth_session_active','POST',{p_user:userId,p_session:sessionId}); }
function configured() { return ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','STUDIO_TOKEN_ENCRYPTION_KEY'].every(key=>Boolean(Deno.env.get(key))); }
function oauth() {
  const key = Buffer.from(Deno.env.get('STUDIO_TOKEN_ENCRYPTION_KEY') || '', 'base64');
  const store = {
    putState:(key:string,p:any)=>put('state',key,p.userId,p,p.expiresAt), takeState:(key:string)=>take('state',key),
    putConnection:(p:any)=>put('connection',hash(JSON.stringify([p.userId,p.provider,p.accountId])),p.userId,p),
    getConnection:()=>{throw new Error('Publication unavailable');}, claimPublication:()=>{throw new Error('Publication unavailable');}, finishPublication:()=>{throw new Error('Publication unavailable');}
  };
  return createSocialOAuth({store,key,adapters:{youtube:createYouTubeOAuth({clientId:Deno.env.get('GOOGLE_CLIENT_ID'),clientSecret:Deno.env.get('GOOGLE_CLIENT_SECRET'),redirectUri:callback})}});
}
async function owner(req:Request) {
  const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new Error('Authentication required');
  const response=await fetch(`${base}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('Authentication required');
  const user=await response.json();
  const allowed=(Deno.env.get('STUDIO_OWNER_EMAILS') || 'alnuqtamedia@gmail.com').split(',').map(v=>v.trim().toLowerCase());
  if (!user.email_confirmed_at || !allowed.includes(String(user.email).toLowerCase())) throw new Error('Studio access denied');
  // Only decode AFTER server validation. This is a session lookup, not signature verification.
  const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
  if (!claims.session_id || !await active(user.id,claims.session_id)) throw new Error('Session is no longer active');
  return {userId:user.id,authSession:claims.session_id};
}
export async function handle(req:Request) {
  const url=new URL(req.url), route=url.pathname.split('/studio-social')[1] || '/';
  const origin=req.headers.get('Origin');
  const headers:Record<string,string>={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'Vary':'Origin'};
  if (origin && origins.has(origin)) { headers['Access-Control-Allow-Origin']=origin; headers['Access-Control-Allow-Headers']='authorization,apikey,content-type'; headers['Access-Control-Allow-Methods']='GET,POST,OPTIONS'; }
  const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
  const redirect=(location:string,extra:Record<string,string>={})=>new Response(null,{status:303,headers:{...headers,Location:location,...extra}});
  if (req.method==='OPTIONS') return origin && origins.has(origin) ? new Response(null,{status:204,headers}) : json({error:'Origin denied'},403);
  if (origin && !origins.has(origin)) return json({error:'Origin denied'},403);
  if (route==='/health' && req.method==='GET') return json({service:'studio-social',deployed:true,oauthConfigured:configured(),publishingAvailable:false,callback});
  try {
    if (route==='/youtube/start' && req.method==='POST') {
      const user=await owner(req);
      if (!origin || !origins.has(origin)) return json({error:'Origin required'},403);
      if (!configured()) return json({error:'Google OAuth configuration is incomplete'},503);
      if (!await db('rpc/studio_oauth_rate','POST',{p_user:user.userId})) return json({error:'Too many linking attempts'},429);
      const ticket=random(),sessionId=random();
      // First-party handoff sets the HttpOnly cookie; avoids third-party cookie reliance.
      await put('ticket',hash(ticket),user.userId,{...user,sessionId},Date.now()+60000);
      return json({authorizationUrl:`${endpoint}/youtube/authorize?ticket=${encodeURIComponent(ticket)}`});
    }
    if (route==='/youtube/authorize' && req.method==='GET') {
      const ticket=url.searchParams.get('ticket');
      if (!ticket || ticket.length!==43) return json({error:'Invalid authorization handoff'},400);
      const pending=await take('ticket',hash(ticket));
      if (!pending || !await active(pending.userId,pending.authSession)) return json({error:'Authorization handoff expired'},400);
      if (!configured()) return json({error:'Google OAuth configuration is incomplete'},503);
      await put('session',hash(pending.sessionId),pending.userId,pending,Date.now()+600000);
      const result=await oauth().begin({userId:pending.userId,sessionId:pending.sessionId,provider:'youtube'});
      return redirect(result.authorizationUrl,{'Set-Cookie':cookie(pending.sessionId)});
    }
    if (route==='/youtube/callback' && req.method==='GET') {
      const sessionId=req.headers.get('Cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
      const state=url.searchParams.get('state');
      if (!sessionId || sessionId.length!==43 || !state || state.length!==43) return json({error:'Invalid or expired authorization'},400);
      const record=await get('session',hash(sessionId));
      if (!record || Date.parse(record.expires_at)<=Date.now() || !await active(record.user_id,record.payload.authSession)) return json({error:'Session expired; reconnect from the studio'},400);
      if (!configured()) return json({error:'Google OAuth configuration is incomplete'},503);
      const result=await oauth().complete({userId:record.user_id,sessionId,provider:'youtube',state,code:url.searchParams.get('code'),denied:Boolean(url.searchParams.get('error'))});
      await db(filter('session',hash(sessionId)),'DELETE');
      // Return only non-sensitive outcome. Studio must independently fetch account list.
      return redirect(`https://alnuqtamedia.github.io/alnuqta-social-studio/social-accounts.html?youtube=${result.connected?'connected':'declined'}`,{'Set-Cookie':cookie('',0)});
    }
    if (route==='/accounts' && req.method==='GET') {
      const user=await owner(req);
      const rows=await db(`studio_oauth_records?kind=eq.connection&user_id=eq.${encodeURIComponent(user.userId)}&select=payload`);
      return json({accounts:rows.map((r:any)=>({provider:r.payload.provider,accountId:r.payload.accountId,name:r.payload.name,connectedAt:r.payload.connectedAt}))});
    }
    return json({error:'Route unavailable'},404);
  } catch { return json({error:'Request rejected; sign in again or restart account linking'},400); }
}
if (import.meta.main) Deno.serve(handle);
