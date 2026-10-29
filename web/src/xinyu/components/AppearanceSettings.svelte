<script lang="ts">
 import {companion,updateData,notify} from '../state.svelte';import {appearanceMode,type AppearanceMode} from '../theme';import {voiceProfiles,type VoiceProfile} from '../voice';import {playRoomVoice} from '../sound';
 import {chooseAppearance} from '../appearance.svelte';
 import BrightnessPanel from './BrightnessPanel.svelte';import SidebarIsland from './SidebarIsland.svelte';
 import WeatherControl from './WeatherControl.svelte';
 let {section='visual'}:{section?:'visual'|'voice'}=$props();
 let mode=$derived(appearanceMode(companion.data.preferences.appearanceMode,companion.data.preferences.theme));
 function choose(value:AppearanceMode){chooseAppearance(value);}
 function voice(value:VoiceProfile){updateData(data=>data.preferences.voiceProfile=value);}
</script>
{#if section==='visual'}<fieldset class="appearance-modes"><legend>场景时段</legend><div>{#each [{id:'day',name:'白天'},{id:'dusk',name:'傍晚'},{id:'night',name:'夜间'},{id:'auto',name:'跟随时间'}] as option}<button class:chosen={mode===option.id} aria-pressed={mode===option.id} onclick={()=>choose(option.id as AppearanceMode)}>{option.name}</button>{/each}</div><p>跟随时间：7:00 白天、16:00 傍晚、19:00 夜间。手动选择会持续保留。</p></fieldset>
<fieldset class="brightness-settings"><legend class="sr-only">页面亮度</legend><BrightnessPanel/></fieldset>
<WeatherControl inline/>
{:else}<fieldset class="voice-options"><legend>小屿的声音</legend>{#each voiceProfiles as option}<div class="voice-choice"><button class:chosen={(companion.data.preferences.voiceProfile||'soft')===option.id} aria-pressed={(companion.data.preferences.voiceProfile||'soft')===option.id} onclick={()=>voice(option.id)}><strong>{option.label}</strong><span>{option.description}</span></button><button class="text-button" aria-label={'试听'+option.label} onclick={()=>void playRoomVoice('character',0,option.id).catch(()=>notify('声音暂时无法播放，请稍后再试。'))}>试听</button></div>{/each}<p>互动短句保存在本机，试听不会发送你的聊天内容。</p></fieldset>
<div class="island-preference"><SidebarIsland/></div>{/if}
<style>fieldset{border:0;padding:0;margin:14px 0 22px;min-width:0}legend{font-weight:600;font-size:14px;margin-bottom:10px}fieldset p{font-size:12px;color:var(--xy-secondary);line-height:1.8;margin-top:9px}.appearance-modes>div{display:flex;gap:8px;flex-wrap:wrap}.appearance-modes button,.voice-choice>button:first-child{min-height:44px;border:1px solid var(--xy-border);background:var(--xy-panel);color:var(--xy-ink);border-radius:8px;padding:9px 13px;font-size:14px}.chosen{background:var(--xy-selected)!important;border-color:var(--xy-accent)!important}.voice-choice{display:flex;align-items:center;gap:10px;margin-top:8px}.voice-choice>button:first-child{flex:1;text-align:left;min-width:0}.voice-choice strong{display:block;font-size:14px}.voice-choice span{display:block;font-size:12px;color:var(--xy-secondary);margin-top:4px}.voice-choice>.text-button{min-height:44px;min-width:44px}</style>
