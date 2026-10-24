import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('        async function runGeminiStudioCommand() {'),end=html.indexOf("        document.addEventListener('keydown'",start),code=html.slice(start,end);assert(start>0&&end>start);
for(const cancelled of [false,true]){
 const parent=new AbortController();if(cancelled)parent.abort();let message='',applied=false,cleared=0,calls=0;
 const elements={ 'ai-command-input':{value:'تقرير تجريبي'},'ai-run-btn':{classList:{add(){},remove(){}}}};
 const ctx=vm.createContext({console:{error(){}},AbortController,setTimeout:fn=>{queueMicrotask(fn);return 1;},clearTimeout:()=>cleared++,setAIStatus:t=>message=t,document:{getElementById:id=>elements[id]},commandVideoDuration:()=>null,getCurrentStudioContent:()=>({sourceMaterial:'نص اصطناعي'}),STUDIO_EDITORIAL_RULES:'',STUDIO_SCHEMA_VERSION:'1.0',STUDIO_OUTPUT_SCHEMA:{},applyGeminiResult:()=>applied=true,window:{STUDIO_PREVIEW_PUBLIC:{anonKey:'synthetic'},StudioProduction:{state:{abort:parent}}},fetch:async(_url,options)=>{calls++;return new Promise((_resolve,reject)=>{const cancel=()=>reject(new Error('aborted'));if(options.signal.aborted)cancel();else options.signal.addEventListener('abort',cancel,{once:true});});}});
 vm.runInContext(code,ctx);await ctx.runGeminiStudioCommand();assert.match(message,cancelled?/أُلغي/:/90 ثانية/);assert.equal(applied,false);assert.equal(elements['ai-run-btn'].disabled,false);assert.equal(cleared,1);assert.equal(calls,1);
}
console.log('Storyboard request timeout and user cancellation preserve the previous project and release controls.');
