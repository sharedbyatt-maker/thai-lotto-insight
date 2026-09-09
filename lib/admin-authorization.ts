export type AdminIdentity={email:string}|null;
export type AdminEnvironment={ADMIN_EMAIL?:string;SYNC_TOKEN?:string};
export function isAdminAuthorized(request:Request,user:AdminIdentity,environment:AdminEnvironment){const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(environment.SYNC_TOKEN&&token===environment.SYNC_TOKEN)return true;return !!user&&!!environment.ADMIN_EMAIL&&user.email.toLowerCase()===environment.ADMIN_EMAIL.toLowerCase()}
