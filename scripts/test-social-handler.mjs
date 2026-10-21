import assert from 'node:assert/strict';
globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service'})[key]}};
const {handle}=await import('../supabase/functions/studio-social/index.ts');
const endpoint='https://test.supabase.co/functions/v1/studio-social';
const health=await handle(new Request(endpoint+'/health'));
assert.equal(health.status,200);
const status=await health.json();
assert.equal(status.oauthConfigured,false);
assert.equal(status.publishingAvailable,false);
assert.equal(status.callback,endpoint+'/youtube/callback');
for(const suffix of ['/youtube/callback','/youtube/callback?state=evil','/youtube/authorize?ticket=evil','/accounts']) {
 const response=await handle(new Request(endpoint+suffix));
 assert.equal(response.status,400);
 assert.equal(response.headers.get('Cache-Control'),'no-store');
}
assert.equal((await handle(new Request(endpoint+'/youtube/start',{method:'POST',headers:{Origin:'https://evil.example'}}))).status,403);
const preflight=await handle(new Request(endpoint+'/youtube/start',{method:'OPTIONS',headers:{Origin:'https://alnuqtamedia.github.io'}}));
assert.equal(preflight.status,204);
assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://alnuqtamedia.github.io');
assert.equal((await handle(new Request(endpoint+'/publish',{method:'POST'}))).status,404);
console.log('Social HTTP rejection and unconfigured-state checks passed.');
