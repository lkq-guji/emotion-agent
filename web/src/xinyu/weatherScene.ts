import type {Weather} from './weather';
export type ScenePeriod='day'|'dusk'|'night';
export function islandWeatherFile(period:ScenePeriod,weather:Weather){return weather==='rain'?`assets/island-overcast-${period==='night'?'night':'day'}-v1.png`:undefined;}
export function roomWeatherScene(selected:string,_weather:Weather){return selected;}
export function roomWeatherFile(scene:string,period:ScenePeriod){return scene==='overcast'?'/xinyu/generated/overcast'+(period==='night'?'-night':'')+'-v1.png':undefined;}
