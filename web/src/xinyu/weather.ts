import {drawPixelSnow,type SnowPointer} from './pixelSnow';
export type Weather='sunny'|'rain'|'snow';
export type WeatherMode=Weather|'auto';
export function weatherMode(value:unknown):WeatherMode{return value==='sunny'||value==='rain'||value==='snow'?value:'auto';}
export function resolveWeather(mode:unknown,at=Date.now()):Weather{const selected=weatherMode(mode);return selected==='auto'?weatherAt(at):selected;}
// One ten-minute weather interval: 75% sun, 17% rain, 8% snow.
// Deterministic by interval so every room sees the same weather without resetting on navigation.
export function weatherAt(at=Date.now()):Weather{let n=Math.floor(at/600000)|0;n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);const p=((n^(n>>>16))>>>0)/4294967296;return p<.75?'sunny':p<.92?'rain':'snow';}
export function lightAt(night:boolean,at=Date.now()):'day'|'dusk'|'night'{const h=new Date(at).getHours();return night?'night':h>=16&&h<19?'dusk':'day';}

function random(seed:number){let n=Math.imul(seed^(seed>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;}

// Independent lifetimes, gaps and depth keep the rain from reading as a tiled overlay.
export function rainDrops(time:number,width:number,height:number,intensity=.16){
 const t=time/1000,amount=Math.max(0,Math.min(1,intensity)),coverage=.12+amount*.88;
 return Array.from({length:Math.max(72,Math.min(720,Math.round(width*height/2400)))},(_,i)=>{
  const visibility=Math.max(0,Math.min(1,(coverage-random(i*139+47))/.07));if(!visibility)return null;
  const depth=random(i*71+19),speed=height*(.32+depth*.3)+16,travel=(height+12)/speed;
  const period=travel+.35+random(i*89+31)*1.1,age=t+random(i*97+5)*period;
  const cycle=Math.floor(age/period),phase=age-cycle*period;
  if(phase>travel)return null;
  const seed=i*113+cycle*3541;
  return {x:random(seed+501)*width+Math.sin(t*.35+i)*1.5,y:phase*speed-6,
   length:(1.5+depth*2.4+random(seed+11))*(.8+amount*.9),lean:(.15+depth*.7)*(1+amount*.7),alpha:(.14+depth*.28)*visibility};
 }).filter((drop):drop is NonNullable<typeof drop>=>drop!==null);
}

export function drawWeather(c:CanvasRenderingContext2D,weather:Weather,time:number,w:number,h:number,still=false,options:{light?:'day'|'dusk'|'night';pointer?:SnowPointer;intensity?:number}={}){
 const intensity=Math.max(0,Math.min(1,options.intensity??.16));
 c.save();
 if(weather==='sunny'){if(options.light!=='night'){const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#fff1bb18');g.addColorStop(1,'#fff1bb00');c.fillStyle=g;c.fillRect(0,0,w,h);}}
 else if(weather==='rain'){
  const scale=Math.max(1,w/700);c.fillStyle=options.light==='night'?'#1d2a48':'#283a62';c.globalAlpha=.035+intensity*.1;c.fillRect(0,0,w,h);c.strokeStyle='#d5e5f7';c.lineWidth=.65*scale;
  for(const drop of rainDrops(still?0:time,w,h,intensity)){
   c.globalAlpha=drop.alpha;c.beginPath();c.moveTo(drop.x,drop.y);c.lineTo(drop.x-drop.lean*scale,drop.y+drop.length*scale);c.stroke();
  }
 }else{c.fillStyle=options.light==='night'?'#c9ddff':'#dfebff';c.globalAlpha=.03+intensity*.08;c.fillRect(0,0,w,h);c.globalAlpha=1;drawPixelSnow(c,time,w,h,still,options.pointer,intensity);}c.restore();
}
