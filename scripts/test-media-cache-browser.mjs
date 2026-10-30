import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {chromium} from 'playwright';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jqasAAAAASUVORK5CYII=','base64');
let downloads=0;
const server=http.createServer(async(req,res)=>{if(req.url==='/source.png'){downloads++;res.setHeader('Content-Type','image/png');return res.end(png);}if(req.url==='/media-library.js'||req.url==='/editorial-geography.js'){res.setHeader('Content-Type','text/javascript');return res.end(await fs.readFile('public'+req.url));}res.setHeader('Content-Type','text/html');res.end('<script src="/editorial-geography.js"></script><script src="/media-library.js"></script>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.goto(origin);
 const result=await page.evaluate(async origin=>{const item={url:origin+'/source.png',preview:'',kind:'image',credit:'Fixture',sourceUrl:'https://example.org/source',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',providerId:'1:photo',illustrative:true,editorialReview:{intent:'illustrative',score:.9,scope:'poster-only'}};const record=await StudioMediaLibrary.cacheReviewed(item,{query:'hands working'});const m=StudioMediaLibrary.materialize(record);return {country:record.country,evidence:m.locationEvidence,cached:m.autoCached,size:record.blob.size,review:m.editorialReview};},origin);
 assert.equal(result.country,'');assert.equal(result.evidence,undefined);assert(result.cached);assert.equal(result.size,png.length);
 await page.reload();const found=await page.evaluate(async()=>{const scene={title:'عمل',visualQuery:'hands working',visualType:'illustrative',editorialGeography:{countries:[{country:'IQ'}]}};const items=await StudioMediaLibrary.find(scene,['image'],new Set());const blocked=await StudioMediaLibrary.find({...scene,visualType:'document'},['image'],new Set());const excluded=await StudioMediaLibrary.find({...scene,excludedMedia:['1:photo']},['image'],new Set());return {count:items.length,blocked:blocked.length,excluded:excluded.length,url:items[0]?.url,evidence:items[0]?.locationEvidence};});
 assert.equal(found.count,1);assert.equal(found.blocked,0);assert.equal(found.excluded,0);assert(found.url.startsWith('blob:'));assert.equal(found.evidence,undefined);assert.equal(downloads,1);
 console.log('PASS: reviewed media downloaded once, persisted in real IndexedDB, reused after reload, never promoted to country/event evidence.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
