import {RUNNER_AUDIENCE,validateRunnerClaims} from './studio-post-contract.mjs';
export function createGithubVerifier({jwtVerify,createRemoteJWKSet},{key}={}){
 const keys=key||createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'),{timeoutDuration:8000});
 return async token=>{if(typeof token!=='string'||token.length<30||token.length>12000)throw Error('invalid_runner_token');const {payload}=await jwtVerify(token,keys,{issuer:'https://token.actions.githubusercontent.com',audience:RUNNER_AUDIENCE,algorithms:['RS256'],requiredClaims:['exp','iat','repository_id','repository_owner_id','workflow_ref','ref','run_id'],maxTokenAge:'10m',clockTolerance:5});return validateRunnerClaims(payload);};
}
