import type {AppearanceMode} from './theme';
import {drawIslandMotion} from './landscapeMotion';
export {floatingIslandOffset} from './landscapeMotion';
/** Scene pixels are sampled once; foliage and floating islands never have duplicate copies. */
export function drawIslandEnvironment(ctx:CanvasRenderingContext2D,image:HTMLImageElement,time:number,period:Exclude<AppearanceMode,'auto'>,still=false){
 drawIslandMotion(ctx,image,time,still);if(still)return;
 const t=time/1000;ctx.save();ctx.scale(2,2);
 for(let i=0;i<24;i++){
  const phase=((i*47+t*(period==='night'?-8:11))%250+250)%250,fade=Math.sin(Math.PI*phase/250)**2,x=175+(i*71%730)+Math.sin(t*.6+i)*9+phase*.12,y=35+phase;
  ctx.globalAlpha=fade*(period==='night'?.35+.3*(.5+.5*Math.sin(t*1.1+i)):.5);ctx.fillStyle=period==='night'?'#ffe8a9':'#ffd6e3';ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t+i)*.6);ctx.fillRect(0,0,period==='night'?2:3,2);ctx.restore();
 }ctx.restore();
}

const mailboxPaint=new WeakMap<HTMLImageElement,{canvas:HTMLCanvasElement;light:number}>();
/** Pixel-scaled, source-lit interior is composited before the scene weather. */
export function drawMailbox(destination:CanvasRenderingContext2D,image:HTMLImageElement,open:number,period:Exclude<AppearanceMode,'auto'>){
 if(open<=.001)return;const x=607,y=390,w=43,h=61,p=Math.max(0,Math.min(1,open)),night=period==='night';
 let paint=mailboxPaint.get(image);if(!paint){const sample=document.createElement('canvas');sample.width=w;sample.height=h;const scan=sample.getContext('2d',{willReadFrequently:true})!;scan.drawImage(image,x,y,w,h,0,0,w,h);const pixels=scan.getImageData(0,0,w,h).data;let total=0,count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>pixels[i+1]*1.1&&pixels[i]>pixels[i+2]*.9){total+=(pixels[i]+pixels[i+1]+pixels[i+2])/765;count++;}const canvas=document.createElement('canvas');canvas.width=44;canvas.height=38;paint={canvas,light:count?total/count:.55};mailboxPaint.set(image,paint);}
 const ctx=paint.canvas.getContext('2d')!;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,44,38);ctx.save();ctx.setTransform(.5,0,0,.5,12,2);
 const polygon=(points:number[][],fill:string|CanvasGradient)=>{ctx.beginPath();for(let i=0;i<points.length;i++)i?ctx.lineTo(...points[i] as [number,number]):ctx.moveTo(...points[i] as [number,number]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();};
 // Front rim, distant back wall, then the four receding planes.
 ctx.fillStyle=night?'#b96e92':'#ef9cbb';ctx.fillRect(0,0,w,h);
 const back=ctx.createLinearGradient(14,10,32,49);back.addColorStop(0,night?'#432e49':'#754057');back.addColorStop(1,night?'#825166':'#b67588');
 polygon([[3,5],[40,5],[40,58],[3,58]],night?'#593249':'#84435d');
 polygon([[13,14],[32,13],[32,45],[13,47]],back);
 polygon([[3,5],[13,14],[13,47],[3,58]],night?'#713f5b':'#b66b85');
 polygon([[40,5],[32,13],[32,45],[40,58]],night?'#45273e':'#85435f');
 polygon([[3,5],[40,5],[32,13],[13,14]],night?'#39273c':'#70374e');
 const floor=ctx.createLinearGradient(0,46,0,58);floor.addColorStop(0,night?'#9a6177':'#ca8998');floor.addColorStop(1,night?'#e2a89e':'#ffcebb');
 polygon([[3,58],[13,47],[32,45],[40,58]],floor);
 ctx.fillStyle='#281a392f';ctx.fillRect(14,15,17,3);
 const letters=[[[16,30],[29,29],[31,45],[17,47]],[[12,36],[31,34],[35,50],[15,53]],[[7,45],[30,41],[37,53],[11,57]]];
 for(const [i,points]of letters.entries()){
  const shadow=points.map(([a,b])=>[a+1,b+1]);polygon(shadow,'#44263850');polygon(points,night?['#cdb5aa','#e0c5b2','#f8debb'][i]:['#e6cbbd','#f7e0c4','#fff1d6'][i]);
  const [a,b,c,d]=points;ctx.lineWidth=.8;ctx.strokeStyle=night?'#9a7481':'#ce9b9c';ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo((c[0]+d[0])/2,(a[1]+d[1])/2+2);ctx.lineTo(b[0],b[1]);ctx.stroke();
  if(i===2){ctx.fillStyle='#c8759b';ctx.fillRect(24,47,3,3);ctx.fillStyle='#f4bfc3';ctx.fillRect(25,48,1,1);}
 }
 // The lip occludes the letters and receives the warm outdoor light.
 polygon([[0,58],[43,58],[41,61],[1,61]],night?'#db9aab':'#ffcbd0');
 ctx.fillStyle=night?'#f5c5bd':'#ffe5d6';ctx.fillRect(1,3,2,55);ctx.fillRect(1,58,40,1);
 ctx.fillStyle=night?'#8f4d71':'#c77396';ctx.fillRect(40,3,2,55);
 ctx.fillStyle=night?'#e1ac84':'#ffdfa3';ctx.fillRect(0,12,3,4);ctx.fillRect(0,47,3,4);
 // Past 90 degrees the inside of the open door, rather than a squashed photo, faces the viewer.
 const angle=p*1.98,cos=Math.cos(angle),depth=Math.sin(angle);
 ctx.save();ctx.transform(cos,depth*.13,0,1,1,1);
 if(cos>=0)ctx.drawImage(image,x,y,w,h,0,0,w,h);
 else{
  const panel=ctx.createLinearGradient(0,0,43,0);panel.addColorStop(0,night?'#b76d8c':'#ed9bbb');panel.addColorStop(1,night?'#d08b9d':'#ffbfd0');ctx.fillStyle=panel;ctx.fillRect(0,0,43,59);
  ctx.strokeStyle=night?'#f1b6be':'#ffe2e3';ctx.lineWidth=2;ctx.strokeRect(4,4,35,51);
  polygon([[8,36],[34,36],[32,51],[10,51]],night?'#8c4f70':'#c8799b');ctx.fillStyle=night?'#d594ad':'#ffc3d3';ctx.fillRect(9,35,25,2);
  ctx.fillStyle='#68435d';ctx.fillRect(33,25,4,3);
 }
 ctx.restore();
 polygon([[1+cos*w,1+depth*w*.13],[1+cos*w-2,2+depth*w*.13],[1+cos*w-2,61+depth*w*.13],[1+cos*w,60+depth*w*.13]],night?'#87445f':'#b96c8c');
 ctx.restore();
 destination.save();destination.imageSmoothingEnabled=false;destination.filter=`brightness(${Math.max(.62,Math.min(1.02,paint.light/(night?.43:.64)))}) saturate(.86)`;destination.drawImage(paint.canvas,x-24,y-4,88,76);destination.restore();
}
