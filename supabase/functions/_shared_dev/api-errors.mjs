// Structured errors shared by isolated dev functions only.
export function apiError(status,value={},retryHeader=''){
 const message=String(value.error||'تعذر إكمال الطلب.');let code=value.code;
 const details=JSON.stringify(value.attempts||[]);
 if(!['temporary_overload','rate_limited','studio_rate_limit','quota_exhausted','network','invalid_request','upstream_timeout'].includes(code)){
  if(code==='rate_limit_exceeded'||message==='rate_limit_exceeded')code='studio_rate_limit';
  else if(/limit\s*:\s*0\b|daily|per[ _-]?day/i.test(message)||value.attempts?.some(x=>x.zeroQuota))code='quota_exhausted';
  else if(status===429||code==='free_tts_quota')code='rate_limited';
  else if(status===504)code='upstream_timeout';
  else code=status>=500?'temporary_overload':'invalid_request';
 }
 const delayMatch=message.match(/retry (?:in|after)\s+([\d.]+)s/i);
 const delays=(value.attempts||[]).map(x=>parseFloat(x.retryDelay)||0);
 const retryAfterSeconds=Math.max(Number(value.retryAfterSeconds)||0,Number(retryHeader)||0,...delays,Number(delayMatch?.[1])||0);
 return {...value,code,retryable:['temporary_overload','rate_limited','network','upstream_timeout'].includes(code),retryAfterSeconds,upstreamAttempts:Number(value.upstreamAttempts)||value.attempts?.length||0};
}
