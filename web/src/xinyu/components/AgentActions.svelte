<script lang="ts">
 import {agentState,confirmAgentAction,rejectAgentAction,actionLabels,localDateInput,type AgentAction} from '../agent.svelte';
 import {companion,notify} from '../state.svelte';
 let {conversationId='',characterId=''}:{conversationId?:string;characterId?:string}=$props();
 let dates=$state<Record<string,string>>({});
 let visible=$derived(agentState.actions.filter(a=>!conversationId||(a.conversation_id===conversationId&&a.character_id===characterId)));
 let pending=$derived(visible.filter(a=>a.status==='pending'));
 let processed=$derived(visible.filter(a=>a.status!=='pending').slice(0,8));
 function title(action:AgentAction){return action.args.title||action.args.text||agentState.items.find(i=>i.id===action.args.id)?.title||actionLabels[action.tool]||'这项安排';}
 async function confirm(action:AgentAction){
  try{const value=dates[action.id],key=action.tool==='create_goal'?'remindAt':'at';await confirmAgentAction(action,value?{[key]:new Date(value).toISOString()}:undefined);notify(action.tool==='remember_preference'?'这条记忆已保存，你可以随时修改或删除。':'已确认，安排已保存。');}
  catch(error){notify(String(error).replace(/^Error: /,''));}
 }
 async function reject(id:string){try{await rejectAgentAction(id);notify('已取消，不会执行这项安排。');}catch(error){notify(String(error).replace(/^Error: /,''));}}
</script>
{#if pending.length||processed.length}
 <section class="agent-actions" aria-label="小屿的安排">
  {#if pending.length}<div class="agent-actions-heading"><strong>一起确认这个小约定</strong><span>确认前尚未执行</span></div>{/if}
  {#each pending as action (action.id)}
   <article class="agent-action-card" aria-label={'待确认：'+actionLabels[action.tool]}>
    <div class="action-kind"><span class="action-square" aria-hidden="true"></span>{actionLabels[action.tool]}<span>待你确认</span></div>
    <h3>{title(action)}</h3>
    {#if action.args.steps?.length}<ol>{#each action.args.steps as step}<li>{step}</li>{/each}</ol>{/if}
    {#if action.args.focusMinutes||action.args.minutes}<p class="action-detail">专注计时 {action.args.focusMinutes||action.args.minutes} 分钟</p>{/if}
    {#if action.args.operation&&action.args.operation!=='create'&&action.args.operation!=='start'}<p class="action-detail">{{reschedule:'调整提醒时间',cancel:'取消这项约定',complete:'标记完成'}[action.args.operation]||action.args.operation}</p>{/if}
    {#if action.args.status}<p class="action-detail">{{active:'恢复目标',completed:'完成目标，同时结束关联提醒和计时',cancelled:'取消目标及关联提醒和计时'}[action.args.status]}</p>{/if}
    {#if action.args.remindAt||action.args.at}
     <label class="action-time" for={'action-time-'+action.id}>提醒时间 <small>可在确认前调整</small></label>
     <input id={'action-time-'+action.id} type="datetime-local" step="1" value={dates[action.id]??localDateInput(action.args.remindAt||action.args.at)} oninput={e=>dates[action.id]=e.currentTarget.value}/>
    {/if}
    {#if action.tool==='remember_preference'}<p class="action-detail">只保存你明确同意的内容，可在记忆页更正或删除。</p>{/if}
    <div class="xy-actions"><button class="xy-btn" type="button" disabled={!!agentState.updating||agentState.busy||companion.locked} onclick={()=>reject(action.id)}>暂不安排</button><button class="xy-btn primary" type="button" disabled={!!agentState.updating||agentState.busy||companion.locked||(action.tool==='remember_preference'&&!companion.data.preferences.memoryEnabled)} onclick={()=>confirm(action)}>{agentState.updating===action.id?'正在保存…':action.tool==='remember_preference'?'确认保存记忆':'确认并执行'}</button></div>
   </article>
  {/each}
  {#if processed.length}<details class="agent-processed"><summary>{processed.length} 项安排已处理</summary>{#each processed as action (action.id)}<div><span>{actionLabels[action.tool]}</span><strong>{action.status==='executed'?'已执行':action.status==='expired'?'已过期':'已取消'}</strong><small>{action.result}</small></div>{/each}</details>{/if}
 </section>
{/if}
<style>
 .agent-actions{margin:12px 0;min-width:0}.agent-actions-heading{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px;font-size:14px}.agent-actions-heading>span{color:var(--xy-secondary);font-size:12px}
 .agent-action-card{border:1px solid var(--xy-border);border-radius:12px;padding:14px;background:color-mix(in srgb,var(--xy-panel) 76%,transparent);backdrop-filter:blur(14px);box-shadow:0 3px 12px color-mix(in srgb,var(--xy-ink) 5%,transparent);margin:10px 0;min-width:0;color:var(--xy-ink)}
 .action-kind{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--xy-secondary)}.action-kind>span:last-child{margin-left:auto}.action-square{width:8px;height:8px;background:var(--xy-accent);box-shadow:2px 2px 0 color-mix(in srgb,var(--xy-accent) 25%,transparent)}h3{font-size:15px;line-height:1.65;margin:8px 0;overflow-wrap:anywhere;text-wrap:pretty}ol{padding-left:20px;margin:8px 0;font-size:14px;line-height:1.8}.action-detail{font-size:13px;line-height:1.7;color:var(--xy-secondary);margin:6px 0}
 .action-time{display:flex;gap:8px;align-items:center;font-size:13px;margin-top:10px}.action-time small{color:var(--xy-secondary);font-size:12px}.agent-action-card input{width:100%;min-width:0;min-height:40px;margin-top:5px;font-size:14px;color:var(--xy-ink);background:var(--xy-panel);border:1px solid var(--xy-border);border-radius:8px;padding:8px 10px;font-variant-numeric:tabular-nums}
 .xy-actions{justify-content:flex-end;gap:8px;margin-top:12px}.xy-actions button{min-height:40px;font-size:13px;transition:background-color .15s,transform .12s}.xy-actions button:active:not(:disabled){transform:scale(.96)}.agent-processed{font-size:12px;color:var(--xy-secondary);padding:5px 0}.agent-processed summary{cursor:pointer;min-height:40px;display:flex;align-items:center;gap:8px}.agent-processed summary:before{content:'▸'}.agent-processed[open] summary:before{content:'▾'}.agent-processed>div{display:flex;flex-wrap:wrap;gap:6px 12px;padding:8px 0;border-top:1px solid var(--xy-border)}.agent-processed strong{font-weight:500;color:var(--xy-ink)}.agent-processed small{width:100%;font-size:12px}
 @media(prefers-reduced-motion:reduce){.xy-actions button{transition:none}}
</style>
