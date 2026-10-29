<script lang="ts">
 import {onMount,untrack} from 'svelte';import {prefersReducedMotion} from 'svelte/motion';
 import {companion} from '../state.svelte';import {interfaceState} from '../interfaceState.svelte';
 import {resolveWeather} from '../weather';import {precipitationTarget} from '../precipitation';import {WeatherPlayer,prepareRainAudio} from '../weatherAudio';import {ambience,registerAmbience} from '../ambience.svelte';
 let rainReady=false,preparing:Promise<void>|undefined;
 let ctx:AudioContext|undefined,player:WeatherPlayer|undefined,alive=true,arming=false;let visible=$state(true),unlocked=$state(false);
 let weather=$derived(resolveWeather(companion.data.preferences.weatherMode,interfaceState.now)),sound=$derived(companion.data.preferences.ambientSound===true);
 let amount=$derived(precipitationTarget(weather==='snow'?companion.data.preferences.snowStrength:companion.data.preferences.rainStrength,weather,companion.data.preferences.reduceMotion||prefersReducedMotion.current?0:interfaceState.now));
 function prepare(){if(!ctx||rainReady||preparing||ambience.failed)return;ambience.loading=true;preparing=prepareRainAudio(ctx).then(()=>{if(!alive)return;rainReady=true;ambience.loading=false;sync();}).catch(()=>{preparing=undefined;if(alive&&sound&&weather==='rain'){ambience.loading=false;ambience.failed=true;}});}
 function sync(){if(weather==='rain'&&sound&&visible&&unlocked&&!rainReady){player?.set('sunny',false,amount);ambience.playing=false;prepare();return;}if(!sound||weather!=='rain')ambience.loading=false;if(weather!=='rain'&&player&&unlocked)ambience.failed=false;player?.set(weather,!!sound&&visible&&unlocked,amount);ambience.playing=player?.playing??false;if(!sound)ambience.failed=false;}
 async function arm(){if(arming||!alive||!sound)return;arming=true;try{ctx??=new AudioContext();player??=new WeatherPlayer(ctx);await ctx.resume();if(!alive)return;unlocked=true;ambience.unlocked=true;ambience.failed=false;sync();}catch{ambience.failed=true;}finally{arming=false;}}
 $effect(()=>{weather;sound;amount;visible;unlocked;untrack(sync);});
 $effect(()=>{if(sound&&!unlocked)void arm();});
 onMount(()=>{const unregister=registerAmbience(arm),gesture=()=>{if(sound&&!unlocked){if(ctx?.state==='suspended')void ctx.resume();void arm();}},hide=()=>visible=!document.hidden;hide();document.addEventListener('pointerdown',gesture);document.addEventListener('keydown',gesture);document.addEventListener('visibilitychange',hide);return()=>{alive=false;unregister();ambience.playing=false;ambience.unlocked=false;ambience.loading=false;void player?.close();document.removeEventListener('pointerdown',gesture);document.removeEventListener('keydown',gesture);document.removeEventListener('visibilitychange',hide);};});
</script>
<span class="ambience-state" aria-hidden="true" data-playing={ambience.playing} data-weather={weather}></span>
<style>.ambience-state{display:none}</style>
