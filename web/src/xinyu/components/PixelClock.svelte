<script lang="ts">
 import Counter from './Counter.svelte';import {interfaceState} from '../interfaceState.svelte';import {companion} from '../state.svelte';
 let date=$derived(new Date(interfaceState.now));
 let label=$derived(date.toLocaleString('zh-CN',{month:'long',day:'numeric',weekday:'long',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}));
</script>
<time class="pixel-clock" datetime={date.toISOString()} aria-label={'本地时间，'+label}>
 <span class="clock-digits" aria-hidden="true"><Counter value={date.getHours()} minDigits={2} reduced={companion.data.preferences.reduceMotion}/><b>:</b><Counter value={date.getMinutes()} minDigits={2} reduced={companion.data.preferences.reduceMotion}/><b>:</b><Counter value={date.getSeconds()} minDigits={2} reduced={companion.data.preferences.reduceMotion}/></span>
 <span class="clock-date" aria-hidden="true">{date.toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short'})}</span>
</time>
<style>.pixel-clock{display:grid;gap:1px;min-width:210px;flex:none;text-align:center;color:var(--xy-ink)}.clock-digits{display:flex;align-items:center;justify-content:center;gap:2px;font-size:32px;line-height:1.15;font-weight:600;font-variant-numeric:tabular-nums}.clock-digits b{font-size:22px;font-weight:500;margin:0 1px}.clock-date{font-size:14px;line-height:1.5;color:var(--xy-secondary)}@media(max-width:720px){.pixel-clock{min-width:112px}.clock-digits{font-size:17px}.clock-date{font-size:11px}}</style>
