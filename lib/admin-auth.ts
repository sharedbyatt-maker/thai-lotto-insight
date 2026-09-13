import {getChatGPTUser} from "../app/chatgpt-auth";
import {isAdminAuthorized} from "./admin-authorization";
import {sameOrigin} from "./request-security";
export {isAdminAuthorized} from "./admin-authorization";

export async function requireAdminApi(request:Request){const environment={ADMIN_EMAIL:process.env.ADMIN_EMAIL,SYNC_TOKEN:process.env.SYNC_TOKEN};if(isAdminAuthorized(request,null,environment))return true;if(!sameOrigin(request))return false;return isAdminAuthorized(request,await getChatGPTUser(),{ADMIN_EMAIL:environment.ADMIN_EMAIL})}
export const unauthorized=()=>Response.json({error:"Unauthorized"},{status:401});
