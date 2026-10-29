/** Small continuously moving highlights. Wrapped droplets fade to zero at both ends. */
export function flowStreak(seconds:number,index:number,speed=.16){
 const p=((seconds*speed+index*.38196601125)%1+1)%1;
 return {position:p,opacity:Math.sin(Math.PI*p)**2};
}
export function waterDrift(seconds:number,index=0){
 return {x:Math.sin(seconds*.66+index*1.7)*.8+Math.sin(seconds*.29+index)*.35,
  y:Math.sin(seconds*.79+index)*1.15+Math.sin(seconds*.31+index*2)*.35};
}
export type FlowRegion={x:number;y:number;width:number;height:number};

/** Reuse a precomputed matte; no rows are copied or reset at a cycle boundary. */
export function drawFlow(ctx:CanvasRenderingContext2D,texture:HTMLCanvasElement,work:HTMLCanvasElement,time:number,regions:FlowRegion[],kind:'fall'|'water'){
 const w=work.width,h=work.height,layer=work.getContext('2d')!,t=time/1000,drift=waterDrift(t,kind==='fall'?1:2);
 layer.clearRect(0,0,w,h);layer.globalCompositeOperation='source-over';layer.globalAlpha=kind==='fall'?.55:.38;
 layer.imageSmoothingEnabled=true;layer.drawImage(texture,drift.x,drift.y);
 layer.globalAlpha=1;
 for(let r=0;r<regions.length;r++){
  const region=regions[r];for(let i=0;i<4;i++){
   const motion=flowStreak(t,r*4+i,kind==='fall'?.18:.075),x=region.x+region.width*((i*.291+r*.13)%1),y=region.y+motion.position*region.height;
   layer.globalAlpha=motion.opacity*(kind==='fall'?.4:.16);layer.fillStyle=kind==='fall'?'#ecfaff':'#f4f3ff';
   if(kind==='fall')layer.fillRect(x,y,Math.max(1,region.width*.08),Math.max(2,region.height*.09));
   else layer.fillRect(x,y,Math.max(3,region.width*.08),1.5);
  }
 }
 layer.globalAlpha=1;layer.globalCompositeOperation='destination-in';layer.drawImage(texture,0,0);layer.globalCompositeOperation='source-over';
 ctx.drawImage(work,0,0);
}
