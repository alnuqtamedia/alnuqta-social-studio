/* A reference identifies a source asset, never an inferred person or location. */
(function(root){
'use strict';
const tablet='https://commons.wikimedia.org/wiki/File:Complaint_tablet_to_Ea-Nasir,_2023_(transparent).png';
function identityRequired(s){return ['specific_person','specific_place','specific_event','document'].includes(s.evidenceKind)||['document','portrait','real','archive'].includes(s.visualType)||s.creative?.kind==='document-focus'||/اللوح الطيني الحقيقي|الوثيقة الأصلية|الوثيقة الاصلية|\b(?:actual|original) (?:tablet|document|artifact|portrait)\b/i.test([s.title,s.visualQuery].join(' '));}
function referenceUrl(s,context=''){
 const raw=String(s.referenceUrl||'')+' '+context;
 const urls=raw.match(/https:\/\/commons\.wikimedia\.org\/wiki\/File:[^\s<>"\]]+/g)||[];
 if(urls.length===1)return urls[0].replace(/[؛،]+$/,'');
 if(urls.length>1)return '';
 if(/Ea[- ]?Nasir|إيا\s*نا[صس]ر|ايا\s*نا[صس]ر|ناني[\s\S]{0,100}(?:نحاس|لوح)/i.test(context))return tablet;
 return '';
}
// Discovery only nominates source files. The identity reviewer still has to approve them.
async function discoverReferences(query,search){
 const found=await search({provider:'commons',type:'photo',orientation:'any',query});
 const urls=[...new Set((found.items||[]).map(x=>x.pageUrl).filter(value=>{
  try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='commons.wikimedia.org'&&!u.search&&!u.hash&&!u.username&&!u.password&&u.pathname.startsWith('/wiki/File:')&&/\.(?:jpe?g|png|webp)$/i.test(decodeURIComponent(u.pathname));}catch{return false;}
 }))].slice(0,3);
 const resolved=await Promise.allSettled(urls.map(referenceUrl=>search({provider:'commons-reference',type:'photo',orientation:'any',query,referenceUrl})));
 return resolved.flatMap(r=>r.status==='fulfilled'?(r.value.items||[]):[]).filter(item=>item.referenceEvidence?.kind==='commons-file').slice(0,3);
}
function bound(item){try{const u=new URL(item?.referenceEvidence?.referenceUrl||'');return item.referenceEvidence.kind==='commons-file'&&u.protocol==='https:'&&u.hostname==='commons.wikimedia.org'&&u.pathname.startsWith('/wiki/File:')&&item.editorialReview?.intent==='specific'&&item.editorialReview?.identityMatch===true&&item.editorialReview?.score>=.7;}catch{return false;}}
function canReframe(s){return s.visualType==='illustrative'&&!identityRequired(s)&&!s.explicitGraphics&&!/لقطات أصلية|لقطات موثقة|actual footage|real footage|arrest|raid|protest|demonstration|مداهمة|اعتقال|مظاهرة/i.test(s.visualQuery||'');}
function attributions(slides,getMedia){return [...new Set(slides.flatMap((s,i)=>getMedia(s).filter(m=>m.requiresAttribution).map(m=>`${m.credit}\n${m.sourceUrl}\n${m.licenseUrl}\nأُضيفت معالجة عرض وحركة داخل تقرير النقطة ميديا.`)))].join('\n\n');}
root.StudioEditorialAssets={identityRequired,referenceUrl,discoverReferences,bound,canReframe,attributions};
})(typeof window==='undefined'?globalThis:window);
