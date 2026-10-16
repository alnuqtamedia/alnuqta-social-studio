// Only models with a documented free tier. Never fall back to Pro.
export const FREE_TTS_MODELS = ['gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview'];
export async function requestFlashSpeech({key,text,voice,style,fetchImpl=fetch}) {
 const attempts=[],deadline=Date.now()+120000;
 const clean=value=>String(value||'').split(key).join('[redacted]').replace(/AIza[\w-]+/g,'[redacted]').slice(0,320);
 for(const model of FREE_TTS_MODELS){
  let response,data;const remaining=deadline-Date.now();if(remaining<1000)break;
  try {
   response=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:AbortSignal.timeout(Math.min(90000,remaining)),
    body:JSON.stringify({contents:[{parts:[{text:`اقرأ النص التالي كما هو دون إضافة معلومات. الأداء: ${style}. النص:\n${text}`}]}],generationConfig:{responseModalities:['AUDIO'],maxOutputTokens:8192,speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}})
   });
   data=await response.json();
  }catch(error){attempts.push({model,status:502,code:error?.name==='TimeoutError'||error?.name==='AbortError'?'provider_timeout':'provider_unavailable'});continue;}
  if(!response.ok){
   const message=String(data?.error?.message||'');
   const limited=response.status===429;
   const delay=(data?.error?.details||[]).find(x=>x?.retryDelay)?.retryDelay;
   attempts.push({model,status:response.status,code:limited?'quota_exceeded':'provider_error',...(message?{message:clean(message)}:{}),...(delay?{retryDelay:delay}:{}),zeroQuota:/limit:\s*0\b/i.test(message)});
   if([401,403].includes(response.status))break;
   continue;
  }
  const candidate=data?.candidates?.[0],finish=candidate?.finishReason;
  const part=candidate?.content?.parts?.find(x=>typeof x?.inlineData?.data==='string'&&x.inlineData.data.length>0);
  if(finish!=='STOP'||!part){attempts.push({model,status:422,code:finish!=='STOP'?'incomplete_audio':'missing_audio',finishReason:finish||'missing'});continue;}
  return {status:200,body:{audio:part.inlineData.data,mimeType:part.inlineData.mimeType||'audio/L16;rate=24000',voice,model}};
 }
 const limited=attempts.some(a=>a.code==='quota_exceeded');
 const error=limited?'حصة الصوت المجانية غير متاحة حالياً من Google. النص محفوظ؛ لم نستخدم Pro أو نفعّل فوترة. راجع الحصة قبل المحاولة التالية.':'لم تُرجع نماذج Flash صوتاً مكتملاً؛ النص محفوظ. لم يُعتمد صوت ناقص.';
 const diagnostic=attempts.filter(a=>!['quota_exceeded'].includes(a.code)).map(a=>`${a.model}: ${a.status} ${a.code}${a.message?' — '+a.message:''}`).join(' | ');
 return {status:limited?429:502,body:{error:limited?error:error+(diagnostic?' '+diagnostic:''),code:limited?'free_tts_quota':'free_tts_unavailable',attempts}};
}
