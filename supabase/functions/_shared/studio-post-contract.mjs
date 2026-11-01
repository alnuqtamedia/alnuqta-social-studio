export const POST_BUCKET='studio-automation-output';
export const RUNNER_AUDIENCE='alnuqta-studio-post-renderer';
export const MAX_JPEG_BYTES=4*1024*1024;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedHosts=new Set(['images.pexels.com','upload.wikimedia.org','thumb.wikimedia.org','zsqvmuqlmtnhndwuqlfy.supabase.co']);
const text=(value,name,max,required=false)=>{if(typeof value!=='string'||value.length>max||required&&!value.trim())throw Error('invalid_'+name);return value.trim();};
export function validateDesign(input){
 if(!input||typeof input!=='object'||!uuid.test(input.jobId||''))throw Error('invalid_job_id');
 const imageUrl=text(input.imageUrl,'image_url',1800,true),url=new URL(imageUrl);
 if(url.protocol!=='https:'||!allowedHosts.has(url.hostname)||url.port||url.username||url.password||url.hash)throw Error('image_host_not_allowed');
 if(url.hostname.endsWith('supabase.co')&&!url.pathname.startsWith('/storage/v1/object/public/'))throw Error('image_path_not_allowed');
 const badge=input.badge||'بلا شارة';if(!['خبر','تقرير','عاجل','تحقيق','بلا شارة'].includes(badge))throw Error('invalid_badge');
 if(input.format!==undefined&&input.format!=='feed')throw Error('unsupported_format');
 return {jobId:input.jobId.toLowerCase(),headline:text(input.headline,'headline',180,true),summary:text(input.summary||'','summary',320),caption:text(input.caption||'','caption',2200),imageUrl,badge,format:'feed'};
}
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function designHash(design){return sha256(new TextEncoder().encode(JSON.stringify(validateDesign(design))));}
export function jpegDimensions(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<12||bytes.length>MAX_JPEG_BYTES||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)throw Error('invalid_jpeg');
 for(let i=2;i+4<bytes.length;){if(bytes[i++]!==255)throw Error('invalid_jpeg_marker');while(bytes[i]===255)i++;const marker=bytes[i++];if(marker===0xda||marker===0xd9)break;if(marker>=0xd0&&marker<=0xd7||marker===1)continue;const length=(bytes[i]<<8)|bytes[i+1];if(length<2||i+length>bytes.length)throw Error('invalid_jpeg_segment');if([0xc0,0xc1,0xc2].includes(marker)){if(length<8)throw Error('invalid_jpeg_frame');const height=(bytes[i+3]<<8)|bytes[i+4],width=(bytes[i+5]<<8)|bytes[i+6];if(width!==1080||height!==1350)throw Error('invalid_post_dimensions');return {width,height};}i+=length;}
 throw Error('jpeg_dimensions_missing');
}
export function validateRunnerClaims(p){
 if(p.repository!=='alnuqtamedia/alnuqta-social-studio'||p.repository_id!=='1370831890'||p.repository_owner_id!=='328246617'||p.ref!=='refs/heads/main'||p.workflow_ref!=='alnuqtamedia/alnuqta-social-studio/.github/workflows/render-social-post.yml@refs/heads/main'||!['push','workflow_dispatch'].includes(p.event_name)||!/^\d{1,20}$/.test(String(p.run_id||'')))throw Error('runner_not_allowed');return {runId:String(p.run_id)};
}
