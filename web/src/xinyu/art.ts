export const sceneArt=Object.fromEntries(['warm_room','star_room','sakura','sunset','city','island'].map(id=>[id,{file:'/xinyu/generated/'+id+'.png',width:1536,height:1024,x:0,y:0}]));
export function getSceneArt(id:string){return sceneArt[id]||sceneArt.warm_room;}
sceneArt.overcast={file:'/xinyu/generated/overcast-v1.png',width:1536,height:1024,x:0,y:0};
export const sceneMotion:Record<string,string>={warm_room:'云朵缓行 · 瀑布流淌',star_room:'云层慢移 · 星光与湖波',sakura:'落花随风 · 云移与流水',sunset:'晚霞流动 · 海浪与波光',city:'暮云慢行 · 河面倒影',island:'云朵飘动 · 湖水涟漪'};
sceneMotion.overcast='阴云慢移 · 窗边听雨';
for(const id of ['forest','lighthouse','mountain'])sceneArt[id]={file:'/xinyu/generated/'+id+'-v2.png',width:1536,height:1024,x:0,y:0};
sceneMotion.forest='林光轻落 · 溪流与萤火';sceneMotion.lighthouse='流云掠海 · 海浪与灯光';sceneMotion.mountain='晨云慢移 · 冰湖微澜';
