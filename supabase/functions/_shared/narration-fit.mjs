export function acceptsNarrationFit(result,body){
 const slides=result?.slides,old=body?.currentContent?.slides,budget=Number(body?.wordBudget);
 if(!Array.isArray(slides)||!Array.isArray(old)||slides.length!==old.length||!Number.isFinite(budget)||budget<1)return false;
 const words=t=>String(t||'').trim().split(/\s+/).filter(Boolean).length;
 if(slides.some(s=>!String(s.voiceover||'').trim()))return false;
 const before=old.reduce((n,s)=>n+words(s.voiceover),0),after=slides.reduce((n,s)=>n+words(s.voiceover),0);
 return budget>before ? after>before&&after>=Math.floor(budget*.85)&&after<=Math.ceil(budget*1.2) : after<before&&after<=Math.ceil(budget*1.1)&&after>=Math.floor(budget*.7);
}
