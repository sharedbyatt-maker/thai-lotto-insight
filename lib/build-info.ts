export const APP_RELEASE="Phase 1.1";
function safe(value:string|undefined,pattern:RegExp,fallback="unknown"){const trimmed=value?.trim()??"";return pattern.test(trimmed)?trimmed:fallback}
export function publicBuildInfo(environment:Record<string,string|undefined>=process.env){const commitSha=safe(environment.APP_BUILD_SHA,/^[0-9a-f]{7,40}$/i);return{release:APP_RELEASE,commitSha,shortSha:commitSha==="unknown"?commitSha:commitSha.slice(0,8),deploymentVersion:safe(environment.APP_DEPLOYMENT_VERSION,/^[0-9A-Za-z._-]{1,32}$/)}}
