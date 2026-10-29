import {loadPicture} from './canvas';
import type {WardrobeConfig} from './wardrobe';

export type Part={image:HTMLCanvasElement;width:number;height:number};
export type ChibiAssets={outfits:Record<string,HTMLCanvasElement[]>;cat:HTMLCanvasElement[];cache:Map<string,HTMLCanvasElement>};
export type ChibiMotion={still?:boolean;greetingAt?:number;pointerX?:number;pointerY?:number;speaking?:boolean};
export function smooth(value:number){const p=Math.max(0,Math.min(1,value));return p*p*(3-2*p);}
export function blinkAt(time:number,offset=0){const at=(time+offset)%5200;return at<100?smooth(at/100):at<145?1:at<290?1-smooth((at-145)/145):0;}
export function greetingAt(time:number,start?:number){if(start===undefined)return 0;const elapsed=time-start;return elapsed<0||elapsed>2400?0:Math.min(smooth(elapsed/360),1-smooth((elapsed-1850)/550));}
export function uniformView(width:number,height:number,designWidth=1360,designHeight=390){const scale=Math.min(width/designWidth,height/designHeight);return {scale,x:width-designWidth*scale,y:(height-designHeight*scale)/2};}
export const companionRegion={x:550,y:0,width:810,height:390};
export const laptopRegion={x:592,y:225,width:270,height:136};
export function companionView(width:number,height:number){const r=companionRegion,scale=Math.min(width/r.width,height/r.height);return {scale,x:(width-r.width*scale)/2-r.x*scale,y:(height-r.height*scale)/2};}
function canvas(width:number,height:number){const result=document.createElement('canvas');result.width=Math.max(1,Math.round(width));result.height=Math.max(1,Math.round(height));return result;}

/** Isolate one complete sprite. Never extract a head, torso, sleeve or tail. */
export function cellPart(image:HTMLImageElement,columns:number,rows:number,index:number):Part{
 const sw=image.width/columns,sh=image.height/rows,sample=canvas(sw,sh),ctx=sample.getContext('2d',{willReadFrequently:true})!;
 ctx.drawImage(image,index%columns*sw,Math.floor(index/columns)*sh,sw,sh,0,0,sample.width,sample.height);
 const pixels=ctx.getImageData(0,0,sample.width,sample.height),data=pixels.data,labels=new Uint32Array(sample.width*sample.height),queue=new Int32Array(labels.length);let label=0,largest=0,largestSize=0;
 for(let start=0;start<labels.length;start++){
  if(labels[start]||data[start*4+3]<16)continue;label++;let cursor=0,end=1;queue[0]=start;labels[start]=label;
  while(cursor<end){const p=queue[cursor++],x=p%sample.width;for(const n of [x>0?p-1:-1,x<sample.width-1?p+1:-1,p-sample.width,p+sample.width])if(n>=0&&n<labels.length&&!labels[n]&&data[n*4+3]>=16){labels[n]=label;queue[end++]=n;}}
  if(end>largestSize){largestSize=end;largest=label;}
 }
 let left=sample.width,top=sample.height,right=0,bottom=0;
 for(let y=0;y<sample.height;y++)for(let x=0;x<sample.width;x++){const p=y*sample.width+x;if(labels[p]!==largest){data[p*4+3]=0;continue;}if(data[p*4+3]>64){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
 ctx.putImageData(pixels,0,0);const width=Math.max(1,right-left+1),height=Math.max(1,bottom-top+1),out=canvas(width,height);out.getContext('2d')!.drawImage(sample,left,top,width,height,0,0,width,height);return {image:out,width,height};
}
function wholeFrames(image:HTMLImageElement,cat=false){
 const parts=[0,1,2,3].map(index=>cellPart(image,4,2,index));
 const scale=Math.min(448/Math.max(...parts.map(p=>p.width)),(cat?250:448)/Math.max(...parts.map(p=>p.height)));
 return parts.map(part=>{const out=canvas(512,512),w=part.width*scale,h=part.height*scale;out.getContext('2d')!.drawImage(part.image,(512-w)/2,(cat?472:496)-h,w,h);return out;});
}
let pending:Promise<ChibiAssets>;
export function loadChibi():Promise<ChibiAssets>{
 return pending??=Promise.all(['girl-atlas','xiaoyu-cardigan-whole','xiaoyu-sailor-whole','cat-atlas'].map(id=>loadPicture('/xinyu/generated/'+id+'.png'))).then(([hoodie,cardigan,sailor,cat])=>({outfits:{hoodie:wholeFrames(hoodie),cardigan:wholeFrames(cardigan),sailor:wholeFrames(sailor)},cat:wholeFrames(cat,true),cache:new Map()}));
}
function coloredSprite(assets:ChibiAssets,config:WardrobeConfig,frame:number){
 const source=(assets.outfits[config.outfit]||assets.outfits.hoodie)[frame],key=[config.outfit,config.color,config.hairColor,config.accessory,frame].join(':');
 if(config.color==='lilac'&&config.hairColor==='lilac'&&config.accessory==='none')return source;if(assets.cache.has(key))return assets.cache.get(key)!;
 const out=canvas(512,512),ctx=out.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(source,0,0);const pixels=ctx.getImageData(0,0,512,512),data=pixels.data;
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const i=(y*512+x)*4;if(!data[i+3])continue;
  const face=((x-256)/139)**2+((y-303)/88)**2<1,garment=y>385,tone=garment?config.color:config.hairColor;if(tone==='lilac'||(!garment&&face))continue;
  const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;if(d<.025)continue;
  let h=(max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4)*60;h=(h+360)%360;if(h<235||h>305)continue;
  const light=(max+min)/2,hh=tone==='rose'?330:36,saturation=tone==='cream'?.22:.3,c=(1-Math.abs(2*light-1))*saturation,v=c*(1-Math.abs(hh/60%2-1)),m=light-c/2,rgb=tone==='rose'?[c,0,v]:[c,v,0];
  for(let k=0;k<3;k++)data[i+k]=(rgb[k]+m)*255;
 }
 ctx.putImageData(pixels,0,0);
 if(config.accessory!=='none'){
  ctx.save();ctx.translate(272,430);ctx.fillStyle='#ead8a7';ctx.strokeStyle='#8572a4';ctx.lineWidth=2;ctx.beginPath();
  if(config.accessory==='star'){for(let i=0;i<10;i++){const r=i%2?4:9,a=i*Math.PI/5-Math.PI/2;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}}
  else{for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.ellipse(Math.cos(a)*5,Math.sin(a)*5,4,4,0,0,Math.PI*2);}}
  ctx.fill();ctx.stroke();ctx.restore();
 }
 assets.cache.set(key,out);return out;
}
export function expressionFrame(time:number,still=false,greet?:number,offset=0){if(still)return 0;const b=blinkAt(time,offset);return b>.82?2:b>.15?1:greetingAt(time,greet)>.2?3:0;}

const silhouetteEdges=new WeakMap<HTMLCanvasElement,Float32Array>();
function textureEdges(image:HTMLCanvasElement){
 if(silhouetteEdges.has(image))return silhouetteEdges.get(image)!;
 const pixels=image.getContext('2d',{willReadFrequently:true})!.getImageData(0,0,image.width,image.height).data,points:number[]=[];
 for(let y=0;y<image.height;y++){
  let left=image.width,right=-1;for(let x=0;x<image.width;x++)if(pixels[(y*image.width+x)*4+3]>32){left=Math.min(left,x);right=x;}
  if(right>=left)points.push(left,y,left,y+1,right+1,y,right+1,y+1);
 }
 const edges=new Float32Array(points);silhouetteEdges.set(image,edges);return edges;
}
/** One complete texture, with its actual lowest opaque point anchored to the desk. */
function paintWhole(ctx:CanvasRenderingContext2D,image:HTMLCanvasElement,time:number,still:boolean,greet:number,pointer=0,angle=0,cat=false){
 const t=still?0:time/1000,breath=still?0:Math.sin(t*(cat?1.8:1.5))*(cat?1.4:1.8),lean=still?0:Math.sin(t*.7)*.004+greet*Math.sin(t*2.6)*.012;
 const rotation=angle*Math.PI/180+lean,base=cat?472:496,shear=still?0:Math.sin(t*.75)*.0015+pointer*.002,stretch=1+breath/512;
 // Lean above a level desk line. Rotating a seated cutout lifts the other hand.
 const a=1,b=0,c=Math.tan(rotation)*.55+shear,d=stretch,edges=textureEdges(image);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(let i=0;i<edges.length;i+=2){const x=edges[i]-256,y=edges[i+1]-base,px=a*x+c*y,py=b*x+d*y;minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);}
 const fit=Math.min(1,240/Math.max(Math.abs(minX),Math.abs(maxX)),(base-24)/(maxY-minY));
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.transform(a*fit,b*fit,c*fit,d*fit,256,base-maxY*fit);
 ctx.drawImage(image,-256,-base);
 ctx.restore();
}
export function drawChibi(ctx:CanvasRenderingContext2D,assets:ChibiAssets,config:WardrobeConfig,time:number,motion:ChibiMotion={}){
 const still=motion.still===true,frame=!still&&motion.speaking&&Math.floor(time/280)%2===0?3:expressionFrame(time,still,motion.greetingAt),greet=still?0:greetingAt(time,motion.greetingAt);
 paintWhole(ctx,coloredSprite(assets,config,frame),time,still,greet,motion.pointerX||0,config.angle);
}
export function drawCat(ctx:CanvasRenderingContext2D,frames:HTMLCanvasElement[],time:number,still:boolean,greet?:number,pointerX=0){paintWhole(ctx,frames[expressionFrame(time,still,greet,2100)],time,still,still?0:greetingAt(time,greet),pointerX,0,true);}
