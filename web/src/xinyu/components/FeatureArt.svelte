<script lang="ts">
 import {onMount} from 'svelte';import CompanionPortrait from './CompanionPortrait.svelte';import PixelIcon from './PixelIcon.svelte';import {companion} from '../state.svelte';import {loadPicture} from '../canvas';import {cellPart} from '../avatarRig';
 let {kind}=$props<{kind:string}>();let canvas=$state<HTMLCanvasElement>();
 onMount(()=>{if(kind!=='emotion')return;let active=true;void loadPicture('/xinyu/generated/cat-atlas.png').then(image=>{if(!active)return;const p=cellPart(image,4,2,0),ctx=canvas.getContext('2d')!,scale=Math.min(128/p.width,128/p.height);ctx.clearRect(0,0,128,128);ctx.drawImage(p.image,(128-p.width*scale)/2,(128-p.height*scale)/2,p.width*scale,p.height*scale);});return()=>{active=false;};});
</script>
{#if kind==='chat'}<CompanionPortrait tone={companion.data.preferences.avatar}/>{:else if kind==='emotion'}<canvas bind:this={canvas} width="128" height="128" aria-hidden="true"></canvas>{:else if kind==='memories'}<PixelIcon src="/xinyu/art/nav_4.png" size={60}/>{:else}<img src="/xinyu/generated/sidebar-island-v3.png" alt=""/>{/if}
<style>canvas,img{display:block;width:100%;height:100%;object-fit:contain}img{image-rendering:pixelated}</style>
