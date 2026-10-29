import {drawSceneryMotion} from './sceneryMotion';import {cover} from './canvas';import type {SceneSource} from './sceneLibrary';
export function drawScene(ctx:CanvasRenderingContext2D,image:SceneSource,scene:string,time:number,width:number,height:number,reduced=false){
  if(scene.startsWith('custom_')){const p=reduced||image instanceof HTMLVideoElement?0:Math.sin(time/17000)*.006;cover(ctx,image,-width*(.01+p),-height*.01,width*1.02,height*1.02);return;}
  drawSceneryMotion(ctx,image as HTMLImageElement,scene,time,width,height,reduced);
  const t=reduced?0:time/1000,s=width/700;
  ctx.save();ctx.scale(s,height/400);
  if(scene==='sakura'){
    for(let i=0;i<26;i++){
      const x=((i*83+t*(12+i%4))%820)-60+Math.sin(t*.8+i)*22,y=((i*41+t*(16+i%5))%470)-35;
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t+i)*.9+i*19.73);ctx.scale(1,Math.max(.22,Math.abs(Math.cos(t*.9+i))));ctx.fillStyle=i%2?'#ffc6dc':'#ffe3e9';ctx.beginPath();ctx.ellipse(0,0,3+i%3,2,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }else if(scene==='star_room'){
    for(let i=0;i<27;i++){ctx.globalAlpha=.25+.65*(.5+.5*Math.sin(t*(.5+i%3*.2)+i*2));ctx.fillStyle='#fff4d9';const x=37+(i*79%640),y=18+(i*37%140);ctx.fillRect(x,y,2,2);if(i%6===0){ctx.fillRect(x-2,y+1,6,1);ctx.fillRect(x+1,y-2,1,6);}}
    const p=(t%18)/1.2;if(p<1){ctx.globalAlpha=Math.sin(p*Math.PI)*.7;ctx.strokeStyle='#fff3e5';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(480-p*180,22+p*75);ctx.lineTo(520-p*180,5+p*75);ctx.stroke();}
  }else if(scene==='forest'){
    for(let i=0;i<12;i++){ctx.globalAlpha=.15+.35*(.5+.5*Math.sin(t*.7+i*1.9));ctx.fillStyle='#fff2a6';ctx.fillRect(120+i*43+Math.sin(t*.27+i)*14,150+i*17%180+Math.cos(t*.33+i)*9,2,2);}
  }else if(scene==='lighthouse'){
    ctx.globalAlpha=.12+.1*(.5+.5*Math.sin(t*.45));ctx.fillStyle='#fff3bb';ctx.fillRect(80,50,14,10);
  }else if(scene==='sunset'||scene==='city'||scene==='island'){
    if(scene==='city'){for(let i=0;i<14;i++){ctx.globalAlpha=.08+.18*(.5+.5*Math.sin(t*.45+i*1.9));ctx.fillStyle='#ffd790';ctx.fillRect(30+i*47,170+(i*23%90),3,5);}}
    if(scene==='island'){for(let i=0;i<7;i++){ctx.globalAlpha=.55;ctx.fillStyle='#b2ca88';const x=(i*119+t*13)%760-30,y=120+(i*31+t*6)%200;ctx.save();ctx.translate(x,y);ctx.rotate(t*.6+i);ctx.fillRect(-3,-1,6,2);ctx.restore();}}
  }
  if(scene==='warm_room'||scene==='island'){
    for(let i=0;i<10;i++){ctx.globalAlpha=.2+.16*Math.sin(t+i);ctx.fillStyle='#fff7ce';ctx.fillRect((i*73+t*3)%700,130+(i*31+t*4)%230,2,2);}
  }
  ctx.restore();
}
