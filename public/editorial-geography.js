/* Conservative geography gate: visual similarity and search terms are not location evidence. */
(function(root){
'use strict';
const places=[
 {country:'IQ',label:'العراق',search:'Iraq',pattern:/العراق|العراقي|بغداد|البصرة|الموصل|أربيل|اربيل|كربلاء|النجف|السليمانية|\b(?:iraq|iraqi|baghdad|basra|mosul|erbil)\b/i},
 {country:'CA',label:'كندا',search:'Canada',pattern:/كندا|الكندي|تورونتو|مونتريال|فانكوفر|أوتاوا|اوتاوا|\b(?:canada|canadian|toronto|montreal|vancouver|ottawa)\b/i},
 {country:'CN',label:'الصين',search:'China',pattern:/الصين|الصيني|بكين|شنغهاي|\b(?:china|chinese|beijing|shanghai)\b/i},
 {country:'US',label:'الولايات المتحدة',search:'United States',pattern:/الولايات المتحدة|أمريكا|امريكا|الأمريكي|الامريكي|\b(?:united states|american|usa)\b/i},
 {country:'GB',label:'بريطانيا',search:'United Kingdom',pattern:/بريطانيا|بريطاني|إنجلترا|انجلترا|لندن|\b(?:britain|british|united kingdom|england|london)\b/i},
 {country:'EG',label:'مصر',search:'Egypt',pattern:/مصر|المصري|القاهرة|الإسكندرية|الاسكندرية|\b(?:egypt|egyptian|cairo|alexandria)\b/i}
];
function detect(text){return places.filter(p=>p.pattern.test(String(text||''))).map(({country,label,search})=>({country,label,search}));}
function context(slides,source=''){const found=detect(source+' '+slides.map(s=>[s.title,s.subtitle,s.voiceover].join(' ')).join(' '));return {version:1,countries:found};}
function apply(slides,source=''){
 const policy=context(slides,source),sourceCountries=detect(source);
 for(const s of slides){
  // An explicit scene country overrides the report; comparisons must not leak countries.
  const own=detect([s.title,s.subtitle,s.voiceover].join(' '));
  s.editorialGeography={version:2,countries:own.length?own:sourceCountries.length===1?sourceCountries:policy.countries.length===1?policy.countries:!policy.countries.length?(s.editorialGeography?.countries||[]):[]};
 }
 return policy;
}
function cacheScope(slide){return (slide.editorialGeography?.countries||[]).map(c=>c.country).sort().join(',');}
function contextualQuery(slide,value){
 const countries=slide.editorialGeography?.countries||[];
 const setting=/\b(?:person|people|young|man|woman|worker|student|commuter|street|city|shop|market|office|trade|business|job|interview|applicant)\b|شاب|شباب|عامل|موظف|شارع|سوق|متجر|تجارة/i.test(value);
 return (requiresOriginal(slide)||setting)&&countries.length===1&&!detect(value).length?[countries[0].search,value].join(' '):value;
}
function requiresOriginal(slide){
 if(['document','portrait','real','archive','map'].includes(slide.visualType)||slide.creative?.kind==='document-focus')return true;
 const query=String(slide.visualQuery||''),title=String(slide.title||'');
 if(/\b(?:arrest|raid|protest|demonstration|(?:health|medical|government) (?:inspection team|inspectors)|minister|president|official ceremony|actual footage|real footage)\b|مداهمة|اعتقال|مظاهرة|فريق تفتيش|حملة تفتيش|لقطات أصلية|لقطات موثقة/i.test(query))return true;
 const venues=/\b(?:hospital|clinic|street|airport|market|square|city|port|bridge)\b|مستشفى|عيادة|شارع|مطار|سوق|ساحة|مدينة|ميناء|جسر/i;
 return Boolean((detect(query).length&&venues.test(query))||(!query.trim()&&detect(title).length&&venues.test(title)));
}
function query(slide,value){const countries=slide.editorialGeography?.countries||[];return contextualQuery(slide,value).slice(0,200);}
function check(slide,item){
 if(root.StudioEditorialAssets?.identityRequired(slide))return {allowed:Boolean(root.StudioEditorialAssets.bound(item)),reason:'exact-reference-required'};
 if(item?.reusedReference&&slide.editorialReframe?.referenceScene&&root.StudioEditorialAssets?.canReframe(slide)&&root.StudioEditorialAssets.bound(item))return {allowed:true,reason:'verified-reference-detail-not-location-footage'};
 if(item?.editorialReview?.intent==='specific'&&item?.locationEvidence?.reviewedByEditor!==true)return {allowed:false,reason:'specific-use-needs-source-evidence'};
 const countries=slide.editorialGeography?.countries||[];
 if(!countries.length)return {allowed:true,reason:'general-topic'};
 if(item?.autoCached&&(item.contextScope||'')!==cacheScope(slide))return {allowed:false,reason:'cached-context-mismatch'};
 const review=item?.editorialReview;
 if(!requiresOriginal(slide)&&item?.illustrative===true&&!item?.generated&&review?.intent==='illustrative'&&review?.scope==='poster-only'&&Number.isFinite(review?.score)&&review.score>=.7&&review.score<=1)return {allowed:true,reason:'reviewed-illustration-not-location-evidence'};
 // Only editor-confirmed evidence attached to a specific asset can establish its place.
 // Never trust model-created verifiedGeo fields or location guesses in a thumbnail verdict.
 const evidence=item?.locationEvidence;
 const known=evidence?.reviewedByEditor===true&&/^https:\/\//.test(evidence.sourceUrl||'')&&countries.some(x=>x.country===evidence.country);
 return {allowed:Boolean(known),reason:known?'editor-confirmed-location':'بلد اللقطة غير موثق؛ تحتاج مراجعة الموقع قبل الاستخدام'};
}
root.StudioGeography={detect,context,apply,query,check,requiresOriginal,cacheScope};
})(typeof window==='undefined'?globalThis:window);
