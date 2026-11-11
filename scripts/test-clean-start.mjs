import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('index.html','utf8');
assert(!html.includes('lastBullet'));
assert(!html.includes('الرصاصة الأخيرة'));
const data=html.slice(html.indexOf('        const topics = {'),html.indexOf("        let activeTab ="));
const ctx=vm.createContext({});
vm.runInContext(data+';globalThis.initial=topics.customScript;',ctx);
assert.equal(ctx.initial.slides.length,0);
assert.match(html,/let activeTopic = 'customScript'/);
assert.match(html,/let activeTikTokTopic = 'customScript'/);
const target={style:{},innerHTML:'stale preview'},wrapper={};
Object.assign(ctx,{topics:{customScript:{slides:[]}},activeTopic:'customScript',activeTikTokTopic:'customScript',document:{getElementById:id=>id==='export-target'?target:wrapper}});
const render=html.slice(html.indexOf('        function renderCanvas()'),html.indexOf('        function renderCanvas()')+html.slice(html.indexOf('        function renderCanvas()')).indexOf('        function ',35));
vm.runInContext(render,ctx);
for(const tab of ['carousel','tiktok']){ctx.activeTab=tab;vm.runInContext('renderCanvas()',ctx);assert.match(target.innerHTML,/مشروع جديد/);assert(!target.innerHTML.includes('stale'));}
console.log('PASS fresh startup: zero scenes, no legacy demo, safe empty carousel and video previews.');
