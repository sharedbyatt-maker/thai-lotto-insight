import {getChatGPTUser} from "../app/chatgpt-auth";
import {isAdminAuthorized} from "./admin-authorization";
export {isAdminAuthorized} from "./admin-authorization";

export async function requireAdminApi(request:Request){return isAdminAuthorized(request,await getChatGPTUser(),{ADMIN_EMAIL:process.env.ADMIN_EMAIL,SYNC_TOKEN:process.env.SYNC_TOKEN})}
export const unauthorized=()=>Response.json({error:"Unauthorized"},{status:401});
