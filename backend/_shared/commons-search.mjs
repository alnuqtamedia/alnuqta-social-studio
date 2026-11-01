// Fixed upstream; callers supply search text, never an arbitrary URL.
const plain=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export function commonsItems(data,{referenceUrl=''}={}){
 return Object.values(data.query?.pages||{}).flatMap(page=>{
  const info=page.imageinfo?.[0],meta=info?.extmetadata||{},license=plain(meta.LicenseShortName?.value),licenseUrl=meta.LicenseUrl?.value||'';
  // Conservative subset: no attribution is silently omitted by the renderer.
  if(!info||!['image/jpeg','image/png','image/webp'].includes(info.mime)||!['CC0','CC0 1.0','Public domain',...(referenceUrl?['CC BY 4.0']:[])].includes(license))return [];
  const mediaUrl=info.thumburl||info.url,preview=mediaUrl?.replace(/\/\d+px-/, '/250px-');
  try{const u=new URL(mediaUrl);if(u.protocol!=='https:'||!['upload.wikimedia.org','thumb.wikimedia.org'].includes(u.hostname)||!u.pathname.startsWith('/wikipedia/commons/'))return [];}catch{return [];}
  if(!String(page.title).startsWith('File:'))return [];
  return [{id:'commons-'+page.pageid,type:'photo',provider:'Commons',mediaUrl,preview,pageUrl:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(page.title.slice(5).replace(/ /g,'_')),creator:plain(meta.Artist?.value)||'Wikimedia Commons',license,requiresAttribution:license==='CC BY 4.0',...(referenceUrl?{referenceEvidence:{kind:'commons-file',referenceUrl,sourceTitle:plain(page.title),description:plain(meta.ImageDescription?.value).slice(0,1500)}}:{}),licenseUrl:license==='CC BY 4.0'?'https://creativecommons.org/licenses/by/4.0/':licenseUrl||'https://commons.wikimedia.org/wiki/Commons:Public_domain',width:info.thumbwidth||info.width,height:info.thumbheight||info.height}];
 });
}
export async function searchCommons(query,fetcher=fetch){
 const params=new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'12',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'1280'});
 const response=await fetcher('https://commons.wikimedia.org/w/api.php?'+params,{headers:{'User-Agent':'AlnuqtaSocialStudio/1.0 (media research)'},signal:AbortSignal.timeout(12000),redirect:'error'});
 if(!response.ok)throw Error('Commons HTTP '+response.status);
 const data=await response.json();if(data.error)throw Error('Commons search unavailable');
 return commonsItems(data).slice(0,8);
}

export function commonsReferenceTitle(value){
 const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='commons.wikimedia.org'||u.port||u.username||u.password||u.search||u.hash||!u.pathname.startsWith('/wiki/File:'))throw Error('invalid_commons_reference');
 const title=decodeURIComponent(u.pathname.slice(6)).replace(/_/g,' ');if(title.length>300||!/^File:.+\.(?:jpe?g|png|webp)$/i.test(title)||/[\x00-\x1f]/.test(title))throw Error('invalid_commons_reference');return title;
}
export async function resolveCommonsReference(value,fetcher=fetch){
 const title=commonsReferenceTitle(value),referenceUrl='https://commons.wikimedia.org/wiki/'+encodeURIComponent(title.replace(/ /g,'_')).replace(/%3A/g,':');
 const params=new URLSearchParams({action:'query',format:'json',titles:title,prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'1280'});
 const response=await fetcher('https://commons.wikimedia.org/w/api.php?'+params,{headers:{'User-Agent':'AlnuqtaSocialStudio/1.0 (reference import)'},signal:AbortSignal.timeout(12000),redirect:'error'});
 if(!response.ok)throw Error('Commons reference HTTP '+response.status);const data=await response.json();if(data.error)throw Error('Commons reference unavailable');return commonsItems(data,{referenceUrl}).slice(0,1);
}
