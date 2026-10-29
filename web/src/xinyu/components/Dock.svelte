<script lang="ts">
 import {onMount,tick} from 'svelte';import {Spring,prefersReducedMotion} from 'svelte/motion';import PixelIcon from './PixelIcon.svelte';import {routes,routeHref} from '../navigation';
 let {page,reduced=false,autoHide=false}:{page:string;reduced?:boolean;autoHide?:boolean}=$props();let scroll:HTMLDivElement,shell:HTMLDivElement;
 const sizes=routes.map(()=>new Spring(1,{stiffness:.16,damping:.8,precision:.001}));
 let fine=$state(false),moreLeft=$state(false),moreRight=$state(false),revealed=$state(false),hideTimer:ReturnType<typeof setTimeout>;
 let expanded=$derived(!autoHide||revealed);
 function show(){clearTimeout(hideTimer);revealed=true;}
 function closeLater(){clearTimeout(hideTimer);hideTimer=setTimeout(()=>{const focus=document.activeElement;if(!shell?.matches(':hover')&&!(focus instanceof HTMLElement&&shell?.contains(focus)&&focus.matches(':focus-visible')))revealed=false;},300);}
 function edges(){if(scroll){moreLeft=scroll.scrollLeft>2;moreRight=scroll.scrollLeft+scroll.clientWidth<scroll.scrollWidth-2;}}
 function revealLink(link:HTMLElement){if(!scroll)return;const viewport=scroll.getBoundingClientRect(),item=link.getBoundingClientRect();if(item.left<viewport.left)scroll.scrollBy({left:item.left-viewport.left,behavior:'instant'});else if(item.right>viewport.right)scroll.scrollBy({left:item.right-viewport.right,behavior:'instant'});}
 function rest(){sizes.forEach(size=>{void size.set(1,{instant:reduced||prefersReducedMotion.current||!fine});});}
 function magnify(x:number){if(!fine||reduced||prefersReducedMotion.current)return;const links=scroll.querySelectorAll<HTMLAnchorElement>('a');links.forEach((link,i)=>{const box=link.getBoundingClientRect(),distance=Math.min(1,Math.abs(box.x+box.width/2-x)/112);sizes[i].target=1+.28*Math.cos(distance*Math.PI/2)**2;});}
 function key(event:KeyboardEvent,index:number){const next=event.key==='ArrowRight'?(index+1)%routes.length:event.key==='ArrowLeft'?(index+routes.length-1)%routes.length:event.key==='Home'?0:event.key==='End'?routes.length-1:-1;if(next<0)return;event.preventDefault();const link=scroll.querySelectorAll<HTMLAnchorElement>('a')[next];link.focus({preventScroll:true});revealLink(link);}
 function hop(event:MouseEvent){if(reduced||prefersReducedMotion.current||!fine)return;const icon=(event.currentTarget as HTMLElement).querySelector('.dock-art')!;icon.getAnimations().forEach(a=>a.cancel());icon.animate([{translate:'0 0'},{translate:'0 -9px',offset:.4},{translate:'0 0'}],{duration:300,easing:'cubic-bezier(.2,0,0,1)'});}
 $effect(()=>{page;void tick().then(()=>{const selected=scroll?.querySelector<HTMLElement>('[aria-current=page]');if(selected)revealLink(selected);edges();});});
 $effect(()=>{if(reduced||prefersReducedMotion.current)rest();});
 onMount(()=>{const media=matchMedia('(hover:hover) and (min-width:721px)'),sync=()=>{fine=media.matches;rest();edges();};sync();media.addEventListener('change',sync);const resize=new ResizeObserver(edges);resize.observe(scroll);return()=>{clearTimeout(hideTimer);media.removeEventListener('change',sync);resize.disconnect();sizes.forEach(size=>void size.set(1,{instant:true}));};});
</script>
<div class="dock-shell" role="presentation" bind:this={shell} data-auto-hide={autoHide} data-state={expanded?'visible':'hidden'} onpointerenter={()=>{if(autoHide)show();}} onpointerleave={()=>{rest();if(autoHide)closeLater();}} onfocusin={event=>{if(autoHide&&event.target instanceof HTMLElement&&event.target.matches(':focus-visible'))show();}} onfocusout={()=>{if(autoHide)closeLater();}}>
 {#if autoHide}<div class="dock-sensor"><button type="button" class="dock-trigger" aria-label="显示底部导航" aria-controls="xinyu-main-dock" aria-expanded={expanded} onclick={show}><span aria-hidden="true"></span></button></div>{/if}
<nav id="xinyu-main-dock" class="pixel-dock" aria-label="主导航" data-more-left={moreLeft} data-more-right={moreRight} inert={!expanded} aria-hidden={!expanded}>
 <div class="dock-items" role="toolbar" tabindex="-1" aria-label="页面切换" aria-orientation="horizontal" bind:this={scroll} onscroll={edges} onpointermove={event=>{if(event.pointerType==='mouse')magnify(event.clientX);}} onpointerleave={rest}>
  {#each routes as item,index}<a href={routeHref(item.id)} class:active={page===item.id} aria-label={item.label} aria-current={page===item.id?'page':undefined} onkeydown={event=>key(event,index)} onfocus={event=>{const target=event.currentTarget;revealLink(target);if(target.matches(':focus-visible')){const r=target.getBoundingClientRect();magnify(r.x+r.width/2);}}} onblur={rest} onclick={hop}>
   <span class="dock-tile" style:transform={'scale('+sizes[index].current+')'}><span class="dock-art"><PixelIcon src={'/xinyu/art/nav_'+(index+1)+'.png'} size={32}/></span></span><span class="dock-name">{item.label}</span><i aria-hidden="true"></i>
  </a>{/each}
 </div>
 <svg class="dock-edge edge-left" aria-hidden="true" width="12" height="16" viewBox="0 0 12 16"><path d="m8 3-5 5 5 5" stroke="currentColor" stroke-width="2" fill="none"/></svg><svg class="dock-edge edge-right" aria-hidden="true" width="12" height="16" viewBox="0 0 12 16"><path d="m4 3 5 5-5 5" stroke="currentColor" stroke-width="2" fill="none"/></svg>
</nav>
</div>
<style>
 .dock-shell{position:absolute;bottom:0;left:50%;translate:-50% 0;width:min(640px,calc(100% - 24px));height:110px;z-index:25;pointer-events:none}
 .pixel-dock{position:absolute;bottom:max(10px,env(safe-area-inset-bottom));left:50%;translate:-50% 0;width:max-content;max-width:100%;pointer-events:auto;background:color-mix(in srgb,var(--xy-panel) 94%,transparent);border:1px solid var(--xy-border);border-radius:12px;box-shadow:0 7px 22px color-mix(in srgb,var(--xy-ink) 12%,transparent);backdrop-filter:blur(12px);filter:brightness(var(--xy-brightness,1));transition:opacity .18s ease,transform .18s ease,visibility 0s linear}
 .dock-shell[data-state=hidden] .pixel-dock{transform:translateY(calc(100% + 16px));opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease,transform .18s ease,visibility 0s linear .18s}
 .dock-sensor{position:absolute;inset:auto 0 0;height:20px;pointer-events:auto;display:flex;justify-content:center;align-items:end}
 .dock-trigger{position:relative;display:grid;place-items:end center;width:68px;height:40px;border:0;border-radius:8px 8px 0 0;background:transparent;color:var(--xy-secondary);cursor:pointer}
 .dock-trigger::before{content:'';position:absolute;inset:auto 0 0;height:20px;border-radius:8px 8px 0 0;background:color-mix(in srgb,var(--xy-panel) 80%,transparent)}
 .dock-trigger span{position:relative;margin-bottom:8px;width:28px;height:3px;border-radius:2px;background:currentColor;opacity:.7}
 .dock-trigger:focus-visible{outline:2px solid var(--xy-accent);outline-offset:-2px}
 @media(prefers-reduced-motion:reduce){.pixel-dock{transition:none!important}}
 .dock-items{display:flex;gap:4px;max-width:100%;padding:13px 12px 8px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;scroll-padding-inline:12px;overscroll-behavior-x:contain;touch-action:pan-x}
 .dock-items::-webkit-scrollbar{display:none}
 .dock-items a{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:end;flex:0 0 60px;gap:3px;height:60px;min-height:44px;padding:0 0 6px;color:var(--xy-secondary);border-radius:7px;outline-offset:-2px;touch-action:pan-x}
 .dock-tile{display:grid;place-items:center;width:38px;height:36px;transform-origin:50% 100%;background:transparent;border-radius:6px}
 .dock-art{display:grid;place-items:center}
 .dock-name{font-size:12px;line-height:16px;white-space:nowrap;color:var(--xy-ink)}
 .dock-items a.active .dock-tile{background:var(--xy-selected)}
 .dock-items a.active .dock-name{font-weight:700}
 .dock-items a>i{position:absolute;bottom:0;width:4px;height:4px;background:transparent}
 .dock-items a.active>i{background:var(--xy-accent)}
 .dock-items a:hover,.dock-items a:focus-visible{background:color-mix(in srgb,var(--xy-selected) 40%,transparent)}
 .dock-edge{position:absolute;top:50%;translate:0 -50%;pointer-events:none;display:none;color:var(--xy-ink);background:var(--xy-panel)}.edge-left{left:1px}.edge-right{right:1px}.pixel-dock[data-more-left=true] .edge-left,.pixel-dock[data-more-right=true] .edge-right{display:block}
 @media(max-width:720px){.pixel-dock{max-width:calc(100% - 16px);bottom:max(8px,env(safe-area-inset-bottom))}.dock-items{padding:7px 10px 6px;gap:2px}.dock-items a{flex-basis:52px;height:59px}.dock-tile{height:34px}.dock-name{font-size:12px}}
</style>
