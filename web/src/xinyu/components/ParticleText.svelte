<script lang="ts">
 import {onMount} from 'svelte';import {prefersReducedMotion} from 'svelte/motion';
 let {text='心屿智伴',reduced=false,large=false,brand=false,href=''}:{text?:string;reduced?:boolean;large?:boolean;brand?:boolean;href?:string}=$props();
 let button:HTMLElement,canvas:HTMLCanvasElement,ready=$state(false),running=$state(false),count=$state(0);
 let aim:(x:number,y:number,burst?:boolean)=>void=()=>{},leave:()=>void=()=>{},quiet:(value:boolean)=>void=()=>{};
 $effect(()=>quiet(reduced||prefersReducedMotion.current));
 onMount(()=>{
  const ctx=canvas.getContext('2d');if(!ctx)return;
  type Dot={x:number;y:number;homeX:number;homeY:number;vx:number;vy:number};
  let dots:Dot[]=[],raf=0,alive=true,visible=true,last=0,still=reduced||prefersReducedMotion.current,px=-1000,py=-1000,pressed=0;
  let width=0,height=0,dpr=1,ink='',accent='';
  const paint=()=>{ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);for(const dot of dots){ctx.fillStyle=Math.hypot(dot.x-dot.homeX,dot.y-dot.homeY)>2?accent:ink;ctx.fillRect(Math.round(dot.x),Math.round(dot.y),1.7,1.7);}};
  function stop(){cancelAnimationFrame(raf);raf=0;running=false;}
  function frame(now:number){raf=0;if(!alive||document.hidden||!visible)return;const dt=Math.min(32,now-(last||now))/1000||1/60;last=now;let moving=false;
   for(const dot of dots){let tx=dot.homeX,ty=dot.homeY;const dx=tx-px,dy=ty-py,dist=Math.hypot(dx,dy);if(!still&&dist>0&&dist<38){const push=(1-dist/38)**2*7;tx+=dx/dist*push;ty+=dy/dist*push;}
    dot.vx*=Math.exp(-dt*12);dot.vy*=Math.exp(-dt*12);dot.x+=(tx-dot.x)*(1-Math.exp(-dt*16))+dot.vx*dt;dot.y+=(ty-dot.y)*(1-Math.exp(-dt*16))+dot.vy*dt;
    if(Math.abs(tx-dot.x)+Math.abs(ty-dot.y)>.08||Math.abs(dot.vx)+Math.abs(dot.vy)>1)moving=true;else{dot.x=tx;dot.y=ty;dot.vx=dot.vy=0;}
   }paint();if(moving&&!still&&now-pressed<2200){running=true;raf=requestAnimationFrame(frame);}else running=false;
  }
  function wake(){if(!raf&&alive&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(frame);}}
  const sample=()=>{if(!alive)return;const rect=button.getBoundingClientRect();width=Math.round(rect.width);height=Math.round(rect.height);dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);const css=getComputedStyle(button);ink=css.color;accent=getComputedStyle(button.closest('.xinyu-app,.xy-lock')!).getPropertyValue('--xy-pink').trim();const off=document.createElement('canvas');off.width=width;off.height=height;const c=off.getContext('2d',{willReadFrequently:true});if(!c)return;c.font=`${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;c.textAlign='center';const m=c.measureText(text);c.fillStyle='white';c.fillText(text,width/2,(height+m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);const image=c.getImageData(0,0,width,height);dots=[];for(let y=1;y<height-1;y+=1.5)for(let x=1;x<width-1;x+=1.5)if(image.data[(Math.floor(y)*width+Math.floor(x))*4+3]>125)dots.push({x,y,homeX:x,homeY:y,vx:0,vy:0});count=dots.length;ready=!!count;paint();};
  aim=(x,y,burst=false)=>{if(still)return;px=x;py=y;pressed=performance.now();if(burst)for(const [i,dot]of dots.entries()){const dx=dot.x-x,dy=dot.y-y,dist=Math.max(4,Math.hypot(dx,dy));dot.vx=dx/dist*(60+(i%11)*3);dot.vy=dy/dist*(60+(i%7)*3);}wake();};
  leave=()=>{px=py=-1000;pressed=performance.now();wake();};
  quiet=value=>{still=value;if(still){stop();dots.forEach(p=>{p.x=p.homeX;p.y=p.homeY;p.vx=p.vy=0;});paint();}};
  const visibility=()=>{if(document.hidden)stop();else{pressed=performance.now();wake();}};
  const resize=new ResizeObserver(sample);resize.observe(button);const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(!visible)stop();else wake();});intersection.observe(button);
  const theme=new MutationObserver(()=>{const css=getComputedStyle(button);ink=css.color;accent=getComputedStyle(button.closest('.xinyu-app,.xy-lock')!).getPropertyValue('--xy-pink').trim();paint();});theme.observe(button.closest('.xinyu-app,.xy-lock')!,{attributes:true,attributeFilter:['data-theme']});
  void document.fonts.ready.then(()=>{if(alive)sample();});document.addEventListener('visibilitychange',visibility);sample();
  return()=>{alive=false;stop();resize.disconnect();intersection.disconnect();theme.disconnect();document.removeEventListener('visibilitychange',visibility);aim=()=>{};leave=()=>{};quiet=()=>{};};
 });
</script>
<svelte:element this={href?'a':'button'} bind:this={button} type={href?undefined:'button'} href={href||undefined} role={href?'link':'button'} class="particle-title" class:large class:brand aria-label={href?text+'，返回首页':text+'，点击点亮像素文字'} title="点击，让星光聚成心屿" data-particles={count} data-running={running} onpointermove={event=>{if(event.pointerType==='mouse'){const r=button.getBoundingClientRect();aim(event.clientX-r.left,event.clientY-r.top);}}} onpointerleave={()=>leave()} onclick={event=>{const r=button.getBoundingClientRect();aim(event.detail?event.clientX-r.left:r.width/2,event.detail?event.clientY-r.top:r.height/2,true);}}>
 <span class:sampled={ready}>{text}</span><canvas bind:this={canvas} aria-hidden="true"></canvas>
</svelte:element>
<style>.particle-title{position:relative;display:inline-block;flex:none;width:144px;height:48px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--xy-ink);font:750 28px/1.4 'Noto Sans SC','Microsoft YaHei',sans-serif;letter-spacing:0;touch-action:manipulation}.particle-title>span{font:inherit}.sampled{opacity:0}.particle-title canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated}@media(max-width:720px){.particle-title{width:112px;height:44px;font-size:24px}}.particle-title.large{width:min(100%,540px);height:66px;font-size:clamp(20px,2.2vw,32px)}.particle-title:focus:not(:focus-visible){outline:none}.particle-title.brand{width:208px;height:66px;font-size:40px}</style>
