<script lang="ts">
 import {onMount} from 'svelte';
 import {DBState} from '../ts/stores.svelte';import {getModelInfo} from '../ts/model/modellist';
 import {companion,updateData,notify,lockApp} from './state.svelte';import {prepareCompanion} from './bridge.svelte';
 import {appearanceMode,displayTheme,periodAt} from './theme';import {brightnessValue,IslandTimeLedger} from './islandTime';import {interfaceState} from './interfaceState.svelte';import {routes} from './navigation';
 import PixelIcon from './components/PixelIcon.svelte';import DayNightToggle from './components/DayNightToggle.svelte';import CompanionPortrait from './components/CompanionPortrait.svelte';
 import Dock from './components/Dock.svelte';import ParticleText from './components/ParticleText.svelte';import PixelClock from './components/PixelClock.svelte';import BrightnessControl from './components/BrightnessControl.svelte';
 import WeatherControl from './components/WeatherControl.svelte';
 import WeatherAmbience from './components/WeatherAmbience.svelte';
 import StrokeText from './components/StrokeText.svelte';
 import {resolveWeather} from './weather';import {scenes} from './domain';
 import {polishSurfaces} from './surfacePolish';
 import LightTunnel from './components/LightTunnel.svelte';
 import Home from './pages/Home.svelte';import Chat from './pages/Chat.svelte';import Personal from './pages/Personal.svelte';import Settings from './pages/Settings.svelte';
 import './coherence.css';import './xinyu.css';import './modules.css';import './readability.css';import './polish.css';import './experience.css';import './islandDesktop.css';
 import './cozy.css';
 import './journey.css';
 import './glassScenery.css';
 import './sceneLibrary.css';
 const route=()=>location.hash.replace(/^#\/?/,'').split('?')[0]||'home';
 let searchParam=$state(new URLSearchParams(location.hash.split('?')[1]||'').get('search')||'');
 let page=$state(route()),main:HTMLElement,initialization=$state(true);
 let currentTitle=$derived(routes.find(r=>r.id===page)?.label||'小岛迷路了');
 let locationTitle=$derived(page==='home'?'心屿小岛':page==='chat'?'陪伴小屋':currentTitle);
 let weather=$derived(resolveWeather(companion.data.preferences.weatherMode,interfaceState.now));
 let windowTitle=$derived([...scenes,...(companion.data.sceneLibrary||[])].find(scene=>scene.id===companion.data.preferences.scene)?.name||'晴昼小屋');
 let effectiveTheme=$derived(displayTheme(appearanceMode(companion.data.preferences.appearanceMode,companion.data.preferences.theme),interfaceState.brightnessPreview??companion.data.preferences.brightness,interfaceState.now));
 let brightness=$derived(brightnessValue(interfaceState.brightnessPreview??companion.data.preferences.brightness));
 onMount(()=>{
  void prepareCompanion().catch(e=>notify(String(e))).finally(()=>initialization=false);
  const changed=()=>{page=route();searchParam=new URLSearchParams(location.hash.split('?')[1]||'').get('search')||'';main?.scrollTo({top:0});};
  window.addEventListener('hashchange',changed);
  let focused=document.hasFocus(),session=companion.data.createdAt,lastSave=performance.now();
  const eligible=()=>focused&&!document.hidden&&!companion.locked&&!companion.error;
  const ledger=new IslandTimeLedger(Date.now(),performance.now(),eligible());
  const sample=(active=eligible())=>{const now=Date.now(),mono=performance.now();if(session!==companion.data.createdAt){session=companion.data.createdAt;ledger.reset(now,mono,active);}else ledger.sample(now,mono,active);interfaceState.now=now;interfaceState.activePreview=ledger.pending();};
  const flush=()=>{const delta=ledger.pending();if(!Object.keys(delta).length||companion.locked||companion.error)return;try{updateData(data=>{for(const [day,seconds]of Object.entries(delta))data.activeSeconds[day]=(data.activeSeconds[day]||0)+seconds;});ledger.acknowledge(delta);interfaceState.activePreview=ledger.pending();lastSave=performance.now();}catch(error){notify(String(error));}};
  const focus=()=>{focused=true;sample();},blur=()=>{sample(false);focused=false;flush();};
  const visibility=()=>{sample(!document.hidden&&document.hasFocus()&&!companion.locked&&!companion.error);focused=document.hasFocus();if(document.hidden)flush();};
  const leave=()=>{sample(false);flush();},resume=()=>{focused=document.hasFocus();sample();};
  window.addEventListener('focus',focus);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',leave);window.addEventListener('pageshow',resume);window.addEventListener('xinyu:before-lock',leave);
  const timer=setInterval(()=>{sample();if(performance.now()-lastSave>=15000)flush();},1000);
  return()=>{clearInterval(timer);sample(false);flush();interfaceState.activePreview={};window.removeEventListener('hashchange',changed);window.removeEventListener('focus',focus);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',resume);window.removeEventListener('xinyu:before-lock',leave);};
 });
</script>
<div class="xinyu-app" use:polishSurfaces={companion.data.preferences.reduceMotion} data-theme={effectiveTheme} data-period={periodAt(appearanceMode(companion.data.preferences.appearanceMode,companion.data.preferences.theme),brightness,interfaceState.now)} class:reduce-motion={companion.data.preferences.reduceMotion} class:dock-auto={companion.data.preferences.dockAutoHide!==false} style:--xy-brightness={brightness/100}>
 <WeatherAmbience/>
 <a href="#main-content" class="xy-skip" onclick={event=>{event.preventDefault();main?.focus();}}>跳到主要内容</a>
 <div class="xy-workspace">
  <header class="xy-topbar">
   <div class="shell-brand"><a class="brand-cloud-home" href="#/" aria-label="心屿智伴首页"><PixelIcon src="/xinyu/art/logo_cloud.png" size={44}/></a><ParticleText brand href="#/" reduced={companion.data.preferences.reduceMotion}/></div>
   <PixelClock/>
   <div class="topbar-place" aria-label="当前位置与天气"><span class="place-spark" aria-hidden="true">✦</span><div><StrokeText text={locationTitle} reduced={companion.data.preferences.reduceMotion}/><span>{weather==='rain'?'细听窗边雨声':weather==='snow'?'窗外正飘着雪':'晴朗的小岛时光'}{page==='chat'?' · '+windowTitle:''}</span></div></div>
   <div class="topbar-tools" role="group" aria-label="小岛显示与天气"><DayNightToggle/><WeatherControl/><BrightnessControl/></div>
   <button class="icon-btn top-lock" aria-label="锁定应用" title="锁定应用" onclick={lockApp}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg></button>
   <a class="top-user" href="#/settings" aria-label="我的小岛设置"><span class="top-portrait"><CompanionPortrait tone={companion.data.preferences.avatar}/></span><span>{companion.data.preferences.name||'我的小岛'}</span></a>
  </header>
  <main id="main-content" class="xy-main" class:home-page={page==='home'} class:chat-page={page==='chat'} bind:this={main} tabindex="-1" aria-label={currentTitle}>
   {#if companion.error}<div class="xy-storage-error" role="alert"><h1>暂时无法保存记录</h1><p>{companion.error}</p><p>原始数据仍然保留，请检查浏览器存储空间后重新加载。</p><button class="xy-btn" onclick={()=>location.reload()}>重新加载</button></div>
   {:else if initialization}<div class="xy-loading" role="status">正在为你点亮小岛…</div>
   {:else if page==='home'}<Home/>{:else if page==='chat'}<Chat/>{:else if page==='settings'}<Settings/>
   {:else if routes.some(r=>r.id===page)}{#key page}<Personal {page} initialSearch={searchParam}/>{/key}
   {:else}<div class="xy-empty"><img src="/xinyu/art/floating_castle.png" alt=""/><h1>好像走到小岛的另一边了</h1><p>这个页面不存在，回到熟悉的地方吧。</p><a href="#/" class="xy-btn primary">返回首页</a></div>{/if}
  </main>
  {#if page!=='home'}<footer class="xy-status"><span><i></i>{companion.saveStatus}</span><span>{getModelInfo(DBState.db.aiModel)?.name||'请配置模型'}</span></footer>{/if}
 </div>
 <Dock {page} reduced={companion.data.preferences.reduceMotion} autoHide={companion.data.preferences.dockAutoHide!==false}/>
 {#if interfaceState.roomTransitionAt}{#key interfaceState.roomTransitionAt}<LightTunnel startedAt={interfaceState.roomTransitionAt} reduced={companion.data.preferences.reduceMotion} oncomplete={()=>interfaceState.roomTransitionAt=0}/>{/key}{/if}
 {#if companion.notice}<div class="xy-toast" role="status">{companion.notice}</div>{/if}
</div>
