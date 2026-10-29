<script lang="ts">
 import {onMount} from 'svelte';import {prefersReducedMotion} from 'svelte/motion';import {canvasContext,observeCanvas} from '../canvas';import {tunnelAt} from '../lightTunnel';
 let {startedAt,reduced=false,oncomplete}:{startedAt:number;reduced?:boolean;oncomplete:()=>void}=$props();let canvas:HTMLCanvasElement,loop:ReturnType<typeof observeCanvas>,completed=false;let level=$state(0),pointer={x:0,y:0},target={x:0,y:0},last=0;let palette={page:'#f8f6fd',accent:'#9b86c5',pink:'#e6a1c3'};
 const quiet=()=>reduced||prefersReducedMotion.current;
 function draw(now:number){if(completed)return;const state=tunnelAt(now-startedAt);level=state.opacity;if(quiet()||state.done){completed=true;oncomplete();return;}const c=canvasContext(canvas);if(!c)return;const dt=Math.min(50,now-(last||now));last=now;pointer.x+=(target.x-pointer.x)*(1-Math.exp(-dt/180));pointer.y+=(target.y-pointer.y)*(1-Math.exp(-dt/180));if(state.opacity<.001)return;
  const {ctx,width:w,height:h}=c,cx=w*(.5+pointer.x*.018),cy=h*(.43+pointer.y*.015),span=Math.hypot(w,h)*.7,t=state.progress,pixel=3;ctx.globalAlpha=state.opacity;ctx.fillStyle=palette.page;ctx.fillRect(0,0,w,h);
  const snap=(v:number)=>Math.round(v/pixel)*pixel;ctx.save();ctx.globalCompositeOperation='source-over';
  const halo=ctx.createRadialGradient(cx,cy,3,cx,cy,Math.min(w,h)*.23);halo.addColorStop(0,palette.pink);halo.addColorStop(1,palette.page);ctx.globalAlpha=state.opacity*.09;ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
  for(let i=0;i<14;i++){const angle=i*Math.PI*2/14,wave=Math.sin(i*2.1+t*1.6)*.03;ctx.strokeStyle=i%5===0?palette.pink:palette.accent;ctx.globalAlpha=state.opacity*.055;ctx.lineWidth=1;ctx.beginPath();for(let k=0;k<=15;k++){const depth=k/15,radius=Math.exp(depth*3.8-3.8)*span,twist=angle+wave*(1-depth),x=snap(cx+Math.cos(twist)*radius),y=snap(cy+Math.sin(twist)*radius*.68);if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
   const phase=((i*.271-t*.8)%1+1)%1,radius=Math.exp(phase*3.8-3.8)*span,x=snap(cx+Math.cos(angle)*radius),y=snap(cy+Math.sin(angle)*radius*.68),alpha=Math.sin(phase*Math.PI)**2;
   ctx.save();ctx.strokeStyle=i%5===0?palette.pink:palette.accent;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=7;ctx.lineWidth=i%5===0?2:1.5;ctx.globalAlpha=state.opacity*alpha*.6;ctx.beginPath();for(let k=0;k<=6;k++){const p=Math.min(1,phase+k*.014),r=Math.exp(p*3.8-3.8)*span,px=snap(cx+Math.cos(angle)*r),py=snap(cy+Math.sin(angle)*r*.68);if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.stroke();ctx.restore();
   ctx.globalAlpha=state.opacity*alpha*.85;ctx.fillStyle=i%5===0?'#e2b676':palette.accent;const size=i%4===0?6:3;ctx.fillRect(x,y,size,size);
  }
  for(let i=0;i<2;i++){const phase=((i/2-t*.3)%1+1)%1,scale=Math.exp(phase*3.1-3.1),rw=w*.65*scale,rh=h*.65*scale;ctx.globalAlpha=state.opacity*Math.sin(phase*Math.PI)**2*.06;ctx.strokeStyle=palette.accent;ctx.lineWidth=1;ctx.strokeRect(snap(cx-rw/2),snap(cy-rh/2),snap(rw),snap(rh));}
  ctx.restore();
 }
 $effect(()=>{reduced;prefersReducedMotion.current;loop?.invalidate();});
 onMount(()=>{const css=getComputedStyle(canvas);palette={page:css.getPropertyValue('--xy-page').trim()||palette.page,accent:css.getPropertyValue('--xy-accent').trim()||palette.accent,pink:css.getPropertyValue('--xy-pink').trim()||palette.pink};loop=observeCanvas(canvas,draw,quiet,60);const move=(event:PointerEvent)=>target={x:Math.max(-1,Math.min(1,event.clientX/innerWidth*2-1)),y:Math.max(-1,Math.min(1,event.clientY/innerHeight*2-1))};window.addEventListener('pointermove',move);return()=>{loop.destroy();window.removeEventListener('pointermove',move);};});
</script>
<div class="pixel-light-tunnel" aria-hidden="true" data-visible={level>.01}><canvas bind:this={canvas}></canvas></div>
<style>.pixel-light-tunnel{position:absolute;inset:0;z-index:45;pointer-events:none;filter:brightness(var(--xy-brightness,1))}.pixel-light-tunnel canvas{display:block;width:100%;height:100%}</style>
