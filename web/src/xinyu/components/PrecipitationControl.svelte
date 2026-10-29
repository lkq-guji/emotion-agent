<script lang="ts">
 import {companion,updateData} from '../state.svelte';import {interfaceState} from '../interfaceState.svelte';
 import {normalizeStrength,precipitationTarget,strengthLevels,strengthName,type PrecipitationStrength} from '../precipitation';
 let {weather}:{weather:'rain'|'snow'}=$props();let key=$derived(weather==='snow'?'snowStrength':'rainStrength');
 let mode=$derived(normalizeStrength(companion.data.preferences[key])),amount=$derived(precipitationTarget(mode,weather,interfaceState.now));
 const labels={rain:['小雨','中雨','大雨','暴雨'],snow:['小雪','中雪','大雪','暴雪']};
 function select(value:PrecipitationStrength){updateData(data=>data.preferences[key]=value);}
 function automatic(){select(mode==='auto'?strengthLevels.reduce((best,level)=>Math.abs(level.value-amount)<Math.abs(best.value-amount)?level:best,strengthLevels[0]).id:'auto');}
</script>
<fieldset class="precipitation-control"><legend>{weather==='rain'?'雨量强度':'雪量强度'}</legend>
 <div class="strength-heading"><span>{mode==='auto'?strengthName(weather,amount)+' · 自动渐变':'手动选择，柔和过渡'}</span><button type="button" role="switch" aria-checked={mode==='auto'} aria-label={weather==='rain'?'雨量自动变化':'雪量自动变化'} onclick={automatic}><i></i>自动变化</button></div>
 <div class="strength-options">{#each strengthLevels as level,index}<button type="button" aria-pressed={mode===level.id} class:chosen={mode===level.id} onclick={()=>select(level.id)}>{labels[weather][index]}</button>{/each}</div>
 <p>自动时慢慢增强，再慢慢减弱。手动切换也会平滑变化。</p>
</fieldset>
<style>
 .precipitation-control{margin:18px 0 4px;padding:16px 0 0;border:0;border-top:1px solid var(--xy-border);min-width:0}.precipitation-control legend{float:left;width:100%;font-size:14px;font-weight:600;margin:0 0 8px}.strength-heading{clear:both;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.strength-heading>span,p{font-size:12px;line-height:1.7;color:var(--xy-secondary)}.strength-heading>button{display:flex;align-items:center;gap:6px;min-height:40px;padding:6px 8px;border:0;background:transparent;border-radius:8px;color:var(--xy-ink);font-size:12px;cursor:pointer}.strength-heading i{width:24px;height:14px;position:relative;background:var(--xy-border);border-radius:10px}.strength-heading i:after{content:'';position:absolute;width:10px;height:10px;top:2px;left:2px;background:var(--xy-panel);border-radius:50%;transition:translate .16s ease-out}.strength-heading [aria-checked=true] i{background:var(--xy-accent)}.strength-heading [aria-checked=true] i:after{translate:10px 0}.strength-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.strength-options button{min-height:40px;padding:7px 4px;border:1px solid var(--xy-border);border-radius:8px;background:var(--xy-panel);color:var(--xy-ink);font-size:14px;cursor:pointer}.strength-options button.chosen{background:var(--xy-selected);border-color:var(--xy-accent)}p{margin-top:10px}
 @media(prefers-reduced-motion:reduce){.strength-heading i:after{transition:none}}
</style>
