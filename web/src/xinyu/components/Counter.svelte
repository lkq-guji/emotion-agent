<script lang="ts">
 import CounterDigit from './CounterDigit.svelte';
 let {value,minDigits=1,reduced=false}:{value:number;minDigits?:number;reduced?:boolean}=$props();
 let text=$derived(String(Math.max(0,Math.floor(Number.isFinite(value)?Math.min(value,999999999999):0))).padStart(Math.min(12,Math.max(1,minDigits)),'0'));
</script>
<span class="pixel-counter" data-value={text}><span class="sr-only">{text}</span><span class="counter-row" aria-hidden="true">{#each [...text].map((digit,index)=>({digit:Number(digit),place:text.length-index})) as item (item.place)}<CounterDigit value={item.digit} {reduced}/>{/each}</span></span>
<style>.pixel-counter{display:inline-flex;align-items:baseline;font-size:inherit;line-height:1.15;font-variant-numeric:tabular-nums;white-space:nowrap}.counter-row{display:inline-flex;font-size:inherit;direction:ltr;unicode-bidi:isolate}</style>
