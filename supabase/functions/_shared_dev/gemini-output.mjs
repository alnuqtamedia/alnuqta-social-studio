export function extractText(data){
 if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text.trim();
 const outputs=(data?.outputs||[]).filter(p=>typeof p?.text==='string').map(p=>p.text).join('');
 if(outputs.trim())return outputs.trim();
 const steps=(data?.steps||[]).filter(s=>s?.type==='model_output');
 for(const step of steps.reverse()){const text=(step.content||[]).filter(p=>typeof p?.text==='string').map(p=>p.text).join('');if(text.trim())return text.trim();}
 if(typeof data?.output==='string')return data.output.trim();
 return typeof data?.text==='string'?data.text.trim():'';
}
