import {drawScene} from './sceneCanvas';import {drawWeather,type Weather} from './weather';
import {drawWardrobe,type WardrobeConfig} from './wardrobe';import {drawCat,type ChibiAssets} from './integratedSprites';
import {PixelSwapFrame} from './pixelSwap';
import type {SceneSource} from './sceneLibrary';
import {finishWindow} from './windowGlass';
const W=2176,H=1088,desk=680,windowBox={x:82,y:108,width:615,height:370};
export function panoramaLayout(width:number,height:number){
 // Furniture and whole sprites share one camera; dialogue never resizes the room or its subjects.
 const scale=Math.max(width/W,height/H),x=(width-W*scale)*.45;
 const actorWidth=570,catWidth=350;
 const girl={x:1055-actorWidth/2,y:desk+4-496*actorWidth/512,width:actorWidth},cat={x:720-catWidth/2,y:desk+3-472*catWidth/512,width:catWidth};
 const desiredY=height*.85-desk*scale,y=Math.max(height-H*scale,Math.min(0,desiredY));
 return {x,y,scale,height:H*scale,girl,cat,desk,window:windowBox,areas:{character:[girl.x,girl.y+24*actorWidth/512,actorWidth,472*actorWidth/512-2],cat:[cat.x,cat.y+205*catWidth/512,catWidth,267*catWidth/512-1],cloud:[windowBox.x,windowBox.y,windowBox.width,windowBox.height],lamp:[1825,340,215,240]}};
}
function canvas(w:number,h:number){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
export function panoramaView(width:number,height:number){
 const {x,y,scale,height:paintHeight}=panoramaLayout(width,height);return {x,y,scale,height:paintHeight};
}
export class PanoramaRoom{
 private room=canvas(W,H);private window=canvas(windowBox.width,windowBox.height);
 private swap=new PixelSwapFrame(windowBox.width,windowBox.height,26);
 get swapping(){return this.swap.active;}
 draw(destination:CanvasRenderingContext2D,width:number,height:number,plate:HTMLImageElement,background:SceneSource|undefined,assets:ChibiAssets,config:WardrobeConfig,time:number,state:{scene:string;period:'day'|'dusk'|'night';weather:Weather;weatherTime:number;intensity:number;still:boolean;lamp:number;greeting?:number;catGreeting?:number;pointer:{x:number;y:number};speaking:boolean}){
  const ctx=this.room.getContext('2d')!,layout=panoramaLayout(width,height);ctx.clearRect(0,0,W,H);ctx.drawImage(plate,0,0,W,H);
  if(background){const pane=this.window.getContext('2d')!,b=windowBox;pane.clearRect(0,0,b.width,b.height);this.swap.draw(pane,background.src+state.period,time,paint=>drawScene(paint,background,state.scene,time,b.width,b.height,state.still),state.still);drawWeather(pane,state.weather,state.weatherTime,b.width,b.height,state.still,{light:state.period,intensity:state.intensity});finishWindow(pane,plate,b,state.period);ctx.drawImage(this.window,b.x,b.y);}
  if(state.period!=='day'){ctx.fillStyle=state.period==='night'?'#25243f':'#efb17e';ctx.globalAlpha=state.period==='night'?.28:.12;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  if(state.lamp>.002){ctx.save();ctx.globalCompositeOperation='screen';const glow=ctx.createRadialGradient(1925,475,8,1890,520,640);glow.addColorStop(0,`rgba(255,199,113,${state.lamp*.46})`);glow.addColorStop(.3,`rgba(255,180,92,${state.lamp*.2})`);glow.addColorStop(1,'rgba(255,180,92,0)');ctx.fillStyle=glow;ctx.fillRect(1200,0,976,1088);ctx.restore();}
  const girl=layout.girl,cat=layout.cat;
  ctx.save();ctx.translate(girl.x,girl.y);ctx.scale(girl.width/512,girl.width/512);drawWardrobe(ctx,assets,config,time,{still:state.still,greetingAt:state.greeting,pointerX:state.pointer.x,pointerY:state.pointer.y,speaking:state.speaking});ctx.restore();
  ctx.save();ctx.translate(cat.x,cat.y);ctx.scale(cat.width/512,cat.width/512);drawCat(ctx,assets.cat,time,state.still,state.catGreeting,state.pointer.x);ctx.restore();
  // A slim foreground contact edge overlaps the last paw pixels; no gap above the table.
  ctx.save();ctx.beginPath();ctx.rect(0,desk+2,W,H-desk-2);ctx.clip();ctx.drawImage(plate,0,0,W,H);if(state.period!=='day'){ctx.fillStyle=state.period==='night'?'#25243f':'#efb17e';ctx.globalAlpha=state.period==='night'?.28:.12;ctx.fillRect(0,desk+2,W,H-desk-2);}ctx.restore();
  ctx.fillStyle='#44345428';for(const subject of [girl,cat])for(const fraction of [.35,.64]){ctx.beginPath();ctx.ellipse(subject.x+subject.width*fraction,desk+2.5,subject.width*.075,1.8,0,0,Math.PI*2);ctx.fill();}
  const {x,y,scale,height:paintHeight}=panoramaView(width,height),bottom=y+H*scale;
  if(paintHeight>H*scale)destination.drawImage(this.room,0,H-120,W,120,x,bottom-1,W*scale,height-bottom+1);
  destination.drawImage(this.room,x,y,W*scale,H*scale);return {x,y,scale};
 }
}
