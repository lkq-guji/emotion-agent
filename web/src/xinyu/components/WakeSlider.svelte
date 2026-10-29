<script lang="ts">
 import {onMount} from 'svelte';import {prefersReducedMotion} from 'svelte/motion';
 let {id,value=$bindable(5),min=0,max=10,reduced=false}=$props<{id:string;value?:number;min?:number;max?:number;reduced?:boolean}>();
 let root:HTMLDivElement,frame=0,head=0,target=0,amplitude=0,last=0,lastInput=0,direction=1,alive=true;
 const bars=33;const quiet=()=>reduced||prefersReducedMotion.current;
 function paint(){if(!root)return;root.querySelectorAll<HTMLElement>('.wake-bar').forEach((bar,index)=>{const d=index-head*(bars-1),reach=d*direction<0?7:3,lift=quiet()?0:amplitude*Math.max(0,1-Math.abs(d)/reach)**2;bar.style.transform=`scaleY(${.24+lift*.72})`;bar.dataset.on=String(index<=Math.round(target*(bars-1)));});}
 function run(now:number){frame=0;if(!alive)return;const dt=Math.min(50,now-(last||now));last=now;head+=(target-head)*(1-Math.exp(-dt/65));amplitude*=Math.exp(-dt/145);paint();if(!quiet()&&(Math.abs(target-head)>.0005||amplitude>.005))frame=requestAnimationFrame(run);}
 function schedule(){if(!frame&&alive){last=0;frame=requestAnimationFrame(run);}}
 function input(event:Event){const next=Number((event.currentTarget as HTMLInputElement).value),now=performance.now(),delta=next-value;direction=Math.sign(delta)||direction;amplitude=Math.min(.9,.2+Math.abs(delta)/Math.max(16,now-lastInput)*80);lastInput=now;value=next;}
 $effect(()=>{target=(Number(value)-min)/(max-min||1);if(quiet()){head=target;amplitude=0;paint();}else schedule();});
 onMount(()=>{head=(value-min)/(max-min||1);paint();return()=>{alive=false;cancelAnimationFrame(frame);};});
</script>
<div class="wake-slider" class:quiet={quiet()} bind:this={root} data-value={value}>
 <div class="wake-bars" aria-hidden="true">{#each Array(bars) as _,i}<span class="wake-bar" data-on={i<=Math.round((value-min)/(max-min||1)*(bars-1))}></span>{/each}</div>
 <input {id} type="range" {min} {max} step="1" {value} oninput={input} onkeydown={()=>{amplitude=0;head=target;}}/>
 <div class="wake-scale" aria-hidden="true"><span>{min} · 很轻</span><span>{max} · 很强</span></div>
</div>
<style>
 .wake-slider{position:relative;margin:4px 0 12px;padding:5px 9px 22px;border-radius:7px;background:color-mix(in srgb,var(--xy-page) 70%,transparent);border:1px solid var(--xy-border)}.wake-bars{height:50px;display:flex;align-items:center;gap:5px}.wake-bar{flex:1;min-width:2px;height:44px;background:var(--xy-border);transform:scaleY(.24);transform-origin:center;border-radius:1px;transition:background-color .12s ease-out}.wake-bar[data-on=true]{background:var(--xy-accent)}.wake-slider input[type=range]{position:absolute;inset:0 0 20px;width:100%;height:60px;min-height:0!important;margin:0!important;padding:0!important;opacity:0;cursor:ew-resize}.wake-slider:has(input:focus-visible){outline:2px solid var(--xy-accent);outline-offset:3px}.wake-scale{display:flex;justify-content:space-between;font-size:11px;color:var(--xy-secondary);position:absolute;bottom:5px;left:9px;right:9px}.quiet .wake-bar{transform:scaleY(.24)!important;transition:none}
</style>
