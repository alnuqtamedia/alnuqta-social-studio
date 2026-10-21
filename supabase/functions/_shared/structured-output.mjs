import { extractText } from './gemini-output.mjs';

// Accept formatting wrappers, never manufacture missing fields, brackets or narration.
export function parseStructuredOutput(data){
 const fail=code=>{const error=new Error(code);error.code=code;throw error;};
 if(data?.status&&data.status!=='completed')fail(data.status==='incomplete'?'incomplete_output':'generation_not_completed');
 const clean={...data};
 if(Array.isArray(clean.outputs))clean.outputs=clean.outputs.filter(p=>!p?.type||['text','output_text'].includes(p.type));
 let text=extractText(clean).replace(/^\uFEFF/,'').trim();
 if(!text)fail('empty_output');
 const fence=text.match(/^(?:```(?:json)?\s*)([\s\S]*?)(?:\s*```)$/i);
 if(fence)text=fence[1].trim();
 let parsed;
 try{parsed=JSON.parse(text);}catch{
  // A single fenced JSON answer may have a prose introduction/outro.
  const blocks=[...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  if(blocks.length!==1)fail('invalid_json');
  const outside=text.replace(blocks[0][0],'');if(/[{}\[\]`]/.test(outside))fail('invalid_json');
  try{parsed=JSON.parse(blocks[0][1].trim());}catch{fail('invalid_json');}
 }
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))fail('invalid_json_object');
 return parsed;
}
