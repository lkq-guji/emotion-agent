<script lang="ts">
  import {onMount,untrack} from 'svelte';
  import {Tween,prefersReducedMotion} from 'svelte/motion';
  import {quintOut} from 'svelte/easing';
  let {value,reduced=false}:{value:number;reduced?:boolean}=$props();
  const position=new Tween(untrack(()=>value),{duration:220,easing:quintOut});
  $effect(()=>{
    const next=value,instant=reduced||prefersReducedMotion.current;
    untrack(()=>{
      const last=Math.round(position.target),from=((last%10)+10)%10;
      const forward=(next-from+10)%10,step=forward>5?forward-10:forward;
      void position.set(instant?next:last+step,{duration:instant?0:220});
    });
  });
  onMount(()=>{const freeze=()=>{if(document.hidden)void position.set(position.target,{duration:0});};document.addEventListener('visibilitychange',freeze);return()=>{document.removeEventListener('visibilitychange',freeze);void position.set(position.current,{duration:0});};});
</script>
<span class="counter-digit" data-moving={Math.abs(position.target-position.current)>.01}>
  {#each Array.from({length:10},(_,n)=>n) as digit}<span class="counter-numeral" style:transform={'translateY('+((((digit-position.current+5)%10+10)%10-5)*100)+'%)'}>{digit}</span>{/each}
</span>
<style>
 .counter-digit{position:relative;display:inline-block;width:.64em;height:1.15em;overflow:hidden;font-size:inherit;line-height:1.15;font-variant-numeric:tabular-nums;vertical-align:bottom}
 .counter-numeral{position:absolute;inset:0;display:grid;place-items:center;font-size:inherit;line-height:inherit}
</style>
