/* Conservative geography gate: visual similarity and search terms are not location evidence. */
(function(root){
'use strict';
const places=[
 {country:'IQ',label:'العراق',search:'Iraq',pattern:/العراق|العراقي|بغداد|البصرة|الموصل|أربيل|اربيل|كربلاء|النجف|السليمانية|\b(?:iraq|iraqi|baghdad|basra|mosul|erbil)\b/i},
 {country:'EG',label:'مصر',search:'Egypt',pattern:/مصر|المصري|القاهرة|الإسكندرية|الاسكندرية|\b(?:egypt|egyptian|cairo|alexandria)\b/i}
];
function detect(text){return places.filter(p=>p.pattern.test(String(text||''))).map(({country,label,search})=>({country,label,search}));}
function context(slides,source=''){const found=detect(source+' '+slides.map(s=>[s.title,s.subtitle,s.voiceover].join(' ')).join(' '));return {version:1,countries:found};}
function apply(slides,source=''){const policy=context(slides,source);for(const s of slides)s.editorialGeography=policy;return policy;}
function query(slide,value){const countries=slide.editorialGeography?.countries||[];return [countries.map(x=>x.search).join(' '),value].filter(Boolean).join(' ').slice(0,200);}
function check(slide,item){
 const countries=slide.editorialGeography?.countries||[];
 if(!countries.length)return {allowed:true,reason:'general-topic'};
 // Only editor-confirmed evidence attached to a specific asset can establish its place.
 // Never trust model-created verifiedGeo fields or location guesses in a thumbnail verdict.
 const evidence=item?.locationEvidence;
 const known=evidence?.reviewedByEditor===true&&/^https:\/\//.test(evidence.sourceUrl||'')&&countries.some(x=>x.country===evidence.country);
 return {allowed:Boolean(known),reason:known?'editor-confirmed-location':'بلد اللقطة غير موثق؛ تحتاج مراجعة الموقع قبل الاستخدام'};
}
root.StudioGeography={detect,context,apply,query,check};
})(typeof window==='undefined'?globalThis:window);
