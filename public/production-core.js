(function(root){
'use strict';
const words=t=>String(t||'').trim().split(/\s+/).filter(Boolean).length;
const numbers=t=>(String(t||'').normalize('NFKC').replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c.charCodeAt(0)>1775?1776:1632))).replace(/٫/g,'.').replace(/٬/g,',').match(/\d+(?:[.,]\d+)*/g)||[]);
function groups(slides,target){
 if(!Number.isFinite(target)||target<5||target>600)throw Error('مدة الاختبار المدعومة من 5 إلى 600 ثانية؛ المدة ليست مقصورة على أزرار ثابتة.');
 const total=slides.reduce((n,s)=>n+Math.max(1,words(s.voiceover)),0),budget=Math.max(1,total/Math.max(1,Math.ceil(target/30)));
 const out=[];let g={indexes:[],text:'',weight:0};
 slides.forEach((s,i)=>{const text=String(s.voiceover||'').trim(),weight=Math.max(1,words(text));if(g.indexes.length&&g.weight+weight>budget*1.35&&g.text){out.push(g);g={indexes:[],text:'',weight:0};}g.indexes.push(i);g.text+=(text?(g.text?'\n\n':'')+text:'');g.weight+=weight;});
 if(g.indexes.length)out.push(g);
 return out.map(g=>({...g,seconds:target*g.weight/total}));
}
function timing(slides,groups,durations,target,pause=.18){
 const spent=durations.reduce((a,b)=>a+b,0)+pause*Math.max(0,groups.length-1);
 if(spent>target+.02)throw Error(`التعليق ${spent.toFixed(1)} ثانية يتجاوز المطلوب ${target.toFixed(1)}؛ لا يُقطع الكلام ولا يُسرّع.`);
 let cursor=0;const out=new Array(slides.length).fill(0);
 groups.forEach((g,k)=>{const total=g.indexes.reduce((n,i)=>n+Math.max(1,words(slides[i].voiceover)),0);g.start=cursor;g.duration=durations[k];g.indexes.forEach(i=>out[i]=durations[k]*Math.max(1,words(slides[i].voiceover))/total);if(k<groups.length-1)out[g.indexes.at(-1)]+=pause;cursor+=durations[k]+(k<groups.length-1?pause:0);});
 out[out.length-1]+=Math.max(0,target-spent);return out;
}
function alignedDurations(segments,count,total){
 if(!Number.isFinite(total)||total<=0||!Array.isArray(segments)||segments.length!==count)throw Error('توقيت الفقرات غير مكتمل');
 const starts=segments.map((x,i)=>{if(x.scene!==i+1||!Number.isFinite(x.start)||x.start<0||x.start>=total||(i&&x.start<=segments[i-1].start))throw Error('ترتيب توقيت الفقرات غير صالح');return i?x.start:0;});
 const out=starts.map((t,i)=>(starts[i+1]??total)-t);if(out.some(d=>d<.25))throw Error('أحد المشاهد أقصر من الحد الآمن');return out;
}
function safePexels(item){
 try {const u=new URL(item.mediaUrl),p=new URL(item.pageUrl);return u.protocol==='https:'&&['images.pexels.com','videos.pexels.com'].includes(u.hostname)&&p.protocol==='https:'&&(p.hostname==='www.pexels.com'||p.hostname==='pexels.com')&&Boolean(item.creator);}catch{return false;}
}
function choose(items,used,seconds){return items.filter(safePexels).filter(x=>!used.has(String(x.id)+':'+x.type)).map((x,i)=>({x,score:10-i+(x.type==='video'?4:0)+(Number(x.duration)>=seconds?2:0)})).sort((a,b)=>b.score-a.score)[0]?.x||null;}
function requestedDuration(command){const text=String(command||'').replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));let seconds=null;const match=text.match(/(\d+(?:\.\d+)?)\s*(ثانية|ثواني|ثوان|seconds?\b|دقيقة|دقائق|minutes?\b)/i);if(match)seconds=Number(match[1])*(/دقيق|minute/i.test(match[2])?60:1);else if(/دقيقتين|دقيقتان/.test(text))seconds=120;else if(/دقيقة\s*ونصف/.test(text))seconds=90;else if(/دقيقة/.test(text))seconds=60;const clock=text.match(/(?:مدة|بطول)\s*(\d+):(\d{1,2})/);if(clock&&Number(clock[2])<60)seconds=Number(clock[1])*60+Number(clock[2]);if(seconds!==null&&(seconds<5||seconds>600))throw Error('المدة المدعومة من 5 إلى 600 ثانية.');return seconds;}
function output(command){return /تلفزيون|يوتيوب|youtube|أفقي|افقي|16\s*:\s*9/i.test(command)?'landscape':'portrait';}
const countries=[['Iraq','العراق','عراقي','iraqi'],['Egypt','مصر','مصري','egyptian'],['Syria','سوريا','سورية','سوري'],['Jordan','الأردن','الاردن','أردني'],['Lebanon','لبنان','لبناني'],['Palestine','فلسطين','فلسطيني'],['Saudi Arabia','السعودية','سعودي'],['Kuwait','الكويت','كويتي'],['United Arab Emirates','الإمارات','الامارات','إماراتي'],['Qatar','قطر','قطري'],['Yemen','اليمن','يمني'],['Sudan','السودان','سوداني'],['Libya','ليبيا','ليبي'],['Tunisia','تونس','تونسي'],['Algeria','الجزائر','جزائري'],['Morocco','المغرب','مغربي'],['Canada','كندا','كندي'],['United States','أمريكا','امريكا','أميركا'],['France','فرنسا','فرنسي'],['Germany','ألمانيا','المانيا','ألماني'],['Turkey','تركيا','تركي'],['Iran','إيران','ايران','إيراني'],['Japan','اليابان','ياباني'],['China','الصين','صيني'],['India','الهند','هندي'],['Pakistan','باكستان','باكستاني'],['Afghanistan','أفغانستان','افغانستان'],['Russia','روسيا','روسي'],['Ukraine','أوكرانيا','اوكرانيا'],['United Kingdom','بريطانيا','بريطاني'],['Australia','أستراليا','استراليا'],['Brazil','البرازيل','برازيلي'],['Italy','إيطاليا','ايطاليا'],['Spain','إسبانيا','اسبانيا'],['South Korea','كوريا الجنوبية'],['Sweden','السويد','سويدي'],['Netherlands','هولندا','هولندي']];
function geography(text){text=String(text||'').toLowerCase();return countries.map(c=>({country:c[0],aliases:c,score:c.reduce((n,w)=>n+(text.match(new RegExp(w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length,0)})).filter(c=>c.score).sort((a,b)=>b.score-a.score)[0]||null;}
function sceneGeography(slide,context){const text=[slide.title,slide.subtitle,slide.voiceover].join(' '),geo=slide.editorialGeography||context;if(!geo)return null;let subject='street',entity='';
 if(/خريط|خارط|\bmap\b/i.test(text+' '+slide.visualType))subject='map';else if(/سوق|أسواق|اسواق|تسوق|market|shopping/i.test(text))subject='market';else if(/عمل|عمال|employment|worker/i.test(text))subject='workers';else if(/مدرس|تعليم|school|education/i.test(text))subject='school';
 const cities=geo.country==='Iraq'?[['Baghdad','بغداد'],['Basra','البصرة'],['Mosul','الموصل'],['Erbil','أربيل','اربيل'],['Najaf','النجف'],['Karbala','كربلاء'],['Nasiriyah','الناصرية'],['Samawah','السماوة'],['Duhok','دهوك']]:geo.country==='Egypt'?[['Cairo','القاهرة'],['Alexandria','الإسكندرية','الاسكندرية']]:[];
 const city=cities.find(c=>c.some(w=>text.toLowerCase().includes(w.toLowerCase())));
 const ministries=[['Ministry of Planning','وزارة التخطيط'],['Ministry of Finance','وزارة المالية'],['Ministry of Education','وزارة التربية'],['Ministry of Health','وزارة الصحة']];
 const named=ministries.find(c=>c.some(w=>text.toLowerCase().includes(w.toLowerCase())));if(named){entity=named[0];subject=named[0];}
 if(slide.visualType==='portrait'||slide.visualType==='document'){entity=String(slide.visualQuery||slide.title||'').slice(0,160);subject=entity;}
 return {...geo,city:city?.[0]||'',cityAliases:city||[],entity,entityAliases:named||[entity].filter(Boolean),subject,query:[geo.country,city?.[0],subject].filter(Boolean).join(' ')};
}
function safeEditorialMedia(item){if(item?.provider!=='commons')return safePexels(item);try{const u=new URL(item.mediaUrl),p=new URL(item.pageUrl);return u.protocol==='https:'&&['upload.wikimedia.org','thumb.wikimedia.org'].includes(u.hostname)&&u.pathname.startsWith('/wikipedia/commons/')&&p.protocol==='https:'&&p.hostname==='commons.wikimedia.org'&&p.pathname.startsWith('/wiki/File:')&&item.geographyMatched===true&&item.licenseAutomatic===true&&Boolean(item.creator);}catch{return false;}}
root.StudioProductionCore={words,numbers,groups,timing,alignedDurations,safePexels,safeEditorialMedia,geography,sceneGeography,choose,output,requestedDuration};
})(typeof window==='undefined'?globalThis:window);
