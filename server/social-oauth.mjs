import { Buffer } from 'node:buffer';
import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'node:crypto';

const digest = value => createHash('sha256').update(value).digest('base64url');
const required = value => { if (typeof value !== 'string' || !value.trim()) throw new Error('Missing authenticated context'); return value; };
const https = value => { const url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('HTTPS URL required'); return url; };

// Server-only. Adapters and URLs are trusted deployment configuration, never
// values supplied by a browser. store.takeState MUST consume atomically.
export function createSocialOAuth({store, adapters, key, now = Date.now}) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('A 32-byte encryption key is required');
  const adapterFor = provider => { const adapter = adapters[provider]; if (!adapter || !Object.hasOwn(adapters, provider)) throw new Error('Provider is not configured'); return adapter; };
  const seal = (tokens, context) => {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(context));
    const data = Buffer.concat([cipher.update(JSON.stringify(tokens), 'utf8'), cipher.final()]);
    return {version:1, iv:iv.toString('base64url'), tag:cipher.getAuthTag().toString('base64url'), data:data.toString('base64url')};
  };
  const unseal = (record, context) => {
    if (record.version !== 1) throw new Error('Unsupported credential format');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'base64url'));
    decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(Buffer.from(record.tag, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(record.data, 'base64url')), decipher.final()]).toString('utf8'));
  };
  const context = record => JSON.stringify([record.userId, record.provider, record.accountId]);
  return {
    async begin({userId, sessionId, provider}) {
      required(userId); required(sessionId);
      const adapter = adapterFor(provider), url = https(adapter.authorizationUrl);
      const redirectUri = https(adapter.redirectUri).href;
      required(adapter.clientId);
      const state = randomBytes(32).toString('base64url'), verifier = randomBytes(32).toString('base64url');
      await store.putState(digest(state), {userId, sessionHash:digest(sessionId), provider, verifier, redirectUri, expiresAt:now()+600_000});
      url.searchParams.set('client_id', adapter.clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('state', state);
      url.searchParams.set('scope', adapter.scopes.join(' '));
      if (adapter.pkce) { url.searchParams.set('code_challenge', digest(verifier)); url.searchParams.set('code_challenge_method', 'S256'); }
      return {authorizationUrl:url.href};
    },
    async complete({userId, sessionId, provider, state, code, denied = false}) {
      required(userId); required(sessionId); required(state);
      // Consume before exchanging the code. Replays, even concurrent, must fail.
      const pending = await store.takeState(digest(state));
      if (!pending || pending.expiresAt <= now() || pending.userId !== userId || pending.sessionHash !== digest(sessionId) || pending.provider !== provider) throw new Error('Invalid or expired authorization');
      if (denied) return {connected:false, reason:'declined'};
      required(code);
      const adapter = adapterFor(provider);
      const tokens = await adapter.exchange({code, redirectUri:pending.redirectUri, ...(adapter.pkce ? {verifier:pending.verifier} : {})});
      required(tokens.accessToken);
      const account = await adapter.identify(tokens);
      required(account.id);
      if (!Array.isArray(account.scopes) || adapter.requiredScopes.some(scope => !account.scopes.includes(scope))) throw new Error('Publishing permission was not granted');
      const record = {userId, provider, accountId:account.id, name:String(account.name || ''), scopes:account.scopes, connectedAt:now()};
      record.credentials = seal(tokens, context(record));
      await store.putConnection(record);
      return {connected:true, provider, accountId:record.accountId, name:record.name};
    },
    // Server-only: never return this method's result through an HTTP response.
    async authorizedConnection({userId, provider, accountId}) {
      required(userId); required(accountId);
      const adapter=adapterFor(provider), record=await store.getConnection(userId,provider,accountId);
      if(!record || record.userId!==userId || record.provider!==provider || record.accountId!==accountId) throw new Error('Account is not connected');
      if(adapter.requiredScopes.some(scope=>!record.scopes.includes(scope))) throw new Error('Publishing permission is missing');
      let tokens=unseal(record.credentials,context(record));
      if(!Number.isFinite(tokens.expiresAt) || tokens.expiresAt<=now()+60000) {
        if(!adapter.refresh) throw new Error('Account reconnection is required');
        tokens=await adapter.refresh(tokens);
        record.credentials=seal(tokens,context(record));
        await store.putConnection(record);
      }
      return {tokens,accountId:record.accountId};
    },
    async publish({userId, provider, accountId, requestId, content}) {
      required(userId); required(accountId); required(requestId);
      const adapter = adapterFor(provider), record = await store.getConnection(userId, provider, accountId);
      if (!record || record.userId !== userId || record.provider !== provider || record.accountId !== accountId) throw new Error('Account is not connected');
      if (adapter.requiredScopes.some(scope => !record.scopes.includes(scope))) throw new Error('Publishing permission is missing');
      const job = await store.claimPublication({userId, provider, accountId, requestId});
      if (!job.claimed) return job.result || {status:'pending'};
      try {
        const result = await adapter.publish({tokens:unseal(record.credentials, context(record)), accountId, content});
        if (result.status !== 'published' || typeof result.postId !== 'string' || !result.postId) throw new Error('Platform did not confirm publication');
        const confirmed = {status:'published', postId:result.postId, ...(result.url ? {url:https(result.url).href} : {})};
        await store.finishPublication(job.id, confirmed);
        return confirmed;
      } catch {
        // A network failure can happen AFTER the platform created the post.
        // Never blindly retry and create duplicates; reconcile with the platform.
        const uncertain = {status:'unknown', reason:'Platform confirmation required'};
        await store.finishPublication(job.id, uncertain);
        return uncertain;
      }
    }
  };
}
