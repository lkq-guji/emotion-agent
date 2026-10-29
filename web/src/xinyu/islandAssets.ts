import {loadPicture} from './canvas';
import type {IslandPlacement} from './islandEntry';
import type {WardrobeConfig} from './wardrobe';
export interface AtlasFrame{id:number;source:{x:number;y:number;width:number;height:number};visibleBounds:{x:number;y:number;width:number;height:number};anchor:{x:number;y:number}}
export interface IslandAtlas{file:string;width:number;height:number;frames:AtlasFrame[]}
export interface IslandAssets{scenes:{id:string;file:string}[];actor:IslandAtlas;door:IslandAtlas;placement:IslandPlacement}
let pending:Promise<IslandAssets>|undefined;
export function loadIslandAssets(){
 return pending??=fetch('/xinyu/island/assets.json').then(async response=>{
  if(!response.ok)throw new Error('小岛素材暂未就绪');const data=await response.json() as IslandAssets;
  for(const [atlas,count]of [[data.actor,8],[data.door,4]] as const){
   if(!atlas||atlas.frames?.length!==count)throw new Error('小岛动作数据不完整');
   for(const frame of atlas.frames){const s=frame.source;if(![s.x,s.y,s.width,s.height,frame.anchor.x,frame.anchor.y].every(Number.isFinite)||s.x<0||s.y<0||s.width<=0||s.height<=0||s.x+s.width>atlas.width||s.y+s.height>atlas.height)throw new Error('小岛动作坐标无效');}
  }
  return data;
 }).catch(error=>{pending=undefined;throw error;});
}
export function islandPicture(file:string){return loadPicture('/xinyu/island/'+file);}
const outfitFiles:Record<WardrobeConfig['outfit'],string>={cardigan:'assets/xiaoyu-cardigan-atlas-v1.png',hoodie:'assets/xiaoyu-hoodie-atlas-v1.png',sailor:'assets/xiaoyu-sailor-atlas-v1.png'};
export function islandOutfitPicture(outfit:WardrobeConfig['outfit']){return islandPicture(outfitFiles[outfit]);}

const frameCache=new WeakMap<HTMLImageElement,Map<string,HTMLCanvasElement>>();
export function islandFrame(image:HTMLImageElement,frame:AtlasFrame,appearance:WardrobeConfig['hairColor']|WardrobeConfig='lilac'){
 const hair=typeof appearance==='string'?appearance:appearance.hairColor,color=typeof appearance==='string'?'lilac':appearance.color,accessory=typeof appearance==='string'?'none':appearance.accessory;
 let cache=frameCache.get(image);if(!cache){cache=new Map();frameCache.set(image,cache);}
 const key=[frame.id,hair,color,accessory].join(':');if(cache.has(key))return cache.get(key)!;
 const {source:s,visibleBounds:b}=frame,out=document.createElement('canvas');out.width=s.width;out.height=s.height;
 const c=out.getContext('2d',{willReadFrequently:true})!;c.drawImage(image,s.x,s.y,s.width,s.height,0,0,s.width,s.height);
 // Preserve whole-frame anatomy. Remove only disconnected alpha specks, like the existing room sprite loader.
 const pixels=c.getImageData(0,0,s.width,s.height),raw=pixels.data,visited=new Uint8Array(s.width*s.height),queue=new Int32Array(visited.length);let largest:number[]=[];
 for(let start=0;start<visited.length;start++){
  if(visited[start]||raw[start*4+3]<24)continue;let read=0,end=1;queue[0]=start;visited[start]=1;
  while(read<end){const p=queue[read++],x=p%s.width;for(const n of [x>0?p-1:-1,x<s.width-1?p+1:-1,p-s.width,p+s.width])if(n>=0&&n<visited.length&&!visited[n]&&raw[n*4+3]>=24){visited[n]=1;queue[end++]=n;}}
  if(end>largest.length)largest=Array.from(queue.subarray(0,end));
 }
 const keep=new Uint8Array(visited.length);for(const p of largest)keep[p]=1;
 for(let p=0;p<visited.length;p++){
  const i=p*4;if(!keep[p]){raw[i+3]=0;continue;}
  const y=Math.floor(p/s.width),r=raw[i],g=raw[i+1],blue=raw[i+2];
  if(hair==='rose'&&y<=b.y+b.height*.53&&blue>g+4&&r>g+2&&Math.max(r,g,blue)-Math.min(r,g,blue)>8){raw[i]=Math.min(255,r+10);raw[i+2]=Math.max(0,blue-6);}
  if(color!=='lilac'&&y>b.y+b.height*.51&&y<b.y+b.height*.82){
   const rr=r/255,gg=g/255,bb=blue/255,max=Math.max(rr,gg,bb),min=Math.min(rr,gg,bb),delta=max-min;if(delta<.025)continue;
   let h=(max===rr?((gg-bb)/delta)%6:max===gg?(bb-rr)/delta+2:(rr-gg)/delta+4)*60;h=(h+360)%360;if(h<235||h>305)continue;
   const light=(max+min)/2,hh=color==='rose'?330:36,saturation=color==='cream'?.22:.3,chroma=(1-Math.abs(2*light-1))*saturation,v=chroma*(1-Math.abs(hh/60%2-1)),m=light-chroma/2,rgb=color==='rose'?[chroma,0,v]:[chroma,v,0];
   for(let k=0;k<3;k++)raw[i+k]=(rgb[k]+m)*255;
  }
 }
 c.putImageData(pixels,0,0);
 // A small pin belongs on the front-facing costume; back poses show no pin.
 if(accessory!=='none'&&frame.id===0){const x=frame.anchor.x+11,y=b.y+b.height*.64;c.save();c.translate(x,y);c.fillStyle='#ead8a7';c.strokeStyle='#8572a4';c.lineWidth=2;c.beginPath();if(accessory==='star'){for(let i=0;i<10;i++){const radius=i%2?3:7,angle=i*Math.PI/5-Math.PI/2;c.lineTo(Math.cos(angle)*radius,Math.sin(angle)*radius);}}else for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;c.ellipse(Math.cos(angle)*4,Math.sin(angle)*4,3,3,0,0,Math.PI*2);}c.fill();c.stroke();c.restore();}
 cache.set(key,out);return out;
}

export function drawIslandSprite(ctx:CanvasRenderingContext2D,image:HTMLImageElement,atlas:IslandAtlas,index:number,x:number,y:number,width:number,alpha=1,appearance:WardrobeConfig['hairColor']|WardrobeConfig='lilac'){
 const frame=atlas.frames[index],scale=width/frame.source.width;ctx.save();ctx.globalAlpha*=alpha;
 ctx.drawImage(islandFrame(image,frame,appearance),x-frame.anchor.x*scale,y-frame.anchor.y*scale,frame.source.width*scale,frame.source.height*scale);ctx.restore();
}
