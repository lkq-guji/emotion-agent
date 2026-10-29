<script lang="ts">
  import { onMount } from 'svelte';
  import {companion} from '../state.svelte';
  let {title,description,confirmText='确认',destructive=false,onconfirm,onclose}: {title:string;description:string;confirmText?:string;destructive?:boolean;onconfirm:()=>void|Promise<void>;onclose:()=>void}=$props();
  let dialog: HTMLDialogElement;let busy=$state(false);let error=$state('');let closing=$state(false),timer:ReturnType<typeof setTimeout>;
  function close(){if(closing)return;if(companion.data.preferences.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches){onclose();return;}closing=true;timer=setTimeout(onclose,1800);}
  onMount(()=>{dialog.showModal();return ()=>{clearTimeout(timer);dialog.close();};});
  async function confirm(){if(busy||closing)return;busy=true;try{await onconfirm();close();}catch(e){error=String(e).replace(/^Error: /,'');}finally{busy=false;}}
</script>
<dialog bind:this={dialog} class="xy-dialog" class:closing aria-busy={busy} onkeydown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!busy)close();}}} ontransitionend={event=>{if(closing&&event.target===dialog&&event.propertyName==='opacity')onclose();}} oncancel={(e)=>{e.preventDefault();if(!busy)close();}} aria-labelledby="dialog-title">
  <h2 id="dialog-title">{title}</h2><p>{description}</p>
  {#if error}<p class="xy-error" role="alert">{error}</p>{/if}
  <div class="xy-actions"><button class="xy-btn" onclick={close} disabled={busy||closing}>取消</button><button class="xy-btn" class:danger={destructive} class:primary={!destructive} onclick={confirm} disabled={busy||closing}>{busy?'正在处理…':confirmText}</button></div>
</dialog>
<style>.xy-dialog{opacity:1;transform:translateY(0);transition:opacity .12s ease-out,transform .12s ease-out}.xy-dialog.closing{opacity:0;transform:translateY(4px)}@starting-style{.xy-dialog[open]{opacity:0;transform:translateY(6px)}}@media(prefers-reduced-motion:reduce){.xy-dialog{transition:none}}</style>
