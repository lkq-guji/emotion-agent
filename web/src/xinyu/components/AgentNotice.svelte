<script lang="ts">
 import {agentState,agentManual} from '../agent.svelte';
 import {companion,notify} from '../state.svelte';
 let collapsed=$state(false);
 let due=$derived(agentState.items.filter(i=>i.status==='due'));
 async function done(){const item=due[0];if(!item)return;try{await agentManual(item.kind==='focus'?'manage_focus':'manage_reminder',{operation:'complete',id:item.id});notify('已记下，这一小步完成了。');}catch(error){notify(String(error).replace(/^Error: /,''));}}
</script>
{#if !companion.locked&&agentState.ready&&due.length}
 <aside class="agent-notice" class:collapsed aria-label="到期的小约定">
  {#if collapsed}<button class="notice-chip" type="button" onclick={()=>collapsed=false}>✦ 有 {due.length} 个小约定到时间了</button>
  {:else}
   <div class="notice-top"><span>小屿留给你的提醒</span><button class="icon-btn" type="button" aria-label="收起到期提醒" onclick={()=>collapsed=true}>×</button></div>
   <h2>{due[0].kind==='focus'?'这一段计时结束了':'约定的时间到了'}</h2><p>{due[0].title}</p>
   {#if due.length>1}<small>还有 {due.length-1} 个小约定，可以去成长页看看。</small>{/if}
   <div class="xy-actions"><a class="xy-btn" href="#/growth">看看我的约定</a><button class="xy-btn primary" type="button" disabled={!!agentState.updating} onclick={done}>{due[0].kind==='focus'?'记下这段计时':'我完成了'}</button></div>
  {/if}
 </aside>
{/if}
<style>
 .agent-notice{position:fixed;z-index:90;right:24px;bottom:116px;width:340px;max-width:calc(100vw - 48px);padding:16px;border:1px solid color-mix(in srgb,var(--xy-accent) 35%,var(--xy-border));border-radius:14px;background:color-mix(in srgb,var(--xy-panel) 88%,transparent);backdrop-filter:blur(18px);box-shadow:0 8px 32px color-mix(in srgb,var(--xy-ink) 12%,transparent);color:var(--xy-ink)}.notice-top{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--xy-secondary)}.notice-top>button{margin-left:auto;min-width:40px;min-height:40px;font-size:20px}.agent-notice h2{font-size:16px;margin:4px 0 8px;text-wrap:balance}.agent-notice p{font-size:14px;line-height:1.8;margin:0 0 8px;overflow-wrap:anywhere}.agent-notice small{font-size:12px;color:var(--xy-secondary)}.xy-actions{display:flex;justify-content:flex-end;gap:8px;margin:12px 0 0}.xy-actions>*{min-height:40px;font-size:13px}.collapsed{width:auto;padding:0;border-radius:10px}.notice-chip{min-height:44px;border:0;background:transparent;color:var(--xy-ink);padding:10px 14px;font-size:14px}
</style>
