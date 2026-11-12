import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
let calls=0;const state={audioCache:new Map()};
function buffer(n,sr=100){const samples=new Float32Array(n);return {sampleRate:sr,length:n,duration:n/sr,numberOfChannels:1,getChannelData:()=>samples};}
const ctx=vm.createContext({Blob,Uint8Array,Float32Array,ArrayBuffer,DataView,Math,atob,state,$:()=>({value:'Sulafat'}),narrationStyle:()=> 'formal',check(){},status(){},requestNarrationTts:async text=>{calls++;return {audio:btoa(text),mimeType:'audio/wav'};},AudioContext:class{sampleRate=100;async decodeAudioData(a){const b=buffer(a.byteLength);b.getChannelData(0).fill(.5);return b;}createBuffer(ch,n,sr){return buffer(n,sr);}async close(){}}});ctx.window=ctx;
vm.runInContext(fs.readFileSync('public/production-core.js','utf8'),ctx);ctx.C=ctx.StudioProductionCore;
const source=fs.readFileSync('public/studio-production.js','utf8');vm.runInContext(source.slice(source.indexOf('async function decodedTts('),source.indexOf('async function fitScript(')),ctx);
const text=Array.from({length:8},(_,i)=>new Array(40).fill('paragraph'+i).join(' ')).join('\n\n'),chunks=ctx.C.narrationChunks(text);
const result=await ctx.decodedTts(text);assert.equal(calls,chunks.length);assert(calls>1);
const expected=chunks.reduce((n,t)=>n+t.length,0)+16*(chunks.length-1);assert.equal(result.buffer.length,expected);assert.equal(result.blob.size,44+expected*2);
assert.equal(await ctx.decodedTts(text),result);assert.equal(calls,chunks.length);
console.log('PASS long narration: ordered bounded same-voice requests, exact sample assembly, full WAV and cached retries.');
