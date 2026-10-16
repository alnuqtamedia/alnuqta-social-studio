import assert from 'node:assert/strict';
import {thumbnailUrl,validateReviews,validateVerdicts,reviewInputs} from '../supabase/functions/_shared/media-review.mjs';
assert(thumbnailUrl('https://images.pexels.com/photos/12/a.jpeg').includes('w=320'));
for(const u of ['http://images.pexels.com/photos/12/a.jpg','https://images.pexels.com.evil.com/photos/12/a.jpg','https://user@images.pexels.com/photos/12/a.jpg','https://127.0.0.1/a.jpg','https://images.pexels.com:4430/photos/12/a.jpg','https://images.pexels.com/foo'])assert.throws(()=>thumbnailUrl(u));
const rows=[{scene:1,text:'مراجعة مستند',query:'document',candidates:[{id:'12:photo',preview:'https://images.pexels.com/photos/12/a.jpeg'}]}];validateReviews(rows);assert.throws(()=>validateReviews([...rows,...rows]));
const verdict={reviews:[{scene:1,candidates:[{id:'12:photo',safe:true,score:.8,reason:'مستند عام'}]}]};validateVerdicts(verdict,rows);assert.equal(validateVerdicts({reviews:[{scene:1,candidates:[{id:'99:photo',safe:true,score:1,reason:'invented'}]}]},rows).reviews[0].candidates[0].safe,false);
const input=await reviewInputs(rows,async(url,options)=>{assert.equal(options.redirect,'error');return new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/jpeg'}});});assert.equal(input.at(-1).type,'image');assert.equal(input.at(-1).data,'AQID');
await assert.rejects(reviewInputs(rows,async()=>new Response(new Uint8Array(250001),{headers:{'content-type':'image/jpeg'}})),/large/);
console.log('Thumbnail review: provider-only URLs, capped bytes, image input and candidate identity checked.');

// Isolated dev review must survive one failed thumbnail without approving it.
const devReview=await import('../supabase/functions/_shared_dev/media-review.mjs');
const unavailable=[];let fetched=0;
const devRows=[{scene:1,text:'خبر',query:'market',candidates:[{id:'1:photo',preview:'https://images.pexels.com/photos/1/a.jpg'},{id:'2:photo',preview:'https://images.pexels.com/photos/2/b.jpg'}]}];
const parts=await devReview.reviewInputs(devRows,async()=>{fetched++;return fetched===1?new Response('',{status:404}):new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/jpeg'}});},unavailable);
assert.equal(unavailable[0],'1:photo');assert(parts.some(x=>x.type==='image'));assert(parts.some(x=>x.text?.includes('thumbnail_unavailable')));console.log('Dev thumbnail regression: one unavailable image preserves remaining review input.');
