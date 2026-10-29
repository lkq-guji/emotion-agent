<script lang="ts">
 import {prefersReducedMotion} from 'svelte/motion';
 let {text,pulse=0,reduced=false}=$props<{text:string;pulse?:number;reduced?:boolean}>();
 let mounted=$state(false);$effect(()=>{mounted=true;});
</script>
<span class="split-flap" aria-hidden="true" class:quiet={reduced||prefersReducedMotion.current}>
 {#key text+'-'+pulse}{#each Array.from(text) as letter,index}<span class="flap-tile" class:flipping={mounted&&(pulse>0||text.includes('开门'))} style:--flap-delay={index*22+'ms'}><span class="flap-half top"><span>{letter}</span></span><span class="flap-half bottom"><span>{letter}</span></span><span class="flap-half front"><span>{letter}</span></span><span class="flap-half back"><span>{letter}</span></span></span>{/each}{/key}
</span>
<style>
 .split-flap{pointer-events:none;display:inline-flex;gap:1px;white-space:nowrap;vertical-align:middle}.flap-tile{position:relative;display:inline-block;width:1em;height:1.35em;perspective:160px;isolation:isolate}.flap-half{position:absolute;left:0;width:100%;height:50%;overflow:hidden;background:color-mix(in srgb,#f2bfd2 94%,white);backface-visibility:hidden}.flap-half>span{position:absolute;left:0;width:100%;height:200%;display:grid;place-items:center;font:inherit;line-height:1.35}.top,.front{top:0}.bottom,.back{bottom:0}.top>span,.front>span{top:0}.bottom>span,.back>span{bottom:0}.front{transform-origin:center bottom;z-index:3;visibility:hidden}.back{transform-origin:center top;transform:rotateX(90deg);z-index:4;visibility:hidden}.flap-tile::after{content:'';position:absolute;left:1px;right:1px;top:50%;height:1px;background:#7c52761c;pointer-events:none}.flipping .front{visibility:visible;animation:flap-front .36s var(--flap-delay) ease-in both}.flipping .back{visibility:visible;animation:flap-back .36s var(--flap-delay) ease-out both}@keyframes flap-front{0%{transform:rotateX(0);filter:brightness(1)}50%,100%{transform:rotateX(-90deg);filter:brightness(.78)}}@keyframes flap-back{0%,50%{transform:rotateX(90deg);filter:brightness(.8)}100%{transform:rotateX(0);filter:brightness(1)}}.quiet .front,.quiet .back{display:none}.quiet .flap-tile::after{display:none}
</style>
