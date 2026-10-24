import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('public/media-library.js','utf8'),ctx);const L=ctx.StudioMediaLibrary;
const scene={title:'دواء مستشفى',visualQuery:'hospital pharmacy',editorialGeography:{countries:[{country:'IQ'}]}},records=[{id:'iq-video',country:'IQ',kind:'video',tags:'hospital مستشفى',name:'Ward',savedAt:1},{id:'eg-video',country:'EG',kind:'video',tags:'hospital مستشفى',name:'Ward',savedAt:2},{id:'iq-photo',country:'IQ',kind:'image',tags:'pharmacy',savedAt:2},{id:'irrelevant',country:'IQ',kind:'video',tags:'cars',savedAt:3}];
assert.deepEqual(Array.from(L.ranked(records,scene,['video']),r=>r.id),['iq-video']);
assert.equal(L.ranked(records,scene,['video'],new Set(['iq-video'])).length,0);
assert.deepEqual(Array.from(L.ranked(records,scene,['image']),r=>r.id),['iq-photo']);
assert.equal(L.ranked(records,{...scene,excludedMedia:['iq-video']},['video']).length,0);
assert.equal(L.ranked(records,{...scene,title:'مدرسة',visualQuery:'school'},['video']).length,0);
console.log('Library matching: required country, topic, kind, exclusions and duplicate prevention.');
