<script lang="ts">
 import {prefersReducedMotion} from 'svelte/motion';
 let {liked,label,onchange,reduced=false}=$props<{liked:boolean;label:string;onchange:(liked:boolean)=>void;reduced?:boolean}>();
 let pulse=$state(0);const quiet=()=>reduced||prefersReducedMotion.current;
 function toggle(){onchange(!liked);pulse++;}
</script>
<button type="button" class="favorite-scene pulse-heart" class:liked class:quiet={quiet()} aria-label={(liked?'取消收藏':'收藏')+label} aria-pressed={liked} onclick={toggle}>
 {#key pulse}<span class="heart-glyph" class:beating={pulse>0&&!quiet()} aria-hidden="true"><svg width="23" height="23" viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M2 2h4v1h4V2h4v1h1v5h-1v2h-2v2h-2v2H6v-2H4v-2H2V8H1V3h1Z" fill={liked?'currentColor':'none'} stroke="currentColor" stroke-width="1"/></svg>{#if liked&&pulse>0&&!quiet()}<i class="square one"></i><i class="square two"></i><i class="square three"></i><i class="square four"></i>{/if}</span>{/key}
 <span>{liked?'已收藏':'收藏'}</span>
</button>
<style>
 .pulse-heart{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:96px;min-height:42px!important;padding:8px 12px!important;border:1px solid var(--xy-border)!important;border-radius:7px;background:color-mix(in srgb,var(--xy-page) 75%,transparent)!important;color:var(--xy-secondary);font-size:13px;transition:background-color .14s ease-out,color .14s ease-out,scale .14s ease-out}.pulse-heart.liked{color:var(--xy-pink);background:color-mix(in srgb,var(--xy-pink) 9%,var(--xy-panel))!important}.pulse-heart:active{scale:.96}.pulse-heart:focus-visible{outline:2px solid var(--xy-accent);outline-offset:3px}.heart-glyph{position:relative;display:grid;place-items:center;width:23px;height:23px;pointer-events:none}.beating>svg{animation:heart-pulse .52s cubic-bezier(.2,.7,.2,1)}.square{position:absolute;width:3px;height:3px;background:currentColor;opacity:0;animation:square-burst .5s ease-out}.one{--x:-10px;--y:-10px;left:0;top:1px}.two{--x:11px;--y:-9px;right:0;top:1px}.three{--x:-11px;--y:8px;left:0;bottom:0}.four{--x:11px;--y:9px;right:0;bottom:0}@keyframes heart-pulse{0%,100%{scale:1}40%{scale:.25}75%{scale:1.1}}@keyframes square-burst{0%,25%{opacity:0;translate:0 0}45%{opacity:.8}100%{opacity:0;translate:var(--x) var(--y)}}.quiet,.quiet .heart-glyph{transition:none}.quiet:active{scale:1}
</style>
