export interface SnowPointer{x:number;y:number}
const hash=(seed:number)=>{let n=Math.imul(seed^(seed>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return((n^(n>>>16))>>>0)/4294967296;};
const crystals=[[[0,0]],[[0,-1],[-1,0],[0,0],[1,0],[0,1]],[[-2,-2],[2,-2],[-1,-1],[1,-1],[-2,0],[-1,0],[0,0],[1,0],[2,0],[-1,1],[1,1],[-2,2],[2,2]],[[0,-2],[-1,-1],[0,-1],[1,-1],[-2,0],[-1,0],[0,0],[1,0],[2,0],[-1,1],[0,1],[1,1],[0,2]]] as const;

export function snowFlakes(time:number,width:number,height:number,pointer?:SnowPointer,intensity=.16){
 const t=time/1000,count=Math.max(60,Math.min(480,Math.round(width*height/3300))),pixel=Math.max(.65,Math.min(2.5,width/850)),margin=14*pixel,coverage=.12+Math.max(0,Math.min(1,intensity))*.88;
 return Array.from({length:count},(_,i)=>{
  const depth=hash(i*71+9),speed=(height+margin*2)/(.7+depth)*.035,span=height+margin*2,age=hash(i*103+3)*span+t*speed,cycle=Math.floor(age/span),y=age-cycle*span-margin;
  const drift=t*(2+depth*5)+Math.sin(t*(.27+depth*.2)+i*2.3)*(4+depth*9);
  let x=(hash(i*137+cycle*919+17)*(width+margin*2)+drift)%(width+margin*2)-margin,yy=y;
  if(pointer){const dx=x-pointer.x*width,dy=y-pointer.y*height,radius=Math.min(width,height)*.23,distance=Math.hypot(dx,dy);if(distance<radius){const push=(1-distance/radius)**2*pixel*10;x+=dx/Math.max(1,distance)*push;yy+=dy/Math.max(1,distance)*push*.45;}}
  const fade=Math.min(1,Math.max(0,(y+margin)/margin),Math.max(0,(height+margin-y)/margin)),spark=Math.max(0,Math.sin(t*.8+i*1.9))**18;
  const visible=Math.max(0,Math.min(1,(coverage-hash(i*139+47))/.07));
  return{x,y:yy,pixel:pixel*(depth>.8?1.15:depth<.3?.7:1),sprite:depth<.42?0:depth<.73?1:i%2?2:3,alpha:(.34+depth*.5+spark*.1)*fade*visible};
 });
}

export function drawPixelSnow(ctx:CanvasRenderingContext2D,time:number,width:number,height:number,still=false,pointer?:SnowPointer,intensity=.16){
 ctx.save();ctx.fillStyle='#fffaf2';
 for(const flake of snowFlakes(still?0:time,width,height,still?undefined:pointer,intensity)){
  if(flake.alpha<=.001)continue;
  ctx.globalAlpha=flake.alpha;const p=flake.pixel,x=Math.round(flake.x/p)*p,y=Math.round(flake.y/p)*p;
  for(const [dx,dy] of crystals[flake.sprite])ctx.fillRect(x+dx*p,y+dy*p,p,p);
 }
 ctx.restore();
}
