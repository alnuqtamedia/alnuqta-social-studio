/* A reference identifies a source asset, never an inferred person or location. */
(function(root){
'use strict';
const tablet='https://commons.wikimedia.org/wiki/File:Complaint_tablet_to_Ea-Nasir,_2023_(transparent).png';
// Recover a planner's portrait label only for an unambiguously anonymous activity query.
// Unknown names/places stay protected; this is not an identity approval.
function genericPortrait(s){
 if(s.visualType!=='portrait'||s.referenceUrl||s.namedSubject||s.subjectName||s.creative?.kind==='document-focus')return false;
 const q=String(s.visualQuery||'').toLowerCase().trim();
 const words=q.replace(/[-,]/g,' ').split(/\s+/);
 const vocabulary=new Set('a an the of with on in at and person man woman young adult anonymous hands hand using holding checking looking closing locking unlocking smartphone phone mobile screen indoors indoor home desk sitting standing close up portrait medium shot casual clothes'.split(' '));
 return words.length>=3&&words.every(w=>vocabulary.has(w))&&/\b(?:person|man|woman|hands|hand)\b/.test(q)&&/\b(?:using|holding|checking|closing|locking|unlocking)\b/.test(q)&&/\b(?:phone|smartphone|mobile)\b/.test(q);
}
function normalizeIntent(s){
 if(genericPortrait(s)){
  s.visualType='illustrative';
  if(!s.requestedVisualType||s.requestedVisualType==='portrait')s.requestedVisualType='illustrative';
  s.intentNormalization={from:'portrait',to:'illustrative',reason:'anonymous-person-activity'};
 }
 return s;
}
function identityRequired(s){return (['document','portrait','real','archive'].includes(s.visualType)&&!genericPortrait(s))||s.creative?.kind==='document-focus'||/اللوح الطيني الحقيقي|الوثيقة الأصلية|الوثيقة الاصلية|\b(?:actual|original) (?:tablet|document|artifact|portrait)\b/i.test([s.title,s.visualQuery].join(' '));}
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
root.StudioEditorialAssets={genericPortrait,normalizeIntent,identityRequired,referenceUrl,discoverReferences,bound,canReframe,attributions};
})(typeof window==='undefined'?globalThis:window);
