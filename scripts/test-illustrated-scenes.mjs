import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const c=vm.createContext({});for(const file of ['editorial-geography','illustrated-scenes'])vm.runInContext(fs.readFileSync('public/'+file+'.js','utf8'),c);
const G=c.StudioGeography,I=c.StudioIllustration;
const scenes=[{title:'السيارات',voiceover:'تزدحم الشوارع بالسيارات',visualType:'broll'}];G.apply(scenes,'تقرير عن العراق');
assert.equal(scenes[0].editorialGeography.countries[0].country,'IQ');assert.equal(G.query(scenes[0],'traffic'),'traffic');assert.match(G.query({...scenes[0],title:'مستشفى في العراق'},'hospital'),/^Iraq /);
for(const item of [{},{country:'IQ'},{verifiedGeo:{country:'IQ'}},{review:{safe:true,score:1,reason:'Baghdad'}},{locationEvidence:{country:'CN',reviewedByEditor:true,sourceUrl:'https://example.com'}}])assert.equal(G.check(scenes[0],item).allowed,false);
assert.equal(G.check(scenes[0],{locationEvidence:{country:'IQ',reviewedByEditor:true,sourceUrl:'https://example.com'}}).allowed,true);
assert.equal(G.check({},{}).allowed,true);assert.equal(G.context([{voiceover:'Cairo traffic'}]).countries[0].country,'EG');
assert(I.prepare(scenes[0]));assert.equal(scenes[0].illustration.preset,'traffic');
for(const s of [{visualType:'document',voiceover:'وثيقة'},{visualType:'portrait',voiceover:'اسم'},{creative:{kind:'quote'},voiceover:'نص'}])assert.equal(I.prepare(s),false);
for(const key of Object.keys(I.names)){const animation=I.data(key);assert.equal(animation.w,1000);assert(animation.layers.length>1);assert(animation.layers.some(l=>l.ks.p.a===1));assert.equal(animation.assets.length,0);}
assert.equal(I.select({voiceover:'ضعف المواصلات والحافلات'}),'transit');assert.equal(I.select({voiceover:'خط إنتاج في مصنع'}),'industry');
console.log('Geography rejects unverified/foreign location and model guesses; seven animated illustration presets without fabricated data.');
