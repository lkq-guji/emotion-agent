<script lang="ts">
 import {loadIslandAssets,islandOutfitPicture,drawIslandSprite} from '../islandAssets';
 import type {WardrobeConfig} from '../wardrobe';
 let {config}:{config:WardrobeConfig}=$props();let canvas:HTMLCanvasElement;
 $effect(()=>{const outfit={...config};let active=true;void loadIslandAssets().then(async data=>{
  const image=await islandOutfitPicture(outfit.outfit);if(!active)return;const c=canvas.getContext('2d')!;c.clearRect(0,0,200,220);
  drawIslandSprite(c,image,data.actor,0,100,216,226,1,outfit);
 }).catch(()=>{});return()=>{active=false;};});
</script>
<canvas bind:this={canvas} width="200" height="220" aria-label="小屿在小岛上的完整造型，跟随衣橱选择" data-character="xiaoyu-original"></canvas>
<style>canvas{display:block;width:100px;height:110px;flex:none}</style>
