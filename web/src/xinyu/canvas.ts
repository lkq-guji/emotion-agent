export function loadPicture(url:string):Promise<HTMLImageElement>{
  if(!pictures.has(url))pictures.set(url,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{pictures.delete(url);reject(new Error('素材暂时无法读取，请重新加载。'));};image.src=url;}));
  return pictures.get(url)!;
}
const pictures=new Map<string,Promise<HTMLImageElement>>();
export function cover(ctx:CanvasRenderingContext2D,image:CanvasImageSource,x:number,y:number,width:number,height:number){
  const source=image as unknown as {videoWidth?:number;videoHeight?:number;naturalWidth?:number;naturalHeight?:number;width:number;height:number},iw=source.videoWidth||source.naturalWidth||source.width,ih=source.videoHeight||source.naturalHeight||source.height;
  if(!iw||!ih)return;const scale=Math.max(width/iw,height/ih),sw=width/scale,sh=height/scale;
  ctx.drawImage(image,(iw-sw)/2,(ih-sh)/2,sw,sh,x,y,width,height);
}
type Job={canvas:HTMLCanvasElement;paint:(time:number)=>void;reduced:()=>boolean;visible:boolean;last:number;fps:number|(()=>number)};
const jobs=new Set<Job>();let frame=0;
function schedule(){if(!frame&&[...jobs].some(j=>j.visible&&!j.reduced())&&!document.hidden)frame=requestAnimationFrame(tick);}
function tick(time:number){frame=0;for(const job of jobs){const fps=typeof job.fps==='function'?job.fps():job.fps;if(job.visible&&!job.reduced()&&(!fps||time-job.last>=1000/fps-1)){job.last=time;job.paint(time);}}schedule();}
function visibility(){if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{for(const job of jobs)if(job.visible)job.paint(performance.now());schedule();}}
export function observeCanvas(canvas:HTMLCanvasElement,paint:(time:number)=>void,reduced:()=>boolean,fps:number|(()=>number)=30){
  const job:Job={canvas,paint,reduced,visible:false,last:0,fps};jobs.add(job);
  if(jobs.size===1)document.addEventListener('visibilitychange',visibility);
  const invalidate=()=>{if(job.visible&&!document.hidden)paint(performance.now());schedule();};
  const resize=new ResizeObserver(invalidate);resize.observe(canvas);
  const observer=new IntersectionObserver(entries=>{job.visible=entries[0].isIntersecting;invalidate();},{rootMargin:'40px'});observer.observe(canvas);
  return {invalidate,destroy(){observer.disconnect();resize.disconnect();jobs.delete(job);if(!jobs.size){document.removeEventListener('visibilitychange',visibility);cancelAnimationFrame(frame);frame=0;}}};
}
export function canvasContext(canvas:HTMLCanvasElement){
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  const ctx=canvas.getContext('2d');if(!ctx)return null;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);ctx.imageSmoothingEnabled=false;
  return {ctx,width:rect.width,height:rect.height};
}
