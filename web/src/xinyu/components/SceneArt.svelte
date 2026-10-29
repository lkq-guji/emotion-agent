<script lang="ts">
  import {onMount,untrack} from 'svelte';
  import {companion} from '../state.svelte';
  import {loadSceneSource,sceneSourceKey} from '../sceneSource';import {watchScenePlayback,type SceneSource,type LoadedScene} from '../sceneLibrary';import {retainSceneryMotion,sceneryBackend} from '../sceneryMotion';
  import {drawScene} from '../sceneCanvas';
  import {canvasContext,loadPicture,observeCanvas} from '../canvas';
  import {interfaceState} from '../interfaceState.svelte';import {resolveWeather,drawWeather} from '../weather';import {appearanceMode,periodAt} from '../theme';import {PrecipitationMotion,precipitationTarget} from '../precipitation';
  let {scene,label}=$props<{scene:string;label:string}>();
  let canvas:HTMLCanvasElement,loop:ReturnType<typeof observeCanvas>,picture:SceneSource,playback:ReturnType<typeof watchScenePlayback>|undefined;
  let failed=$state(false),ready=$state(false),systemReduced=$state(false);
  const precipitation=new PrecipitationMotion();let weather=$derived(resolveWeather(companion.data.preferences.weatherMode,interfaceState.now));
  let light=$derived(periodAt(appearanceMode(companion.data.preferences.appearanceMode,companion.data.preferences.theme),companion.data.preferences.brightness,interfaceState.now));
  let sourceKey=$derived(sceneSourceKey(scene,companion.data.sceneLibrary,light));
  let strength=$derived(precipitationTarget(weather==='snow'?companion.data.preferences.snowStrength:companion.data.preferences.rainStrength,weather,interfaceState.now));
  function draw(t:number){const context=canvasContext(canvas);if(context&&picture){const still=companion.data.preferences.reduceMotion||systemReduced,rain=precipitation.sample(t,strength,still);drawScene(context.ctx,picture,scene,t,context.width,context.height,still);canvas.dataset.motion=still?'still':scene.startsWith('custom_')?(picture instanceof HTMLVideoElement?'video':'depth'):sceneryBackend();drawWeather(context.ctx,weather,rain.time,context.width,context.height,still,{light,intensity:rain.intensity});}}
  $effect(()=>{sourceKey;const {id,library,period}=untrack(()=>({id:scene,library:companion.data.sceneLibrary,period:light}));let current=true,media:LoadedScene;failed=false;ready=false;void loadSceneSource(id,library,period).then(value=>{if(!current){value.dispose();return;}media=value;picture=value.source;playback=watchScenePlayback(picture,canvas,()=>companion.data.preferences.reduceMotion||systemReduced);ready=true;loop?.invalidate();}).catch(()=>{if(current)failed=true;});return()=>{current=false;playback?.destroy();playback=undefined;media?.dispose();};});
  $effect(()=>{companion.data.preferences.reduceMotion;systemReduced;weather;light;strength;playback?.sync();loop?.invalidate();});
  onMount(()=>{const release=retainSceneryMotion(),media=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>systemReduced=media.matches;change();media.addEventListener('change',change);loop=observeCanvas(canvas,draw,()=>companion.data.preferences.reduceMotion||systemReduced,60);return()=>{loop.destroy();release();media.removeEventListener('change',change);};});
</script>
<canvas class="scene-art" bind:this={canvas} aria-label={label} aria-busy={!ready&&!failed} data-ready={ready} data-scene={scene} data-weather={weather}>{label}</canvas>
{#if failed}<span class="scene-load-error" role="status">窗景暂时无法读取，请刷新重试</span>{:else if !ready}<span class="scene-loading" role="status">窗景准备中…</span>{/if}
<style>.scene-loading{position:absolute;left:12px;top:12px;padding:5px 8px;border:1px solid var(--xy-glass-border);border-radius:5px;background:var(--xy-glass-bg);color:var(--xy-ink);font-size:12px;pointer-events:none}</style>
