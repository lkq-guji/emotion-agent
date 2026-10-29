<script lang="ts">
 import {tick} from 'svelte';
 import {companion,setPin,disablePin,lockApp} from '../state.svelte';
 import CodeSlots from './CodeSlots.svelte';
 let pin=$state(''),again=$state(''),current=$state(''),changing=$state(false),closing=$state(false),busy=$state(false),error=$state('');
 let newInput=$state<ReturnType<typeof CodeSlots>>(),currentInput=$state<ReturnType<typeof CodeSlots>>();
 let pinStatus=$state<'idle'|'error'>('idle'),currentStatus=$state<'idle'|'error'>('idle');
 function edit(){error='';pinStatus='idle';currentStatus='idle';}
 async function toggle(){edit();if(companion.data.lock){closing=!closing;changing=false;current='';if(closing){await tick();currentInput?.focus();}}else{changing=!changing;closing=false;if(changing){await tick();newInput?.focus();}}}
 async function save(event:SubmitEvent){event.preventDefault();if(busy)return;busy=true;error='';try{if(pin!==again)throw new Error('两次应用密码不一致。');await setPin(pin);pin='';again='';changing=false;}catch(e){error=String(e).replace(/^Error: /,'');pinStatus='error';}finally{busy=false;if(error){await tick();newInput?.focus();}}}
 async function close(event:SubmitEvent){event.preventDefault();if(busy)return;busy=true;error='';try{await disablePin(current);current='';closing=false;}catch(e){error=String(e).replace(/^Error: /,'');currentStatus='error';}finally{busy=false;if(error){await tick();currentInput?.focus();}}}
</script>
<section class="xy-panel lock-settings"><h2>应用锁</h2><div class="setting-row"><div><strong>{companion.data.lock?'已开启':'已关闭'}</strong><p>{companion.data.lock?'每次打开需要输入应用密码。':'打开应用时可以直接回到小岛。'}</p></div><button class="xy-switch" role="switch" aria-label="应用锁" aria-checked={!!companion.data.lock} disabled={busy} onclick={toggle}><i></i></button></div>
 <p class="quiet-note">应用锁保护界面访问，不加密本地记录。请同时保护设备和系统账号。</p>
 {#if !companion.data.lock||changing}<form onsubmit={save}><label for="new-pin">{companion.data.lock?'新应用密码':'设置应用密码'}（6–12 位数字）</label><CodeSlots bind:this={newInput} id="new-pin" bind:value={pin} autocomplete="new-password" status={pinStatus} disabled={busy} describedBy={error?'lock-settings-error':''} reduced={companion.data.preferences.reduceMotion} onedit={edit}/><label for="pin-again">再次输入</label><CodeSlots id="pin-again" bind:value={again} autocomplete="new-password" status={pinStatus} disabled={busy} describedBy={error?'lock-settings-error':''} reduced={companion.data.preferences.reduceMotion} onedit={edit}/><div class="xy-actions"><button class="xy-btn primary" disabled={busy||pin.length<6||again.length<6}>{busy?'正在保存…':'保存应用密码'}</button></div></form>{/if}
 {#if companion.data.lock}<div class="xy-actions lock-actions"><button class="xy-btn" disabled={busy} onclick={lockApp}>立即锁定</button><button class="text-button" disabled={busy} onclick={()=>{changing=!changing;closing=false;error='';}}>修改密码</button></div>{/if}
 {#if closing}<form class="disable-lock" onsubmit={close}><label for="disable-lock-pin">输入当前应用密码以关闭</label><CodeSlots bind:this={currentInput} id="disable-lock-pin" bind:value={current} length={companion.data.lock?.digits} status={currentStatus} disabled={busy} describedBy={error?'lock-settings-error':''} reduced={companion.data.preferences.reduceMotion} onedit={edit}/><div class="xy-actions"><button class="xy-btn" disabled={busy||current.length<(companion.data.lock?.digits||6)}>{busy?'正在验证…':'验证并关闭应用锁'}</button><button class="text-button" type="button" disabled={busy} onclick={()=>{closing=false;current='';error='';}}>保留应用锁</button></div></form>{/if}
 {#if error}<p id="lock-settings-error" class="lock-error" role="alert">{error}</p>{/if}
</section>
<style>form{margin-top:18px}label{display:block;font-size:14px;margin:12px 0 8px}.xy-actions{margin-top:15px}.lock-actions{gap:16px}.disable-lock{border-top:1px solid var(--xy-border);padding-top:10px}.lock-error{color:var(--xy-ink);font-size:14px;margin-top:14px}</style>
