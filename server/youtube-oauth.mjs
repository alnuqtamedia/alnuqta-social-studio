// Server-only Google adapter. HTTP handlers, durable store and upload pipeline
// are separate prerequisites. No credentials or OAuth codes may be logged.
export const YOUTUBE_SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];
export function createYouTubeOAuth({clientId, clientSecret, redirectUri, fetchImpl = fetch, now = Date.now}) {
  if (!clientId || !clientSecret) throw new Error('Google OAuth credentials are missing');
  const callback = new URL(redirectUri);
  if (callback.protocol !== 'https:' || callback.hash || callback.username || callback.password) throw new Error('Invalid Google callback');
  async function request(url, options) {
    const response = await fetchImpl(url, {...options, signal:AbortSignal.timeout(20_000), redirect:'error'});
    if (!response.ok) throw new Error(`Google request failed (${response.status})`);
    return response.json();
  }
  function tokens(data, previous) {
    if (typeof data.access_token !== 'string' || !data.access_token || data.token_type?.toLowerCase() !== 'bearer' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new Error('Invalid Google token response');
    const scopes = typeof data.scope === 'string' ? data.scope.split(/\s+/).filter(Boolean) : previous?.scopes;
    if (!scopes || YOUTUBE_SCOPES.some(scope => !scopes.includes(scope))) throw new Error('Required YouTube permissions were not granted');
    return {accessToken:data.access_token, refreshToken:data.refresh_token || previous?.refreshToken, expiresAt:now()+data.expires_in*1000, scopes};
  }
  async function grant(parameters, previous) {
    return tokens(await request('https://oauth2.googleapis.com/token', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({client_id:clientId, client_secret:clientSecret, ...parameters})}), previous);
  }
  return {
    clientId, redirectUri:callback.href, scopes:YOUTUBE_SCOPES, requiredScopes:YOUTUBE_SCOPES, pkce:true,
    authorizationUrl:'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&prompt=consent&include_granted_scopes=true',
    async exchange({code, redirectUri:actual, verifier}) {
      if (actual !== callback.href || !code || !verifier) throw new Error('Invalid Google exchange context');
      const result = await grant({grant_type:'authorization_code', code, redirect_uri:actual, code_verifier:verifier});
      if (!result.refreshToken) throw new Error('Offline authorization was not granted');
      return result;
    },
    async identify(credentials) {
      const data = await request('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {headers:{Authorization:`Bearer ${credentials.accessToken}`}});
      if (!Array.isArray(data.items) || data.items.length !== 1 || !data.items[0].id) throw new Error('A single YouTube channel must be selected');
      return {id:data.items[0].id, name:data.items[0].snippet?.title || '', scopes:credentials.scopes};
    },
    async refresh(previous) {
      if (!previous.refreshToken) throw new Error('YouTube reconnection is required');
      return grant({grant_type:'refresh_token', refresh_token:previous.refreshToken}, previous);
    },
    async revoke(credentials) {
      const token = credentials.refreshToken || credentials.accessToken;
      if (!token) throw new Error('Missing Google grant');
      const response = await fetchImpl('https://oauth2.googleapis.com/revoke', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({token}), signal:AbortSignal.timeout(20_000), redirect:'error'});
      if (!response.ok) throw new Error(`Google revocation failed (${response.status})`);
    },
    async publish() { throw new Error('YouTube upload pipeline is not configured'); }
  };
}
