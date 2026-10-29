<script lang="ts">
 import {loadWardrobe,drawWardrobe,presetWardrobe,normalizeWardrobe} from '../wardrobe';import {companion} from '../state.svelte';
 let {tone='lilac'}=$props<{tone?:string}>();let canvas:HTMLCanvasElement;
 $effect(()=>{const config=tone==='custom'?normalizeWardrobe(companion.data.preferences.customAvatar):presetWardrobe(tone);let active=true;void loadWardrobe().then(assets=>{if(!active)return;const ctx=canvas?.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,200,200);ctx.save();ctx.scale(200/512,200/512);drawWardrobe(ctx,assets,config,0,{still:true});ctx.restore();}).catch(()=>{});return()=>{active=false;};});
</script>
<canvas width="200" height="200" bind:this={canvas} aria-hidden="true" data-character="xiaoyu-original"></canvas>
<style>canvas{display:block;width:100%;max-width:116px;height:auto;aspect-ratio:1;object-fit:contain}</style>
