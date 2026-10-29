import {getSceneArt} from './art';import {loadPicture} from './canvas';
import {getSceneMedia,loadLocalMedia,type LocalScene,type LoadedScene} from './sceneLibrary';
import {roomWeatherFile,type ScenePeriod} from './weatherScene';
export function sceneSourceKey(id:string,library:LocalScene[]=[],period?:ScenePeriod){return library.some(scene=>scene.id===id)?'local:'+id:(period&&roomWeatherFile(id,period)||getSceneArt(id).file);}
export async function loadSceneSource(id:string,library:LocalScene[]=[],period?:ScenePeriod):Promise<LoadedScene>{
 const local=library.find(scene=>scene.id===id);if(local){const blob=await getSceneMedia(id);if(!blob)throw new Error('这份背景的原文件不在当前浏览器，请删除后重新导入。');return loadLocalMedia(blob,local.kind,'local:'+id);}
 const key=sceneSourceKey(id,library,period);return {source:await loadPicture(key),key,dispose:()=>{}};
}
