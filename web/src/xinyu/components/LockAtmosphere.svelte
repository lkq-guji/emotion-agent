<script lang="ts">
 import {onMount} from 'svelte';
 import {canvasContext,loadPicture,observeCanvas} from '../canvas';
 import {companion} from '../state.svelte';
 let {night=false}=$props<{night?:boolean}>();
 let canvas:HTMLCanvasElement,image:HTMLImageElement,loop:ReturnType<typeof observeCanvas>,lit=$state(true),systemReduced=$state(false),message=$state('轻点灯塔，给小岛留一盏灯。');
 let pointer={x:0,y:0},target={x:0,y:0},last=0;
 const still=()=>systemReduced||companion.data.preferences.reduceMotion;
 function move(event:PointerEvent){if(event.pointerType==='touch')return;const rect=canvas.getBoundingClientRect();target={x:(event.clientX-rect.left)/rect.width-.5,y:(event.clientY-rect.top)/rect.height-.5};}
 function toggle(){lit=!lit;message=lit?'灯亮着，安心慢慢来。':'小岛休息一会儿，轻点可以再亮起。';loop?.invalidate();}
 function draw(t:number){if(!image)return;const c=canvasContext(canvas);if(!c)return;const dt=Math.min(50,t-(last||t));last=t;const follow=1-Math.exp(-dt/160);pointer.x+=(target.x-pointer.x)*follow;pointer.y+=(target.y-pointer.y)*follow;
  const scale=Math.min(c.width*.94/image.width,c.height*.88/image.height),w=image.width*scale,h=image.height*scale,x=(c.width-w)/2+(still()?0:pointer.x*12),y=(c.height-h)/2+(still()?0:Math.sin(t/1700)*4+pointer.y*6);
  c.ctx.imageSmoothingEnabled=true;c.ctx.drawImage(image,x,y,w,h);
  if(lit){const cx=x+w*.553,cy=y+h*.18,r=Math.max(18,w*.05),glow=c.ctx.createRadialGradient(cx,cy,0,cx,cy,r);glow.addColorStop(0,night?'#ffe5a9d9':'#ffeac7b3');glow.addColorStop(1,'#ffeac700');c.ctx.fillStyle=glow;c.ctx.fillRect(cx-r,cy-r,r*2,r*2);c.ctx.fillStyle='#fff1bb';c.ctx.fillRect(cx-4,cy-3,8,6);}
 }
 $effect(()=>{night;lit;systemReduced;loop?.invalidate();});
 onMount(()=>{let active=true;const media=matchMedia('(prefers-reduced-motion: reduce)'),changed=()=>systemReduced=media.matches;changed();media.addEventListener('change',changed);loop=observeCanvas(canvas,draw,still,0);void loadPicture('/xinyu/generated/sidebar-island-v3.png').then(value=>{if(active){image=value;loop.invalidate();}});return()=>{active=false;loop.destroy();media.removeEventListener('change',changed);};});
</script>
<div class="lock-island"><button aria-label={lit?'让灯塔休息':'点亮回家的灯'} aria-pressed={lit} onclick={toggle} onpointermove={move} onpointerleave={()=>target={x:0,y:0}}><canvas bind:this={canvas} aria-hidden="true"></canvas></button><p role="status">{message}</p></div>
<style>.lock-island{width:100%;max-width:660px;margin:auto}.lock-island button{display:block;width:100%;padding:0;border:0;background:transparent;color:inherit;cursor:pointer;border-radius:16px;touch-action:manipulation}.lock-island button:focus{outline:none}.lock-island button:focus-visible{box-shadow:0 0 0 3px var(--xy-accent)}.lock-island canvas{display:block;width:100%;height:clamp(230px,40vw,430px)}p{font-size:14px;line-height:1.8;color:var(--xy-secondary);text-align:center;margin:0 16px}@media(max-width:760px){.lock-island canvas{height:210px}.lock-island p{font-size:12px}}</style>
