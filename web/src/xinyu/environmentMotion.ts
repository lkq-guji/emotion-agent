import {cover} from './canvas';
import {drawFlow,type FlowRegion} from './flowMotion';
type Point=[number,number];
type Polygon=Point[];
type Profile={sky:Polygon[];samples:Point[];water?:Polygon;falls?:[number,number,number,number][]};
const rect=(x:number,y:number,w:number,h:number):Polygon=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
export const environmentProfiles:Record<string,Profile>={
 warm_room:{sky:[rect(.2,0,.8,.12),rect(.22,.12,.18,.17),rect(.79,.12,.21,.13)],samples:[[.5,.02],[.5,.14],[.5,.27]],falls:[[.416,.39,.022,.14],[.36,.545,.018,.11],[.72,.25,.018,.095],[.884,.444,.02,.10],[.746,.653,.027,.12],[.917,.81,.025,.15]]},
 star_room:{sky:[[[.13,.06],[.25,.06],[.48,.34],[.38,.35],[.22,.2]],rect(.79,.275,.18,.075)],samples:[[.55,.02],[.55,.17],[.57,.3]],water:[[.5,.6],[.92,.6],[.92,.73],[.85,.9],[.68,.96],[.43,.88],[.19,.8],[.18,.76],[.47,.7]]},
 sakura:{sky:[rect(.49,.14,.20,.19),rect(.56,.10,.18,.12)],samples:[[.6,.02],[.55,.14],[.5,.23]],water:[[.27,.72],[.38,.7],[.405,.66],[.44,.66],[.45,.71],[.48,.73],[.43,.8],[.44,.84],[.51,.9],[.47,.95],[.33,.95],[.13,.85],[.07,.79],[.07,.76]],falls:[[.117,.445,.018,.11],[.137,.576,.027,.077],[.187,.687,.029,.035]]},
 sunset:{sky:[rect(.52,.06,.48,.41)],samples:[[.62,.02],[.6,.15],[.58,.31],[.55,.43]],water:[[.44,.56],[1,.56],[1,.97],[.47,.79],[.17,.67],[.13,.62]]},
 city:{sky:[rect(.23,0,.54,.31)],samples:[[.45,.02],[.45,.14],[.43,.29]],water:[[.33,.59],[.57,.58],[.69,.64],[1,.72],[1,.91],[.91,.91],[.68,.84],[.53,.8],[.49,.71],[.34,.68]]},
 island:{sky:[rect(.02,0,.89,.18),rect(.035,.13,.27,.095),rect(.65,.13,.20,.17)],samples:[[.5,.02],[.5,.15],[.52,.24]],water:[[.02,.555],[.57,.54],[.57,.59],[.49,.64],[.37,.69],[.37,.75],[.65,.79],[.95,.8],[.9,.95],[.68,.94],[.3,.85],[.12,.8],[.02,.73]]},
};
// v2 compositions have separate mattes. Never move the canopy, lighthouse or peaks as clouds.
environmentProfiles.forest={sky:[],samples:[[.5,.02]],water:[[.57,.435],[.64,.448],[.62,.482],[.67,.49],[.65,.54],[.695,.588],[.72,.633],[.724,.70],[.91,.76],[1,.79],[1,1],[.8,1],[.72,.95],[.68,.92],[.67,.88],[.62,.83],[.51,.80],[.47,.77],[.48,.72],[.52,.70],[.53,.66],[.59,.64],[.52,.62],[.51,.575],[.56,.54],[.6,.53],[.575,.50],[.56,.48]],falls:[[.577,.452,.047,.034],[.623,.496,.034,.031],[.655,.624,.054,.074],[.551,.654,.034,.034],[.658,.859,.048,.04]]};
environmentProfiles.lighthouse={sky:[rect(.28,0,.72,.38)],samples:[[.5,.02],[.6,.16],[.7,.33]],water:[[.26,.416],[1,.416],[1,.95],[.55,.82],[.28,.68],[.16,.60]]};
environmentProfiles.mountain={sky:[[[.06,0],[.59,0],[.59,.045],[.5,.11],[.4,.14],[.36,.12],[.3,.17],[.23,.12],[.17,.18],[.06,.08]],[[.64,0],[1,0],[1,.11],[.85,.19],[.78,.16],[.70,.16],[.65,.08]]],samples:[[.45,.02],[.72,.06]],water:[[.35,.62],[.72,.59],[.91,.71],[.92,.88],[.54,.98],[.34,.91],[.20,.75]]};
const W=768,H=512;
type Layers={holes:HTMLCanvasElement;clouds:HTMLCanvasElement;skyMask:HTMLCanvasElement;water:HTMLCanvasElement;falls:HTMLCanvasElement;cloudWork:HTMLCanvasElement;waterRegions:FlowRegion[];fallRegions:FlowRegion[]};
const cache=new WeakMap<HTMLImageElement,Map<string,Layers>>();
function canvas(){const out=document.createElement('canvas');out.width=W;out.height=H;return out;}
function inside(x:number,y:number,polygon:Polygon){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function build(image:HTMLImageElement,scene:string):Layers{
 let group=cache.get(image);if(!group){group=new Map();cache.set(image,group);}if(group.has(scene))return group.get(scene)!;
 const profile=environmentProfiles[scene]||environmentProfiles.warm_room,source=canvas(),ctx=source.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0,W,H);const original=ctx.getImageData(0,0,W,H),raw=original.data;
 const cloud=ctx.createImageData(W,H),holes=ctx.createImageData(W,H),sky=ctx.createImageData(W,H),water=ctx.createImageData(W,H),falls=ctx.createImageData(W,H),candidate=new Uint8Array(W*H);
 const stops=profile.samples.map(([x,y])=>{const values:number[][]=[];for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const i=(Math.max(0,Math.min(H-1,Math.round(y*H)+dy))*W+Math.max(0,Math.min(W-1,Math.round(x*W)+dx)))*4;values.push([raw[i],raw[i+1],raw[i+2]]);}values.sort((a,b)=>a[0]+a[1]+a[2]-b[0]-b[1]-b[2]);return {y:y*H,rgb:values[Math.floor(values.length*.3)]};});
 const skyColor=(y:number)=>{const upper=stops.findIndex(s=>s.y>=y);if(upper===0)return stops[0].rgb;if(upper<0)return stops.at(-1)!.rgb;const a=stops[upper-1],b=stops[upper],p=(y-a.y)/(b.y-a.y);return a.rgb.map((v,k)=>v+(b.rgb[k]-v)*p);};
 for(let y=0;y<H;y++){const base=skyColor(y);for(let x=0;x<W;x++){
  const p=y*W+x,i=p*4,nx=x/W,ny=y/H,inSky=profile.sky.some(poly=>inside(nx,ny,poly)),r=raw[i],g=raw[i+1],b=raw[i+2];
  if(inSky){sky.data[i+3]=255;const brighter=(r+g-base[0]-base[1])/2;if(brighter>22&&Math.max(r,g,b)>90)candidate[p]=1;}
  const cool=b>r*.92&&b>g*.87&&b>52,warmReflection=r>g*1.04&&g>b*1.05&&r>160;
  if(profile.water&&inside(nx,ny,profile.water)&&(cool||warmReflection)){for(let k=0;k<3;k++)water.data[i+k]=raw[i+k];water.data[i+3]=240;}
  if(profile.falls?.some(([a,c,w,h])=>nx>=a&&nx<a+w&&ny>=c&&ny<c+h)&&b>r*.89&&g>r*.82&&Math.max(r,g,b)>145){for(let k=0;k<3;k++)falls.data[i+k]=raw[i+k];falls.data[i+3]=230;}
 }}
 // Actual cloud-color pixels supply the matte; tiny stars and highlights are excluded.
 const visited=new Uint8Array(W*H),queue=new Int32Array(W*H);
 for(let start=0;start<candidate.length;start++){
  if(!candidate[start]||visited[start])continue;let read=0,end=1;queue[0]=start;visited[start]=1;
  while(read<end){const p=queue[read++],x=p%W;for(const n of [x?p-1:-1,x<W-1?p+1:-1,p-W,p+W])if(n>=0&&n<candidate.length&&candidate[n]&&!visited[n]){visited[n]=1;queue[end++]=n;}}
  if(end<28)continue;for(let q=0;q<end;q++){const p=queue[q],i=p*4,base=skyColor(Math.floor(p/W));for(let k=0;k<3;k++){cloud.data[i+k]=raw[i+k];holes.data[i+k]=base[k];}cloud.data[i+3]=255;holes.data[i+3]=255;}
 }
 const put=(pixels:ImageData)=>{const out=canvas();out.getContext('2d')!.putImageData(pixels,0,0);return out;};
 const points=profile.water||[],xs=points.map(p=>p[0]*W),ys=points.map(p=>p[1]*H),waterRegions=points.length?[{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)}]:[];
 const fallRegions=(profile.falls||[]).map(([x,y,w,h])=>({x:x*W,y:y*H,width:w*W,height:h*H}));
 const layers={holes:put(holes),clouds:put(cloud),skyMask:put(sky),water:put(water),falls:put(falls),cloudWork:canvas(),waterRegions,fallRegions};group.set(scene,layers);return layers;
}
/** The original sky/cloud/water texture moves; buildings and banks stay in place. */
export function drawEnvironment(ctx:CanvasRenderingContext2D,image:HTMLImageElement,scene:string,time:number,width:number,height:number,reduced=false){
 cover(ctx,image,0,0,width,height);if(reduced)return;
 const layers=build(image,scene),t=time/1000,scale=Math.max(width/W,height/H);ctx.save();ctx.translate((width-W*scale)/2,(height-H*scale)/2);ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
 ctx.drawImage(layers.holes,0,0);
 const work=layers.cloudWork.getContext('2d')!;work.clearRect(0,0,W,H);work.globalCompositeOperation='source-over';const drift=(t*5)%W;work.drawImage(layers.clouds,drift,0);work.drawImage(layers.clouds,drift-W,0);work.globalCompositeOperation='destination-in';work.drawImage(layers.skyMask,0,0);work.globalCompositeOperation='source-over';ctx.drawImage(layers.cloudWork,0,0);
 if(layers.waterRegions.length)drawFlow(ctx,layers.water,layers.cloudWork,time,layers.waterRegions,'water');
 if(layers.fallRegions.length)drawFlow(ctx,layers.falls,layers.cloudWork,time,layers.fallRegions,'fall');
 ctx.restore();
}
