import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
const root={};const c=vm.createContext({window:root,Image:class{}});vm.runInContext(fs.readFileSync('public/newsroom.js','utf8'),c);const n=root.StudioNewsroom;
assert.equal(n.tickerOffset(0,600,1080),-600);assert.equal(n.tickerOffset(1,600,1080),-515);assert.equal(n.tickerOffset(1800/85,600,1080),-600);
assert.throws(()=>n.validateCaptions([{start:0,end:4,text:'أ'},{start:3,end:5,text:'ب'}],6));assert.throws(()=>n.validateCaptions([{start:0,end:7,text:'أ'}],6));assert.equal(n.validateCaptions([{start:0,end:3,text:'خبر'}],6).length,1);
const marks=[],ctx=new Proxy({measureText:t=>({width:t.length*12}),fillText:t=>marks.push(t)},{get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>(t[k]=v,true)});
const s={title:'عنوان',newsroom:{version:1,breaking:false,ticker:['خبر أول','خبر ثان'],captions:[{start:1,end:2,text:'النص المنطوق'}]}};
n.draw(ctx,s,{element:{width:1280,height:720}},1280,720,1.4);assert(!marks.includes('عاجل'));assert(marks.includes('النص المنطوق'));assert(marks.some(t=>t.includes('خبر أول')&&t.includes('خبر ثان')));marks.length=0;s.newsroom.breaking=true;n.draw(ctx,s,{element:{width:1280,height:720}},1280,720,3);assert(marks.includes('عاجل'));assert(!marks.includes('النص المنطوق'));
console.log('PASS newsroom: ticker motion, multiple headlines, explicit breaking flag, subtitle intervals and invalid caption rejection.');
