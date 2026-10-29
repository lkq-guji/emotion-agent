<script lang="ts">
 import {onMount,untrack} from 'svelte';import {prefersReducedMotion} from 'svelte/motion';import {canvasContext,observeCanvas} from '../canvas';
 let {reduced=false}:{reduced?:boolean}=$props();let canvas:HTMLCanvasElement,loop:ReturnType<typeof observeCanvas>,parent:HTMLElement;
 let hot=false,focused=false,alive=true,presence=0,last=0,time=0,running=$state(false),origin={x:0,y:0},pointer={x:0,y:0},pulse=-1,colors:string[]=[];
 let quiet=$derived(reduced||prefersReducedMotion.current);
 function palette(){if(!parent)return;const style=getComputedStyle(parent);colors=['--xy-card-spark','--xy-pink','--xy-warm'].map(key=>style.getPropertyValue(key).trim());}
 function activate(value:boolean,event?:PointerEvent){hot=value;if(event){const b=parent.getBoundingClientRect();origin={x:event.clientX-b.left,y:event.clientY-b.top};pointer={...origin};}if(value)palette();running=true;loop?.invalidate();}
 function draw(now:number){const c=canvasContext(canvas);if(!c)return;const {ctx,width:w,height:h}=c,dt=Math.min(50,now-(last||now));last=now;time+=dt;
  if(quiet){presence=0;running=false;return;}const target=hot||focused?1:0;presence+=(target-presence)*(1-Math.exp(-dt/(target?160:110)));if(!target&&presence<.005){presence=0;running=false;return;}
  const age=pulse<0?Infinity:now-pulse,reach=Math.max(w,h),radius=age*.65;
  const glow=ctx.createRadialGradient(pointer.x,pointer.y,0,pointer.x,pointer.y,210);glow.addColorStop(0,(colors[2]||'#d6a473')+'12');glow.addColorStop(1,'transparent');ctx.globalAlpha=presence;ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  for(let x=7;x<w;x+=13)for(let y=7;y<h;y+=13){
   const index=Math.round(x*17+y*31),edge=Math.min(x,w-x,y,h-y),rim=1-.96*Math.min(1,edge/(h*.32)),distance=Math.hypot(x-pointer.x,y-pointer.y),near=Math.max(0,1-distance/145),reveal=Math.min(1,Math.max(0,presence*1.35-Math.hypot(x-origin.x,y-origin.y)/Math.max(w,h)*.25)),wave=Math.max(0,1-Math.abs(Math.max(Math.abs(x-pointer.x),Math.abs(y-pointer.y))-radius)/19)*Math.max(0,1-age/520);
   const size=(1.05+.55*Math.sin(time*.0018+index))*(1+near*.45+wave),alpha=Math.min(.3,(.1+near*.13)*rim*reveal+wave*.16);if(alpha<.008)continue;ctx.globalAlpha=alpha;ctx.fillStyle=colors[index%3]||'#b298cc';ctx.fillRect(Math.round(x-size/2),Math.round(y-size/2),size,size);
  }ctx.globalAlpha=1;if(!target&&presence===0&&age>reach/.65)running=false;
 }
 $effect(()=>{quiet;untrack(()=>{running=true;loop?.invalidate();});});
 onMount(()=>{parent=canvas.closest<HTMLElement>('.xy-panel')!;parent.dataset.pixelCard='true';palette();loop=observeCanvas(canvas,draw,()=>quiet||!running,40);
  const enter=(e:PointerEvent)=>activate(true,e),leave=()=>activate(false),move=(e:PointerEvent)=>{const b=parent.getBoundingClientRect();pointer={x:e.clientX-b.left,y:e.clientY-b.top};},focus=()=>{focused=true;const b=parent.getBoundingClientRect();origin=pointer={x:b.width/2,y:b.height/2};activate(true);},blur=(e:FocusEvent)=>{if(!parent.contains(e.relatedTarget as Node))queueMicrotask(()=>{if(alive){focused=false;activate(false);}});},click=(e:MouseEvent)=>{if(quiet)return;const b=parent.getBoundingClientRect();pointer={x:e.detail?e.clientX-b.x:b.width/2,y:e.detail?e.clientY-b.y:b.height/2};pulse=performance.now();running=true;loop.invalidate();};
  const keyboardClick=(e:MouseEvent)=>{if(e.detail===0)click(e);};parent.addEventListener('pointerenter',enter);parent.addEventListener('pointerleave',leave);parent.addEventListener('pointermove',move,{passive:true});parent.addEventListener('focusin',focus);parent.addEventListener('focusout',blur);parent.addEventListener('pointerdown',click);parent.addEventListener('click',keyboardClick);return()=>{alive=false;loop.destroy();delete parent.dataset.pixelCard;parent.removeEventListener('pointerenter',enter);parent.removeEventListener('pointerleave',leave);parent.removeEventListener('pointermove',move);parent.removeEventListener('focusin',focus);parent.removeEventListener('focusout',blur);parent.removeEventListener('pointerdown',click);parent.removeEventListener('click',keyboardClick);};
 });
</script>
<span class="pixel-card-effect" aria-hidden="true" data-quiet={quiet} data-running={running}><canvas bind:this={canvas}></canvas></span>
<style>.pixel-card-effect{position:absolute;inset:0;z-index:-1;overflow:hidden;border-radius:inherit;pointer-events:none}.pixel-card-effect canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.pixel-card-effect[data-quiet=true]{display:none}</style>
