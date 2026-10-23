// Connection credentials stay in memory; never included in projects, URLs or backups.
(function(){
  let connection=null, revision=0;
  function endpoint(value){
    const u=new URL(value);
    const loopback=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
    if(u.username||u.password||u.search||u.hash||u.pathname!=='/'||
      !(u.protocol==='https:'||(loopback&&u.protocol==='http:')))throw Error('استخدم عنوان HTTPS للخدمة الخاصة، أو عنوان localhost المحلي، بدون مسار أو مفتاح في الرابط.');
    return u.origin;
  }
  async function json(url,token,path,body,signal){
    const r=await fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal,credentials:'omit',redirect:'error',cache:'no-store'});
    if(!r.ok)throw Error(r.status===401?'مفتاح خدمة صوتك غير صحيح.':r.status===429?'خدمة صوتك مشغولة؛ انتظر اكتمال الطلب السابق.':'تعذر الاتصال بخدمة صوتك؛ لم يُستبدل بصوت آخر.');
    return r.json();
  }
  function disconnect(){connection=null;revision++;const o=document.getElementById('private-owner-option');if(o)o.disabled=true;const select=document.getElementById('ai-tts-voice');if(select?.value==='private-owner')select.value='Charon';}
  window.StudioPrivateVoice={
    cacheKey:()=>String(revision),
    async connect(){
      const status=document.getElementById('private-voice-status');disconnect();
      try{
        const url=endpoint(document.getElementById('private-voice-url').value.trim());
        const input=document.getElementById('private-voice-token'),token=input.value.trim();input.value='';
        if(token.length<32)throw Error('أدخل مفتاح الخدمة الخاصة كاملاً.');
        status.textContent='جارٍ فحص الاتصال…';
        const result=await json(url,token,'/status',{},AbortSignal.timeout(15000));
        if(result.available!==true||result.voice!=='private-owner')throw Error('الخدمة لا تدعم صوتك الخاص.');
        connection={url,token};revision++;
        document.getElementById('private-owner-option').disabled=false;
        document.getElementById('ai-tts-voice').value='private-owner';
        status.textContent='متصل. سيُستخدم صوتك في التعليق؛ راجع النطق في المعاينة.';
      }catch(e){status.textContent=e.message;}
    },
    disconnect(){disconnect();document.getElementById('private-voice-status').textContent='غير متصل. إعداد الاتصال لا يُحفظ مع المشاريع.';},
    async speech(text,signal){
      if(!connection)throw Error('اربط خدمة صوتك الخاص أولاً؛ لم يُستبدل بصوت جاهز.');
      const {url,token}=connection;
      const d=await json(url,token,'/speech',{text},signal);
      if(d.voice!=='private-owner'||d.mimeType!=='audio/wav'||typeof d.audio!=='string'||!d.audio.length)throw Error('خدمة صوتك لم تُرجع تسجيلاً صالحاً.');
      return d;
    }
  };
})();
