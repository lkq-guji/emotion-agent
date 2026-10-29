export const ambience=$state({playing:false,failed:false,unlocked:false,loading:false});
let wake:(()=>Promise<void>)|undefined;
export function registerAmbience(callback:()=>Promise<void>){wake=callback;return()=>{if(wake===callback)wake=undefined;};}
export async function wakeAmbience(){await wake?.();}
