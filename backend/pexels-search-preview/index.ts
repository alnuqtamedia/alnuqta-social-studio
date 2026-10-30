import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authorizeStudioOrigin, enforceStudioRateLimit } from "../_shared/studio-security.ts";
import { searchCommons } from "../_shared/commons-search.mjs";

async function searchOne(body: any){
    const query = String(body?.query || "").trim();
    const type = body?.type === "video" ? "video" : "photo";
    if (!query) throw Error("invalid_query");
    if(query.length>200)throw Error("query_too_long");
    if(body?.provider==='commons')return {items:type==='photo'?await searchCommons(query):[],provider:'Commons'};
    const key = Deno.env.get("PEXELS_API_KEY");
    if (!key) throw Error("PEXELS_API_KEY غير مفعّل في Supabase Secrets.");
    const orientation=body?.orientation==='any'?'':body?.orientation==="landscape"?"landscape":"portrait";
    const orientationParam=orientation?'&orientation='+orientation:'';
    const targetW=orientation==="landscape"?1280:720,targetH=orientation==="landscape"?720:1280;
    const url = type === "video"
      ? `https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(query)}${orientationParam}&per_page=8`
      : `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}${orientationParam}&per_page=8`;
    const response = await fetch(url, { headers: { Authorization: key },signal:AbortSignal.timeout(12000) });
    const data = await response.json();
    if (!response.ok) throw Error(data?.error || `Pexels HTTP ${response.status}`);
    const items = type === "video"
      ? (data.videos || []).map((video: any) => {
          const files = (video.video_files || []).filter((item: any) => item.link);
          const file = files.sort((a: any, b: any) => (Math.abs((a.width || 0) - targetW) + Math.abs((a.height || 0) - targetH)) - (Math.abs((b.width || 0) - targetW) + Math.abs((b.height || 0) - targetH)))[0];
          return { id: video.id, type: "video", width:file?.width,height:file?.height,preview: video.image, mediaUrl: file?.link || "", pageUrl: video.url, creator: video.user?.name || "Pexels", creatorUrl: video.user?.url || "", duration: video.duration };
        })
      : (data.photos || []).map((photo: any) => ({ id: photo.id, type: "photo", width:photo.width,height:photo.height,preview: photo.src?.medium || photo.src?.portrait, mediaUrl: photo.src?.large2x || photo.src?.large || photo.src?.portrait, pageUrl: photo.url, creator: photo.photographer || "Pexels", creatorUrl: photo.photographer_url || "" }));
    return { items, provider: "Pexels", remaining: response.headers.get("X-Ratelimit-Remaining"), reset: response.headers.get("X-Ratelimit-Reset") };
}

Deno.serve(async (req) => {
  const security = authorizeStudioOrigin(req);
  if (security instanceof Response) return security;
  const { cors } = security;
  const reply = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(value), { status, headers: { ...cors, ...headers } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const blocked = await enforceStudioRateLimit(req, "pexels-search", cors);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const searches=body?.searches;
    if(searches!==undefined){
      if(!Array.isArray(searches)||!searches.length||searches.length>3||searches.some(s=>typeof s?.query!=='string'||!s.query.trim()||s.query.length>200))return reply({error:'invalid_search_batch'},400);
      const results=await Promise.all(searches.map(async search=>{try{return await searchOne(search);}catch(error){return {items:[],error:error instanceof Error?error.message:String(error)};}}));
      return reply({results});
    }
    if(typeof body?.query!=='string'||!body.query.trim()||body.query.length>200)return reply({error:'invalid_query'},400);
    return reply(await searchOne(body));
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

