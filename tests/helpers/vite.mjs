import {createServer} from "vite";import {fileURLToPath} from "node:url";
export const root=fileURLToPath(new URL("../..",import.meta.url));
export async function createLoader(){const vite=await createServer({appType:"custom",configFile:false,root,server:{middlewareMode:true,hmr:false}});return{load:path=>vite.ssrLoadModule(path),close:()=>vite.close()}}
