const strip=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
const has=(text,values)=>values.some(v=>v&&new RegExp('(?:^|[^a-z])'+v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:$|[^a-z])','i').test(text));
export function commonsCandidate(page,context){
 const info=page?.imageinfo?.[0],m=info?.extmetadata||{},value=k=>strip(m[k]?.value),title=String(page?.title||'');if(!info)return null;
 const license=value('LicenseShortName'),licenseUrl=value('LicenseUrl');
 // No in-frame credit is wanted: automatically use only CC0 / public-domain files.
 const automatic=/^(?:CC0(?: 1\.0)?|Public domain|PD(?:-.*)?)$/i.test(license)&&(!licenseUrl||/^https:\/\/(?:creativecommons\.org\/(?:publicdomain\/)|commons\.wikimedia\.org\/)/.test(licenseUrl));
 const attributed=/^CC BY (?:1\.0|2\.0|2\.5|3\.0|4\.0)$/i.test(license)&&/^https:\/\/creativecommons\.org\/licenses\/by\/(?:1\.0|2\.0|2\.5|3\.0|4\.0)\/?$/.test(licenseUrl);
 if((!automatic&&!attributed)||automatic&&value('AttributionRequired').toLowerCase()==='true'||value('Restrictions'))return null;
 const evidence=[title,value('ImageDescription'),value('Categories'),value('ObjectName')].join(' ');
 const capturedAt=value('DateTimeOriginal'),year=Number((capturedAt.match(/(?:18|19|20)\d{2}/)||title.match(/(?:18|19|20)\d{2}/)||[])[0]);
 if(!context.allowHistorical&&year&&year<2000)return null;
 if(!context.allowHistorical&&/historical map|historic map|ancient|1932|19th century/i.test(title))return null;
 if(!/army|military|war|conflict|جيش|حرب|أمن/.test(context.query)&&/magpul|bombing|patrol|soldier|weapon|military|shooting|combat|terror/i.test(title))return null;
 if(!has(evidence,[context.country,context.aliases?.[1],...(context.cityAliases||[])].filter(Boolean)))return null;
 const foreignPlaces=[['Iraq',/\bIraq\b|Baghdad|Basra/i],['Egypt',/\bEgypt\b|Cairo|Alexandria/i],['Canada',/\bCanada\b|Toronto|Ottawa/i],['South Korea',/South Korea|Seoul/i],['United States',/United States|Washington DC|New York/i],['France',/\bFrance\b|Paris/i],['Germany',/\bGermany\b|Berlin/i]];
 if(foreignPlaces.some(([country,re])=>country!==context.country&&re.test(title)))return null;
 if(context.city&&!has(evidence,context.cityAliases||[context.city]))return null;
 if(context.entity&&!has(evidence,context.entityAliases||[context.entity]))return null;
 const video=['video/webm','video/ogg'].includes(info.mime),photo=['image/jpeg','image/png','image/webp','image/svg+xml'].includes(info.mime);
 if(!video&&!photo||video&&(info.size>50000000||info.width>1920)||!info.thumburl)return null;
 const mediaUrl=video?info.url:info.thumburl;
 for(const url of [mediaUrl,info.thumburl]){try{const u=new URL(url);if(u.protocol!=='https:'||!['upload.wikimedia.org','thumb.wikimedia.org'].includes(u.hostname)||!u.pathname.startsWith('/wikipedia/commons/'))return null;}catch{return null;}}
 return {id:'commons-'+page.pageid,type:video?'video':'photo',provider:'commons',mediaUrl,preview:info.thumburl,pageUrl:'https://commons.wikimedia.org/wiki/'+encodeURIComponent(title).replace(/%3A/g,':'),creator:value('Artist')||value('Credit')||'Wikimedia Commons',license,licenseUrl:licenseUrl||'https://commons.wikimedia.org/wiki/Help:Public_domain',licenseAutomatic:true,attributionRequired:attributed,geographyMatched:true,location:context.city||context.country,capturedAt:capturedAt||'',description:strip(evidence).slice(0,700)};
}
export async function searchCommons(context,fetcher=fetch){
 if(!context||typeof context.country!=='string'||context.country.length>80||typeof context.query!=='string'||context.query.length>250||!Array.isArray(context.aliases)||context.aliases.length>10||context.aliases.some(x=>typeof x!=='string'||x.length>80))throw Error('invalid_editorial_context');
 const u=new URL('https://commons.wikimedia.org/w/api.php');u.search=new URLSearchParams({action:'query',format:'json',generator:'search',gsrnamespace:'6',gsrsearch:context.query,gsrlimit:'50',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'960',iiurlheight:'720',iiextmetadatalanguage:'en'}).toString();
 const r=await fetcher(u.href,{headers:{'User-Agent':'AlnuqtaStudio/1.0 (https://alnuqtamedia.com/contact.html)'},redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('commons_search_unavailable');const data=await r.json();if(data.error)throw Error('commons_search_unavailable');
 return {items:Object.values(data.query?.pages||{}).map(p=>commonsCandidate(p,context)).filter(Boolean).slice(0,6),provider:'commons',note:'أرشيف حسب وصف الملف، لا يثبت الحدث أو الحالة الاقتصادية للأشخاص. اختيار تلقائي: ملكية عامة وCC0 وCC BY مع إرفاق الإسناد المطلوب. التراخيص الأخرى تحتاج مراجعة منفصلة.'};
}
