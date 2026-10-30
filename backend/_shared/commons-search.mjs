// Fixed upstream; callers supply search text, never an arbitrary URL.
const plain=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export function commonsItems(data){
 return Object.values(data.query?.pages||{}).flatMap(page=>{
  const info=page.imageinfo?.[0],meta=info?.extmetadata||{},license=plain(meta.LicenseShortName?.value),licenseUrl=meta.LicenseUrl?.value||'';
  // Conservative subset: no attribution is silently omitted by the renderer.
  if(!info||!['image/jpeg','image/png','image/webp'].includes(info.mime)||!['CC0','CC0 1.0','Public domain'].includes(license))return [];
  const mediaUrl=info.thumburl||info.url,preview=mediaUrl?.replace(/\/\d+px-/, '/320px-');
  try{const u=new URL(mediaUrl);if(u.protocol!=='https:'||u.hostname!=='upload.wikimedia.org'||!u.pathname.startsWith('/wikipedia/commons/'))return [];}catch{return [];}
  if(!String(page.title).startsWith('File:'))return [];
  return [{id:'commons-'+page.pageid,type:'photo',provider:'Commons',mediaUrl,preview,pageUrl:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(page.title.slice(5).replace(/ /g,'_')),creator:plain(meta.Artist?.value)||'Wikimedia Commons',license,licenseUrl:licenseUrl||'https://commons.wikimedia.org/wiki/Commons:Public_domain',width:info.thumbwidth||info.width,height:info.thumbheight||info.height}];
 });
}
export async function searchCommons(query,fetcher=fetch){
 const params=new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'12',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'1280'});
 const response=await fetcher('https://commons.wikimedia.org/w/api.php?'+params,{headers:{'User-Agent':'AlnuqtaSocialStudio/1.0 (media research)'},signal:AbortSignal.timeout(12000),redirect:'error'});
 if(!response.ok)throw Error('Commons HTTP '+response.status);
 const data=await response.json();if(data.error)throw Error('Commons search unavailable');
 return commonsItems(data).slice(0,8);
}
