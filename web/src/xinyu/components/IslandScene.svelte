<script lang="ts">
 import {onMount,onDestroy} from 'svelte';import {prefersReducedMotion} from 'svelte/motion';
 import {companion,updateData,notify} from '../state.svelte';import {interfaceState} from '../interfaceState.svelte';
 import {appearanceMode,periodAt} from '../theme';import {canvasContext,observeCanvas,loadPicture} from '../canvas';
 import {loadIslandAssets,islandPicture,islandOutfitPicture,islandFrame,drawIslandSprite,type IslandAssets} from '../islandAssets';
 import {islandEntryAt,islandActorBlendAt,entryPlaybackRate} from '../islandEntry';import {drawIslandEnvironment,drawMailbox} from '../islandEnvironment';
 import {normalizeWardrobe,presetWardrobe,loadWardrobe} from '../wardrobe';
 import {playRoomVoice,stopRoomVoice} from '../sound';import {voiceLines,characterVoiceLines} from '../voice';import RoomBubble from './RoomBubble.svelte';
 import {resolveWeather,drawWeather} from '../weather';import type {SnowPointer} from '../pixelSnow';import WeatherSound from './WeatherSound.svelte';
 import {PrecipitationMotion,precipitationTarget} from '../precipitation';
 const precipitation=new PrecipitationMotion();let drawnStrength=$state(.16);
 import GlassSurface from './GlassSurface.svelte';
 import CurvedLoop from './CurvedLoop.svelte';
 import {islandWeatherFile} from '../weatherScene';
 import {PixelSwapFrame} from '../pixelSwap';import {retainIslandMotion,landscapeBackend} from '../landscapeMotion';import SplitFlapText from './SplitFlapText.svelte';
 const backgroundSwap=new PixelSwapFrame(2172,724,70);let entryFlap=$state(0),backgroundSwapping=$state(false),motionBackend=$state('static');
 let canvas:HTMLCanvasElement,loop:ReturnType<typeof observeCanvas>,assets:IslandAssets,actor:HTMLImageElement,door:HTMLImageElement;
 let sceneryFile=$state('');
 let scenery:HTMLImageElement,active=true,started=0,travelStamp=0,arrivedNormally=false,complete:(()=>void|Promise<void>)|undefined;
 let actorReady=$state(false),doorReady=$state(false),sceneReady=$state(false),loadedOutfit=$state(''),videoReady=$state(false),videoFailure=$state(false),usingVideo=$state(false);let entryVideo:HTMLVideoElement|undefined;let ready=$derived(actorReady&&doorReady&&sceneReady&&(videoReady||videoFailure));let actorFailure=$state(''),sceneFailure=$state('');let failure=$derived(actorFailure||sceneFailure);let playing=$state(false),phase=$state('idle'),actorFrame=$state(0),doorFrame=$state(0),epoch=$state(0);
 let mailHovered=$state(false),mailProgress=0,lastDraw=0,greeting=0,catGreeting=0,characterLine=0,catLine=0,bubbleKey=$state(0),bubbleTarget=$state<HTMLElement>(),speech=$state(''),caption=$state(''),speaker=$state('');let bubbleTimer:ReturnType<typeof setTimeout>;
 let period=$derived(periodAt(appearanceMode(companion.data.preferences.appearanceMode,companion.data.preferences.theme),interfaceState.brightnessPreview??companion.data.preferences.brightness,interfaceState.now));
 let weather=$derived(resolveWeather(companion.data.preferences.weatherMode,interfaceState.now)),snowPointer:SnowPointer|undefined;
 let strength=$derived(precipitationTarget(weather==='snow'?companion.data.preferences.snowStrength:companion.data.preferences.rainStrength,weather,(companion.data.preferences.reduceMotion||prefersReducedMotion.current)?0:interfaceState.now));
 let outfit=$derived(companion.data.preferences.avatar==='custom'?normalizeWardrobe(companion.data.preferences.customAvatar):presetWardrobe(companion.data.preferences.avatar));
 const still=()=>companion.data.preferences.reduceMotion||prefersReducedMotion.current;
 const labels={turn:'小屿转过身，带你回房间。',pause:'一起往小屋走吧。',walk:'沿着小路，走到小屋门前。',reach:'小屿伸手去开门。',open:'推开亮着暖灯的门。',enter:'小屿走进了房间。',arrive:'回到房间，继续聊聊。'};
 function setMail(value:boolean){mailHovered=value;loop?.invalidate();}
 function interact(kind:'character'|'cat',anchor:HTMLElement){
  if(!ready||playing)return;const index=kind==='cat'?catLine++:characterLine++;speaker=kind==='cat'?'小猫':'小屿';
  speech=kind==='cat'?'喵呜～你的陪伴，我收到了。':voiceLines[characterVoiceLines[index%characterVoiceLines.length]];
  caption=kind==='cat'?['喵呜～','蹭蹭你','喵～'][index%3]:['我在呢','欢迎你','慢慢来','欢迎回来','你来啦','歇一会儿','看看风景','别着急'][index%characterVoiceLines.length];
  if(kind==='cat')catGreeting=performance.now();else greeting=performance.now();bubbleTarget=anchor;bubbleKey++;clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>speech='',2800);loop?.invalidate();
  if(companion.data.preferences.sound)void playRoomVoice(kind,index,companion.data.preferences.voiceProfile||'soft').catch(()=>notify('声音暂时无法播放，请在“我的”里试听后重试。'));
 }
 function toggleSound(){updateData(data=>data.preferences.sound=!data.preferences.sound);if(!companion.data.preferences.sound)stopRoomVoice();}
 export function enterRoom(after?:()=>void|Promise<void>){
  if(playing)return;clearTimeout(bubbleTimer);speech='';stopRoomVoice();complete=()=>{interfaceState.roomArrival=Date.now();return after?after():void(location.hash='/chat');};
  void loadWardrobe().catch(()=>{});void loadPicture('/xinyu/generated/room-foreground-v3.png').catch(()=>{});
  if(still()||!ready||failure){const next=complete;complete=undefined;void next?.();return;}
  started=performance.now();travelStamp=started;arrivedNormally=false;interfaceState.roomTransitionAt=started;playing=true;phase='turn';usingVideo=videoReady&&!!entryVideo;
  if(usingVideo&&entryVideo){const video=entryVideo;video.currentTime=0;video.playbackRate=entryPlaybackRate;void video.play().catch(()=>{if(entryVideo===video)usingVideo=false;});}
  loop?.invalidate();
 }
 function cancel(){if(interfaceState.roomTransitionAt===travelStamp)interfaceState.roomTransitionAt=0;entryVideo?.pause();usingVideo=false;playing=false;phase='idle';complete=undefined;loop?.invalidate();}
 function draw(time:number){
  if(!scenery||!assets||!actor||!door)return;const c=canvasContext(canvas);if(!c)return;
  const scale=Math.min(c.width/2172,c.height/724),ox=(c.width-2172*scale)/2,oy=(c.height-724*scale)/2;
  const dt=Math.min(50,time-(lastDraw||time));lastDraw=time;const target=mailHovered&&!playing?1:0;mailProgress=still()?target:mailProgress+(target-mailProgress)*(1-Math.exp(-dt/105));
  const frame=playing?islandEntryAt(time-started,assets.placement):null;
  if(frame){phase=frame.phase;actorFrame=frame.actor;doorFrame=frame.door;}else{actorFrame=doorFrame=0;}
  const ctx=c.ctx;ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.beginPath();ctx.rect(0,0,2172,724);ctx.clip();
  const zoom=frame?.zoom||1,camera=(zoom-1)/.12;
  ctx.translate(1086,362);ctx.scale(zoom,zoom);ctx.translate(-(1086+(assets.placement.door.x*2172-1086)*camera),-(362+(333-362)*camera));
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  backgroundSwap.draw(ctx,scenery.src+period,time,paint=>{paint.save();if(weather==='rain'&&period==='dusk')paint.filter='sepia(.14) brightness(.9)';drawIslandEnvironment(paint,scenery,time,period,still());paint.restore();},still());if(backgroundSwapping!==backgroundSwap.active)backgroundSwapping=backgroundSwap.active;const backend=landscapeBackend();if(motionBackend!==backend)motionBackend=backend;
  const rain=precipitation.sample(time,strength,still());if(Math.abs(drawnStrength-rain.intensity)>.015)drawnStrength=rain.intensity;
  drawMailbox(ctx,scenery,mailProgress,period);
  drawWeather(ctx,weather,rain.time,2172,724,still(),{light:period,pointer:playing?undefined:snowPointer,intensity:rain.intensity});
  const p=assets.placement;ctx.save();if(period==='night')ctx.filter='brightness(.78) saturate(.84)';else if(period==='dusk')ctx.filter='brightness(.97)';
  drawIslandSprite(ctx,door,assets.door,frame?.door||0,p.door.x*2172,p.door.y*724,p.door.width*2172);ctx.restore();
  const x=(frame?.x??p.actorIdle.x)*2172,y=(frame?.y??p.actorIdle.y)*724,actorWidth=p.actorIdle.width*2172*(frame?.scale??1);
  if(period==='night'){ctx.save();ctx.globalCompositeOperation='screen';const glow=ctx.createRadialGradient(x,y-42,4,x+20,y-42,150);glow.addColorStop(0,'#ffd18b45');glow.addColorStop(.55,'#ffbb6a24');glow.addColorStop(1,'#ffbd7000');ctx.fillStyle=glow;ctx.fillRect(x-140,y-195,320,290);ctx.restore();}
  ctx.save();ctx.globalAlpha=(frame?.alpha??1)*.17;ctx.fillStyle='#392d57';ctx.beginPath();ctx.ellipse(x,y-1,actorWidth*.22,4,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();if(period==='night')ctx.filter='brightness(1.12) saturate(1.02)';else if(period==='dusk')ctx.filter='brightness(.98)';
  if(frame&&usingVideo&&entryVideo&&entryVideo.readyState>=2&&!entryVideo.paused){const scale=actorWidth/444;ctx.globalAlpha=frame.alpha;ctx.drawImage(entryVideo,x-222*scale,y-420*scale,444*scale,444*scale);
   if(outfit.accessory!=='none'&&time-started<160){ctx.save();ctx.globalAlpha*=Math.min(1,Math.max(0,(160-(time-started))/60));ctx.translate(x+11*scale,y-151*scale);ctx.scale(scale,scale);ctx.fillStyle='#ead8a7';ctx.strokeStyle='#8572a4';ctx.lineWidth=2;ctx.beginPath();if(outfit.accessory==='star'){for(let i=0;i<10;i++){const radius=i%2?3:7,angle=i*Math.PI/5-Math.PI/2;ctx.lineTo(Math.cos(angle)*radius,Math.sin(angle)*radius);}}else for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;ctx.ellipse(Math.cos(angle)*4,Math.sin(angle)*4,3,3,0,0,Math.PI*2);}ctx.fill();ctx.stroke();ctx.restore();}}
  else{const blend=frame?islandActorBlendAt(time-started,p):{from:0,to:0,mix:1};if(blend.from!==blend.to)drawIslandSprite(ctx,actor,assets.actor,blend.from,x,y,actorWidth,(frame?.alpha??1)*(1-blend.mix),outfit);drawIslandSprite(ctx,actor,assets.actor,blend.to,x,y,actorWidth,(frame?.alpha??1)*blend.mix,outfit);}ctx.restore();
  if(!playing&&!still())for(const [start,px,py] of [[greeting,x,y-90],[catGreeting,1102,392]] as const){const age=time-start;if(start&&age>=0&&age<1250){ctx.save();ctx.globalAlpha=(1-age/1250)*.85;ctx.fillStyle='#ffbad8';const hx=px+18,hy=py-age*.012;ctx.fillRect(hx,hy,5,4);ctx.fillRect(hx-4,hy-3,4,4);ctx.fillRect(hx+5,hy-3,4,4);ctx.fillRect(hx-2,hy+4,9,3);ctx.fillRect(hx,hy+7,5,3);ctx.restore();}}
  if(frame&&['enter','arrive'].includes(frame.phase)){
   const f=assets.door.frames[3],s=f.source,k=p.door.width*2172/s.width,dx=p.door.x*2172-f.anchor.x*k,dy=p.door.y*724-f.anchor.y*k;
   // Door jambs and threshold stay in front of the whole sprite; the opening remains transparent.
   ctx.save();ctx.beginPath();ctx.rect(dx,dy,s.width*k,s.height*k);ctx.rect(dx+(f.visibleBounds.x+69)*k,dy+(f.visibleBounds.y+50)*k,(f.visibleBounds.width-111)*k,(f.visibleBounds.height-59)*k);ctx.clip('evenodd');
   drawIslandSprite(ctx,door,assets.door,3,p.door.x*2172,p.door.y*724,p.door.width*2172);ctx.restore();
  }
  ctx.restore();
  if(frame?.veil&&!interfaceState.roomTransitionAt){ctx.save();ctx.globalAlpha=frame.veil;ctx.fillStyle=getComputedStyle(canvas).getPropertyValue('--xy-page');ctx.fillRect(0,0,c.width,c.height);ctx.restore();}
  if(frame?.done&&playing){arrivedNormally=true;entryVideo?.pause();usingVideo=false;playing=false;phase='idle';const next=complete;complete=undefined;queueMicrotask(()=>{if(active)void next?.();});}
 }
 $effect(()=>{const selected=period,sky=weather;epoch;let current=true;void loadIslandAssets().then(async data=>{
  const image=await islandPicture(islandWeatherFile(selected,sky)||data.scenes.find(s=>s.id===selected)!.file);
  if(active&&current){scenery=image;sceneryFile=image.src;sceneReady=true;sceneFailure='';loop?.invalidate();}
 }).catch(()=>{if(active&&current)sceneFailure='小岛风景暂时没能加载，你仍可直接进入房间。';});return()=>{current=false;};});
 $effect(()=>{epoch;const config={...outfit};let current=true;actorReady=false;void loadIslandAssets().then(async data=>{
  const a=await islandOutfitPicture(config.outfit);if(a.naturalWidth!==data.actor.width||a.naturalHeight!==data.actor.height)throw new Error('小屿动作图集尺寸不一致');
  for(const item of data.actor.frames){if(!active||!current)return;islandFrame(a,item,config);}
  if(active&&current){assets=data;actor=a;loadedOutfit=config.outfit;actorReady=true;actorFailure='';loop?.invalidate();}
 }).catch(()=>{if(active&&current)actorFailure='这套衣服的进屋动作暂时没能加载，你仍可直接进入房间。';});return()=>{current=false;};});
 $effect(()=>{epoch;const {outfit:clothes,color,hairColor}=outfit,video=document.createElement('video');let current=true;videoReady=false;videoFailure=false;entryVideo=video;
  video.muted=true;video.playsInline=true;video.preload='auto';const loaded=()=>{if(active&&current){videoReady=true;loop?.invalidate();}},failed=()=>{if(active&&current){videoReady=false;videoFailure=true;usingVideo=false;loop?.invalidate();}};
  video.addEventListener('loadeddata',loaded);video.addEventListener('error',failed);
  if(!video.canPlayType('video/webm; codecs="vp9"'))failed();else{video.src=`/xinyu/island/entry-videos/${clothes}-${color}-${hairColor}.webm`;video.load();}
  return()=>{current=false;video.pause();video.removeEventListener('loadeddata',loaded);video.removeEventListener('error',failed);video.removeAttribute('src');video.load();if(entryVideo===video)entryVideo=undefined;};
 });
 $effect(()=>{weather;strength;companion.data.preferences.reduceMotion;prefersReducedMotion.current;if(playing&&still()){const next=complete;cancel();void next?.();}loop?.invalidate();});
 $effect(()=>{if(!companion.data.preferences.sound)stopRoomVoice();});
 onMount(()=>{const releaseMotion=retainIslandMotion();
  loop=observeCanvas(canvas,draw,()=>still()&&!playing,60);
  void loadIslandAssets().then(async data=>{const d=await islandPicture(data.door.file);if(!active)return;assets=data;door=d;doorReady=true;loop.invalidate();
   for(const scene of data.scenes)void islandPicture(scene.file).catch(()=>{});
  }).catch(()=>{if(active)actorFailure='进屋动作暂时没能加载，可以直接进入房间。';});
  const keyboard=(e:KeyboardEvent)=>{if(e.key==='Escape'&&playing)cancel();},hide=()=>{if(document.hidden){if(playing)cancel();stopRoomVoice();}};
  document.addEventListener('keydown',keyboard);document.addEventListener('visibilitychange',hide);
  return()=>{releaseMotion();clearTimeout(bubbleTimer);stopRoomVoice();document.removeEventListener('keydown',keyboard);document.removeEventListener('visibilitychange',hide);loop.destroy();};
 });
 onDestroy(()=>{if(!arrivedNormally&&interfaceState.roomTransitionAt===travelStamp)interfaceState.roomTransitionAt=0;active=false;complete=undefined;playing=false;});
</script>

<section class="island-stage" class:entering={playing} class:quiet={still()} aria-label="可探索的心屿小岛" aria-busy={playing} data-period={period} data-scenery={sceneryFile} data-weather={weather} data-background-swapping={backgroundSwapping} data-landscape={motionBackend} data-sky={weather==='rain'?'overcast':'clear'} data-strength={drawnStrength.toFixed(2)} data-strength-target={strength.toFixed(2)} data-ready={ready} data-mail-target={mailHovered} data-entry-phase={phase} data-actor-frame={actorFrame} data-door-frame={doorFrame} data-motion-source={usingVideo?'video':'frames'} data-motion-ready={videoReady} data-outfit={loadedOutfit} data-outfit-color={outfit.color} data-hair-color={outfit.hairColor} onpointermove={event=>{if(event.pointerType==='mouse'){const box=canvas.getBoundingClientRect();snowPointer={x:(event.clientX-box.left)/box.width,y:(event.clientY-box.top)/box.height};}}} onpointerleave={()=>snowPointer=undefined}>
 <WeatherSound {weather} intensity={strength} showControl={true}/>
 <canvas bind:this={canvas} aria-label="小屿在花园小屋前等你，白猫守在门边"></canvas>
 <div class="island-greeting"><GlassSurface/><h1>你好{companion.data.preferences.name?'，'+companion.data.preferences.name:'，小岛主人'}</h1><p><CurvedLoop text="回到心屿，慢慢说说今天。" reduced={still()}/></p></div>
 <div class="island-places" class:away={playing} inert={playing}>
  <button type="button" class="island-place cottage-place" onclick={()=>enterRoom()}><GlassSurface/><strong>聊天小屋</strong><CurvedLoop text="小屿在这里等你" reduced={still()}/></button>
  <a class="island-place memory-place" href="#/memories" onpointerenter={()=>setMail(true)} onpointerleave={()=>setMail(false)} onfocus={()=>setMail(true)} onblur={()=>setMail(false)}><GlassSurface/><strong>记忆邮筒</strong><CurvedLoop text="珍藏想记住的瞬间" reduced={still()}/></a>
  <a class="island-place growth-place" href="#/growth"><GlassSurface/><strong>成长花园</strong><CurvedLoop text="给自己一个小愿望" reduced={still()}/></a>
  <a class="island-place mood-place" href="#/emotion"><GlassSurface/><strong>心情窗台</strong><CurvedLoop text="记录此刻的心情" reduced={still()}/></a>
 </div>
 <a class="island-mailbox" href="#/memories" aria-label="打开记忆邮筒" inert={playing} onpointerenter={()=>setMail(true)} onpointerleave={()=>setMail(false)} onfocus={()=>setMail(true)} onblur={()=>setMail(false)}></a>
 <button type="button" class="island-hotspot island-character" aria-label="和岛上的小屿打招呼" disabled={!ready||playing} onclick={event=>interact('character',event.currentTarget)}></button>
 <button type="button" class="island-hotspot island-cat" aria-label="摸摸岛上的小猫" disabled={!ready||playing} onclick={event=>interact('cat',event.currentTarget)}></button>
 <button type="button" class="island-audio" aria-pressed={companion.data.preferences.sound} onclick={toggleSound}>{companion.data.preferences.sound?'互动语音已开启':'开启互动语音'}</button>
 {#if speech&&bubbleTarget}{#key bubbleKey}<RoomBubble anchor={bubbleTarget} {caption} text={speech} {speaker} reduced={still()} ondismiss={()=>speech=''}/>{/key}{/if}
 <button type="button" class="island-enter xy-btn primary" onpointerenter={()=>entryFlap++} onfocus={()=>entryFlap++} aria-label={playing?'小屿正在开门…':'和小屿聊聊'} aria-disabled={playing} onclick={()=>enterRoom()}><span class="entry-mark" aria-hidden="true">···</span><span class="entry-copy"><strong><SplitFlapText text={playing?'小屿正在开门…':'和小屿聊聊'} pulse={entryFlap} reduced={still()}/></strong><small>{playing?'沿着小路，一起回房间':'走进小屋，把今天说给我听'}</small></span><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button>
 {#if playing}<button type="button" class="island-cancel" onclick={cancel}>取消进屋</button><p class="island-step" role="status">{labels[phase]||'一起回房间。'}</p>{/if}
 {#if failure}<div class="island-failure" role="status"><span>{failure}</span><button type="button" onclick={()=>epoch++}>重试素材</button><a href="#/chat">直接进入房间 →</a></div>{/if}
</section>

<style>
 .island-stage{position:relative;width:100%;aspect-ratio:3;overflow:hidden;border-radius:16px;background:var(--xy-header);isolation:isolate;box-shadow:0 6px 24px color-mix(in srgb,var(--xy-ink) 8%,transparent)}
 canvas{display:block;position:absolute;inset:0;width:100%;height:100%}
 .island-greeting{position:absolute;top:22px;left:24px;padding:14px 18px;border-radius:12px;background:transparent;isolation:isolate;box-shadow:0 3px 12px #30296812;color:var(--xy-ink)}
 .island-greeting h1{font-size:24px;font-weight:750;line-height:1.4;max-width:22ch;text-wrap:balance}.island-greeting p{font-size:14px;line-height:1.6;color:var(--xy-secondary);margin-top:4px}
 .island-place{position:absolute;display:grid;gap:2px;min-width:154px;min-height:56px;text-decoration:none;padding:10px 14px;border:1px solid transparent;background:transparent;isolation:isolate;color:var(--xy-ink);border-radius:12px;text-align:left;box-shadow:0 4px 15px #30296820;transition:translate .16s ease-out,box-shadow .16s ease-out}
 .island-place strong{font-size:16px;font-weight:650;line-height:1.4}.island-place:hover{translate:0 -3px;box-shadow:0 5px 20px #30296830}
 .cottage-place{left:46%;top:7%}.memory-place{left:15%;top:51%}.growth-place{left:67%;top:56%}.mood-place{left:81%;top:12%}
 .island-mailbox,.island-hotspot{position:absolute;display:block;border:0;background:transparent;cursor:pointer;outline:none;border-radius:12px}
 .island-mailbox{left:24.9%;top:43%;width:6.3%;height:25%}.island-character{left:43.6%;top:44.5%;width:4.2%;height:17.5%}.island-cat{left:48.5%;top:47%;width:5.2%;height:12%}
 .island-mailbox:focus-visible::after,.island-hotspot:focus-visible::after{content:'';position:absolute;left:50%;bottom:1px;translate:-50% 0;width:10px;height:10px;background:var(--xy-accent);border:2px solid var(--xy-panel);border-radius:2px;rotate:45deg}
 .island-audio{position:absolute;right:15px;bottom:15px;min-height:40px;padding:8px 12px;border:1px solid color-mix(in srgb,var(--xy-panel) 55%,transparent);background:color-mix(in srgb,var(--xy-panel) 65%,transparent);backdrop-filter:blur(12px);color:var(--xy-ink);border-radius:10px;font-size:12px;cursor:pointer}
 .island-places{opacity:1;transition:opacity .15s ease-out}.island-places.away{opacity:0;pointer-events:none}
 .island-enter{position:absolute;left:48%;bottom:3%;translate:-50% 0;min-width:290px;min-height:68px;font-size:20px!important;padding:10px 22px!important;box-shadow:0 0 0 2px #fff3dcb0,0 7px 0 #8c598d,0 12px 28px #30234a45;gap:14px;z-index:2;background:#f2bfd2!important;color:#432b55!important;border:2px solid #b675a3!important;border-radius:12px;transition:background-color .15s,box-shadow .15s,scale .15s}
 .island-enter:hover{background:#ffd2dc!important;box-shadow:0 0 0 3px #fff3dcd0,0 7px 0 #8c598d,0 14px 32px #30234a55}.island-enter:active{scale:.96}.entry-copy{display:grid;text-align:left;gap:2px}.entry-copy strong{font-size:20px;line-height:1.4}.entry-copy small{font-size:12px;font-weight:400;line-height:1.4;color:#61446d}.entry-mark{font-size:22px;line-height:28px;width:34px;height:32px;border:2px solid currentColor;border-radius:6px;box-shadow:3px 3px 0 #fff5df80;align-self:center}.island-enter:focus-visible{outline:3px solid var(--xy-ink);outline-offset:5px}
 .island-enter[aria-disabled=true]{opacity:.82;cursor:wait}.island-cancel{position:absolute;right:20px;top:20px;min-height:40px;padding:7px 13px;border-radius:8px;background:var(--xy-panel);color:var(--xy-ink);border:1px solid var(--xy-border);font-size:14px}
 .island-step{position:absolute;bottom:18px;right:20px;color:var(--xy-ink);background:var(--xy-panel);padding:7px 12px;font-size:14px;border-radius:8px}
 .island-failure{position:absolute;left:20px;right:20px;bottom:70px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 18px;background:var(--xy-panel);color:var(--xy-ink);border:1px solid var(--xy-border);border-radius:12px;font-size:14px}.island-failure button,.island-failure a{min-height:40px;display:flex;align-items:center;text-decoration:underline;text-underline-offset:3px}.island-failure button{border:0;background:transparent;color:inherit}
 .quiet *{transition:none!important}
</style>
