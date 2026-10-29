<script lang="ts">
 import {companion,updateData,notify} from '../state.svelte';import {interfaceState} from '../interfaceState.svelte';import {weatherMode,resolveWeather,type WeatherMode} from '../weather';
 import PrecipitationControl from './PrecipitationControl.svelte';import {precipitationTarget,strengthName} from '../precipitation';
 let {inline=false}:{inline?:boolean}=$props();const id=$props.id();let panel=$state<HTMLDivElement>(),trigger=$state<HTMLButtonElement>(),open=$state(false);
 const options=[{id:'auto',name:'自动天气',detail:'跟随小岛的节奏'},{id:'sunny',name:'晴天',detail:'清朗的风与阳光'},{id:'rain',name:'雨天',detail:'从小雨到暴雨'},{id:'snow',name:'雪天',detail:'从小雪到暴雪'}] as const;
 let mode=$derived(weatherMode(companion.data.preferences.weatherMode)),current=$derived(resolveWeather(mode,interfaceState.now));
 let amount=$derived(precipitationTarget(current==='snow'?companion.data.preferences.snowStrength:companion.data.preferences.rainStrength,current,interfaceState.now));
 function choose(value:WeatherMode){try{updateData(data=>data.preferences.weatherMode=value);}catch(error){notify(String(error));}}
 function dismiss(){panel?.hidePopover();trigger?.focus({preventScroll:true});}
 function keyboard(event:KeyboardEvent){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dismiss();}}
</script>
{#snippet choices()}
 <div class="weather-choices">{#each options as option}<button type="button" data-weather-mode={option.id} class:chosen={mode===option.id} aria-pressed={mode===option.id} onclick={()=>choose(option.id)}><strong>{option.name}</strong><span>{option.detail}</span></button>{/each}</div>
 {#if current!=='sunny'}<PrecipitationControl weather={current}/>{/if}
 <p class="weather-note">天气和时段分别设置。白天也可以下雨，夜间也可以飘雪。</p>
 <small>自动模式每 10 分钟抽选一次，晴天较多；手动选择会保存。</small>
{/snippet}
{#if inline}<fieldset class="weather-settings"><legend>岛上天气</legend>{@render choices()}</fieldset>
{:else}<div class="weather-control"><button class="weather-trigger" bind:this={trigger} type="button" aria-label="选择天气" aria-expanded={open} popovertarget={id} title="选择天气，不改变白天或夜间">
 <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 16h13a4 4 0 0 0 0-8 6 6 0 0 0-11-1A4.5 4.5 0 0 0 5 16Z"/>{#if current==='rain'}<path d="m7 19-1 3m6-3-1 3m6-3-1 3"/>{:else if current==='snow'}<path d="M8 19v4m-2-2h4m7-2v4m-2-2h4"/>{:else}<path d="M4 3V1M1 6h2m2-3-2-2"/>{/if}</svg><span>{current==='sunny'?'晴天':strengthName(current,amount)}</span><span class="weather-auto">{mode==='auto'?'自动':''}</span></button>
 <div bind:this={panel} id={id} popover="auto" role="dialog" tabindex="-1" aria-label="天气控制" class="weather-popover" ontoggle={event=>open=event.newState==='open'} onkeydown={keyboard}><h2>窗外，想听什么天气？</h2>{@render choices()}<button type="button" class="weather-done" onclick={dismiss}>完成</button></div></div>{/if}
<style>
 .weather-control{flex:none}.weather-trigger{display:flex;align-items:center;gap:6px;min-height:44px;padding:6px 8px;border:0;border-radius:8px;background:transparent;color:var(--xy-ink);font-size:12px;cursor:pointer}.weather-trigger:hover{background:var(--xy-selected)}.weather-auto{font-size:10px;opacity:.7}.weather-auto:empty{display:none}
 .weather-popover{max-height:calc(100dvh - 110px);overflow-y:auto}.weather-done{display:block;margin-top:14px;margin-left:auto;min-height:40px;padding:8px 18px;background:var(--xy-selected);border:1px solid var(--xy-accent);border-radius:8px;color:var(--xy-ink);font-size:14px;cursor:pointer}
 .weather-popover{position:fixed;inset:84px 24px auto auto;margin:0;width:350px;padding:20px;border:1px solid var(--xy-border);border-radius:12px;background:var(--xy-panel);color:var(--xy-ink);box-shadow:0 8px 24px #30296826}.weather-popover h2{font-size:18px;font-weight:650;margin:0 0 14px}.weather-choices{display:grid;grid-template-columns:1fr 1fr;gap:8px}.weather-choices button{display:grid;gap:3px;min-height:64px;padding:10px 12px;text-align:left;border:1px solid var(--xy-border);border-radius:9px;background:var(--xy-panel);color:var(--xy-ink);cursor:pointer}.weather-choices button.chosen{background:var(--xy-selected);border-color:var(--xy-accent)}.weather-choices strong{font-size:14px;font-weight:600}.weather-choices span,.weather-note,small{font-size:12px;line-height:1.7;color:var(--xy-secondary)}.weather-note{margin-top:12px}small{display:block;margin-top:6px}.weather-settings{padding:0;border:0;margin:18px 0 22px;min-width:0}.weather-settings legend{font-size:14px;font-weight:600;margin-bottom:10px}
</style>
