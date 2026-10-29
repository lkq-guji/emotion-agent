<script lang="ts">
 import {onMount,tick} from 'svelte';
 import {companion,unlock} from '../state.svelte';
 import {appearanceMode,displayTheme} from '../theme';
 import ParticleText from './ParticleText.svelte';
 import PixelIcon from './PixelIcon.svelte';
 import LockAtmosphere from './LockAtmosphere.svelte';
 import CodeSlots from './CodeSlots.svelte';
 import {prefersReducedMotion} from 'svelte/motion';
 let pin=$state(''),error=$state(''),busy=$state(false),clock=$state(Date.now()),status=$state<'idle'|'error'|'success'>('idle'),input:ReturnType<typeof CodeSlots>;
 let night=$derived(displayTheme(appearanceMode(companion.data.preferences.appearanceMode,companion.data.preferences.theme),companion.data.preferences.brightness,clock)==='night');
 function edit(){error='';status='idle';}
 async function submit(event:SubmitEvent){event.preventDefault();if(busy)return;busy=true;error='';status='idle';try{await unlock(pin,async()=>{status='success';if(!companion.data.preferences.reduceMotion&&!prefersReducedMotion.current)await new Promise(resolve=>setTimeout(resolve,240));});pin='';}catch(e){error=String(e).replace(/^Error: /,'');status='error';}finally{busy=false;if(error){await tick();input?.focus();}}}
 onMount(()=>{if(matchMedia('(min-width: 761px)').matches)input?.focus();const timer=setInterval(()=>clock=Date.now(),30000);return()=>clearInterval(timer);});
</script>
<main class="xy-lock" data-theme={night?'night':'light'}>
 <header class="lock-brand"><PixelIcon src="/xinyu/art/logo_cloud.png" size={46}/><div><ParticleText reduced={companion.data.preferences.reduceMotion}/><span>让每一种情绪都有回声</span></div></header>
 <div class="lock-layout"><section class="lock-world" aria-label="等你回来的像素小岛"><h2><ParticleText text="小岛的灯，为你留着" large reduced={companion.data.preferences.reduceMotion}/></h2><LockAtmosphere {night}/></section>
 <section class="lock-panel"><form onsubmit={submit} aria-label="解锁你的私人空间"><h1>你的小岛，安心停靠</h1><p>输入应用密码，回到你的私人空间。</p><label for="unlock-pin">应用密码</label><CodeSlots bind:this={input} id="unlock-pin" bind:value={pin} length={companion.data.lock?.digits} disabled={busy&&status!=='success'} {status} describedBy={error?'unlock-error':''} reduced={companion.data.preferences.reduceMotion} onedit={edit}/>{#if error}<p id="unlock-error" class="unlock-error" role="alert">{error}</p>{/if}<button class="unlock-button" disabled={busy||pin.length<(companion.data.lock?.digits||6)}>{status==='success'?'欢迎回到心屿':busy?'正在解锁…':'解锁心屿'}<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button><small>应用锁保护界面访问；设备存储由你的系统账号保护。</small></form></section></div>
</main>
<style>
 .xy-lock{--xy-pink:#dc759d;--xy-page:#f8f6fd;--xy-panel:#fffefa;--xy-selected:#e5dff2;--xy-ink:#302968;--xy-secondary:#69658a;--xy-border:#e0dbed;--xy-accent:#7e6bb9;box-sizing:border-box;width:100%;height:100dvh;overflow:auto;background:var(--xy-page);color:var(--xy-ink);font-family:'Noto Sans SC','Microsoft YaHei',sans-serif;padding:32px clamp(24px,6vw,100px) 40px;caret-color:var(--xy-accent)}
 .xy-lock[data-theme=night]{--xy-page:#1c1d2c;--xy-panel:#2b293d;--xy-selected:#4b405d;--xy-ink:#f1eaf8;--xy-secondary:#c1b8d0;--xy-border:#504760;--xy-accent:#bba0e5;color-scheme:dark}
 .lock-brand{display:flex;align-items:center;gap:12px;max-width:1250px;margin:auto}.lock-brand span{display:block;font-size:12px;color:var(--xy-secondary);margin-top:4px}
 .lock-layout{max-width:1250px;min-height:calc(100dvh - 155px);margin:auto;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,.9fr);align-items:center;gap:clamp(40px,7vw,100px)}
 .lock-world h2{font-size:clamp(22px,2.2vw,32px);font-weight:600;line-height:1.5;text-align:center;margin:24px 0 0}.lock-panel{width:100%;max-width:420px;padding:35px 0}.lock-panel h1{font-size:clamp(24px,2.3vw,32px);line-height:1.6;font-weight:700;margin:0}.lock-panel form>p{font-size:14px;line-height:1.9;color:var(--xy-secondary);margin:12px 0 30px}.lock-panel label{display:block;font-size:14px;font-weight:600;margin-bottom:10px}.unlock-button{margin-top:20px;display:flex;width:100%;align-items:center;justify-content:space-between;min-height:52px;background:#b18bcd;color:#342247;border:1px solid #a07abd;border-radius:9px;padding:12px 18px;font:600 16px/1.5 'Noto Sans SC','Microsoft YaHei',sans-serif;cursor:pointer}.unlock-button:hover:enabled{background:#c0a0d6}.unlock-button:focus-visible{outline:3px solid var(--xy-accent);outline-offset:3px}.unlock-button:disabled{opacity:.6;cursor:default}.lock-panel small{display:block;font-size:12px;line-height:1.9;color:var(--xy-secondary);margin-top:24px}.lock-panel .unlock-error{margin:12px 0 0;font-size:14px;color:var(--xy-ink)}
 @media(max-width:760px){.xy-lock{padding:20px 22px 32px}.lock-layout{grid-template-columns:minmax(0,1fr);gap:8px;min-height:0;max-width:440px}.lock-world h2{font-size:22px;margin-top:30px}.lock-panel{padding:25px 0 0;max-width:none}.lock-panel h1{font-size:25px}.lock-panel form>p{margin:8px 0 22px}}
</style>
