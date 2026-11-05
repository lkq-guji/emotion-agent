<script lang="ts">
 import {agentState,agentManual,deleteAgentItem,refreshAgent,itemStatus,localDateInput,type AgentItem} from '../agent.svelte';
 import {companion,updateData,notify} from '../state.svelte';
 import {interfaceState} from '../interfaceState.svelte';
 import {refreshGateway,pruneBackups} from '../bridge.svelte';
 import {cleanText} from '../domain';
 import AgentActions from './AgentActions.svelte';
 import ConfirmDialog from './ConfirmDialog.svelte';
 let tab=$state('goal'),kind=$state('goal'),title=$state(''),steps=$state(''),minutes=$state(25),time=$state(localDateInput(Date.now()+3600000));
 let toDelete=$state<AgentItem|null>(null),legacyDelete=$state(''),editingTime=$state(''),newTime=$state('');
 let open=$derived(agentState.items.filter(i=>['active','scheduled','running','due'].includes(i.status)));
 let shown=$derived(tab==='history'?agentState.items.filter(i=>!['active','scheduled','running','due'].includes(i.status)):open.filter(i=>i.kind===tab));
 const format=(value:number)=>new Date(value).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
 function remaining(item:AgentItem){const seconds=Math.max(0,Math.ceil(((item.due_at||0)-interfaceState.now)/1000));return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
 async function perform(fn:()=>void|Promise<unknown>){try{await fn();}catch(error){notify(String(error).replace(/^Error: /,''));}}
 async function submit(event:SubmitEvent){
  event.preventDefault();
  await perform(async()=>{
   if(kind==='goal')await agentManual('create_goal',{title:title.trim(),steps:steps.split('\n').map(s=>s.trim()).filter(Boolean)});
   else if(kind==='focus')await agentManual('manage_focus',{operation:'start',title:title.trim(),minutes:Number(minutes)});
   else await agentManual('manage_reminder',{operation:'create',title:title.trim(),at:new Date(time).toISOString()});
   tab=kind;title='';steps='';notify('已保存，这个小约定会留在岛上。');
  });
 }
 function review(item?:AgentItem){interfaceState.chatDraft=item?'我想回顾一下“'+item.title+'”的进展，帮我一起整理下一小步。':'帮我安排一个今天可以完成的小目标，先问问我的想法。';location.hash='/chat';}
 function goalStatus(item:AgentItem,status:string){return perform(()=>agentManual('update_goal',{id:item.id,status}));}
 function change(item:AgentItem,operation:string){return perform(()=>agentManual(item.kind==='focus'?'manage_focus':'manage_reminder',{id:item.id,operation}));}
 function snooze(item:AgentItem){return perform(()=>agentManual('manage_reminder',{operation:'reschedule',id:item.id,at:new Date(Date.now()+10*60000).toISOString()}));}
 async function reschedule(event:SubmitEvent,item:AgentItem){event.preventDefault();await perform(async()=>{await agentManual('manage_reminder',{operation:'reschedule',id:item.id,at:new Date(newTime).toISOString()});editingTime='';notify('提醒时间已更新。');});}
 async function eraseTask(){const item=toDelete;if(!item)return;await deleteAgentItem(item.id);if(item.details.legacyId)await pruneBackups(()=>updateData(data=>data.goals=data.goals.filter(g=>g.id!==item.details.legacyId)));}
 function legacyAdd(event:SubmitEvent){event.preventDefault();void perform(()=>{updateData(data=>data.goals.unshift({id:crypto.randomUUID(),text:cleanText(title,120),at:Date.now()}));title='';});}
</script>
<section class="xy-panel agent-workspace" aria-label="我的小约定">
 <div class="workspace-heading"><div><h2>我的小约定</h2><p>一点点安排，也可以慢慢完成。</p></div><button class="text-button" type="button" onclick={()=>review()}>和小屿一起安排 →</button></div>
 {#if agentState.available}
  {#if agentState.error}<div class="workspace-error" role="alert"><p>{agentState.error} 已有记录会保留。</p><button class="xy-btn" type="button" onclick={()=>refreshAgent()}>重新连接</button></div>{/if}
  {#if !agentState.loaded}<p class="module-empty" role="status">正在读取岛上的约定…</p>
  {:else}
   <AgentActions/>
   <form class="task-form" onsubmit={submit}>
    <div class="task-title-row"><label for="task-kind" class="sr-only">安排类型</label><select id="task-kind" bind:value={kind}><option value="goal">一个小目标</option><option value="reminder">一条提醒</option><option value="focus">一段专注</option></select><label for="task-title" class="sr-only">小约定的内容</label><input id="task-title" bind:value={title} maxlength="120" required placeholder={kind==='goal'?'今天想做的一件小事':kind==='reminder'?'到时候提醒我…':'这段时间想专注什么？'}/></div>
    {#if kind==='goal'}<label class="task-optional" for="goal-steps">小步骤 <span>可选，每行一步，最多五步</span></label><textarea id="goal-steps" bind:value={steps} rows="2" maxlength="600" placeholder="例如：复习十个单词"></textarea>{/if}
    {#if kind==='focus'}<label class="task-optional" for="focus-minutes">专注计时（分钟）</label><input id="focus-minutes" type="number" min="1" max="180" step="1" bind:value={minutes} required/>{/if}
    {#if kind==='reminder'}<label class="task-optional" for="reminder-at">什么时候提醒</label><input id="reminder-at" type="datetime-local" step="1" bind:value={time} required/>{/if}
    <div class="task-submit"><span>{kind==='reminder'?'后台运行时，在应用内提示你':kind==='focus'?'按实际经过时间计时，可随时结束':'写下一个属于自己的小目标'}</span><button class="xy-btn primary" disabled={!title.trim()||!!agentState.updating||!agentState.ready}>{agentState.updating?'正在保存…':kind==='goal'?'创建小目标':kind==='reminder'?'设置提醒':'开始专注'}</button></div>
   </form>
   <nav class="xy-tabs task-tabs" aria-label="约定分类">{#each [{id:'goal',label:'目标'},{id:'reminder',label:'提醒'},{id:'focus',label:'专注'},{id:'history',label:'已结束'}] as t}<button type="button" class:chosen={tab===t.id} aria-pressed={tab===t.id} onclick={()=>tab=t.id}>{t.label}{#if t.id!=='history'}<span>{open.filter(i=>i.kind===t.id).length}</span>{/if}</button>{/each}</nav>
   <div class="task-list">
    {#each shown as item (item.id)}
     <article class="task-row" class:task-due={item.status==='due'} aria-label={item.title}>
      <div class="task-info"><span class="task-status">{itemStatus[item.status]||item.status}</span><h3>{item.title}</h3>{#if item.kind==='focus'&&['running','due'].includes(item.status)}<strong class="focus-countdown" role="timer" aria-live="off">{remaining(item)}</strong>{:else if item.due_at}<time datetime={new Date(item.due_at).toISOString()}>{format(item.due_at)}</time>{:else}<time datetime={new Date(item.created_at).toISOString()}>{format(item.created_at)} 留下的目标</time>{/if}
       {#if item.details.steps?.length}<details class="task-steps"><summary>看看小步骤</summary><ol>{#each item.details.steps as step}<li>{step}</li>{/each}</ol></details>{/if}
       {#if item.kind==='reminder'&&['scheduled','due'].includes(item.status)}{#if editingTime===item.id}<form class="reminder-edit" onsubmit={event=>reschedule(event,item)}><label for={'reschedule-'+item.id}>新的提醒时间</label><input id={'reschedule-'+item.id} type="datetime-local" step="1" bind:value={newTime} required/><div class="xy-actions"><button type="button" class="xy-btn" onclick={()=>editingTime=''}>撤销</button><button class="xy-btn primary" disabled={!!agentState.updating||!agentState.ready}>保存时间</button></div></form>{:else}<button class="text-button" type="button" disabled={!!agentState.updating||!agentState.ready} onclick={()=>{editingTime=item.id;newTime=localDateInput(item.due_at);}}>调整时间</button>{/if}{/if}
      </div>
      <div class="task-controls">
       {#if item.kind==='goal'}{#if item.status==='active'}<button class="xy-btn" type="button" disabled={!!agentState.updating||!agentState.ready} title="完成目标，同时结束关联提醒和计时" onclick={()=>goalStatus(item,'completed')}>完成目标</button><button class="text-button" type="button" disabled={!!agentState.updating||!agentState.ready} onclick={()=>goalStatus(item,'cancelled')}>先放下</button>{:else}<button class="xy-btn" type="button" disabled={!!agentState.updating||!agentState.ready} onclick={()=>goalStatus(item,'active')}>恢复目标</button>{/if}
       {:else if ['running','scheduled','due'].includes(item.status)}<button class="xy-btn" type="button" disabled={!!agentState.updating||!agentState.ready} onclick={()=>change(item,'complete')}>{item.kind==='focus'?'结束计时':'我完成了'}</button>{#if item.kind==='reminder'}<button class="text-button" type="button" disabled={!!agentState.updating||!agentState.ready} onclick={()=>snooze(item)}>十分钟后提醒</button>{/if}<button class="text-button" type="button" disabled={!!agentState.updating||!agentState.ready} onclick={()=>change(item,'cancel')}>取消{item.kind==='focus'?'计时':'提醒'}</button>{/if}
       <button class="text-button" type="button" onclick={()=>review(item)}>和小屿回顾</button><button class="text-button danger-text" type="button" disabled={!!agentState.updating||!agentState.ready} onclick={()=>toDelete=item}>删除记录</button>
      </div>
     </article>
    {:else}<div class="task-empty"><span aria-hidden="true">✦</span><p>{tab==='history'?'完成或放下的小约定，会留在这里。':'这里还没有'+{goal:'小目标',reminder:'提醒',focus:'专注计时'}[tab]+'。从一件小事开始就好。'}</p></div>{/each}
   </div>
  {/if}
 {:else}
  <p class="workspace-local">当前使用浏览器里的小目标。启动本机后台后，还可以使用提醒和专注计时。</p><button class="text-button" type="button" onclick={()=>perform(()=>refreshGateway())}>检查本机连接</button>
  <form class="goal-form" onsubmit={legacyAdd}><label for="goal-text" class="sr-only">新的小目标</label><input id="goal-text" bind:value={title} maxlength="120" placeholder="今天，想为自己做一件什么小事？"/><button class="xy-btn primary" disabled={!title.trim()}>种下目标</button></form>
  <div class="goal-list">{#each companion.data.goals as goal}<article class:completed={!!goal.completedAt}><label><input type="checkbox" checked={!!goal.completedAt} onchange={()=>perform(()=>updateData(data=>{const item=data.goals.find(g=>g.id===goal.id);item.completedAt=item.completedAt?undefined:Date.now();item.status=item.completedAt?'completed':'active';}))}/><span>{goal.text}<small>{goal.completedAt?'完成于 '+format(goal.completedAt):'从一点点开始就好'}</small></span></label><button class="text-button danger-text" type="button" onclick={()=>legacyDelete=goal.id}>删除</button></article>{:else}<p class="module-empty">留下一个你愿意开始的小目标。</p>{/each}</div>
 {/if}
</section>
{#if toDelete}<ConfirmDialog destructive title="删除这项约定？" description="记录将从本机任务库移除；如果是目标，其关联提醒和计时也会一起删除。原对话中的文字可单独删除来源对话。" confirmText="删除记录" onclose={()=>toDelete=null} onconfirm={eraseTask}/>{/if}
{#if legacyDelete}<ConfirmDialog destructive title="删除这条记录？" description="当前目标及其本机历史备份将被清理。" confirmText="删除" onclose={()=>legacyDelete=''} onconfirm={()=>pruneBackups(()=>updateData(data=>data.goals=data.goals.filter(g=>g.id!==legacyDelete)))}/>{/if}
<style>
 .agent-workspace{min-width:0}.workspace-heading{display:flex;justify-content:space-between;gap:14px;align-items:start;flex-wrap:wrap}.workspace-heading h2{margin-bottom:6px}.workspace-heading p{font-size:14px;color:var(--xy-secondary);margin:0 0 12px}.workspace-heading>button{min-height:40px}
 .workspace-error{padding:12px;border:1px solid var(--xy-border);border-radius:10px;background:var(--xy-selected)}.workspace-error p,.workspace-local{font-size:14px;line-height:1.7;color:var(--xy-secondary)}
 .task-form{padding:14px;border-radius:12px;background:color-mix(in srgb,var(--xy-selected) 45%,var(--xy-panel));margin:12px 0 18px;border:1px solid var(--xy-border)}
 .task-title-row{display:flex;gap:8px}.task-title-row select{width:136px;flex:none}.task-title-row input{flex:1;min-width:0}
 .task-form input,.task-form select,.task-form textarea{min-height:40px;color:var(--xy-ink);background:var(--xy-panel);border:1px solid var(--xy-border);border-radius:8px;padding:9px 10px;font-size:14px;max-width:100%}.task-form textarea{width:100%;resize:vertical}.task-form input[type=number]{width:120px;font-variant-numeric:tabular-nums}.task-form input[type=datetime-local]{width:100%;font-variant-numeric:tabular-nums}.task-optional{display:flex;gap:8px;align-items:center;font-size:13px;margin:10px 0 6px}.task-optional span{font-size:12px;color:var(--xy-secondary)}
 .task-submit{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px}.task-submit>span{font-size:12px;color:var(--xy-secondary);line-height:1.6}.task-submit button{flex:none;min-height:40px;font-size:14px}
 .task-tabs{display:flex;gap:5px;flex-wrap:wrap;margin:12px 0}.task-tabs button{min-height:40px;font-size:14px;display:flex;align-items:center;gap:6px}.task-tabs button span{font-size:12px;font-variant-numeric:tabular-nums;opacity:.75}
 .task-row{padding:16px 0;border-top:1px solid var(--xy-border);display:flex;gap:12px;align-items:start;flex-wrap:wrap}.task-info{flex:1;min-width:180px}.task-row h3{font-size:15px;line-height:1.7;overflow-wrap:anywhere;margin:5px 0}.task-row time{font-size:12px;color:var(--xy-secondary);font-variant-numeric:tabular-nums}.task-status{font-size:12px;color:var(--xy-secondary)}.task-due .task-status{color:var(--xy-accent);font-weight:600}.task-controls{display:flex;align-items:center;gap:5px 12px;flex-wrap:wrap;margin-left:auto;max-width:100%}.task-controls button{min-height:40px;font-size:12px}.task-controls .xy-btn{font-size:13px}
 .focus-countdown{display:block;font-size:28px;line-height:1.6;letter-spacing:.06em;font-weight:500;font-variant-numeric:tabular-nums}.task-steps{font-size:13px;line-height:1.8;color:var(--xy-secondary);margin-top:6px}.task-steps summary{min-height:40px;cursor:pointer;display:list-item;align-content:center}.task-steps ol{padding-left:20px;margin:4px 0}.task-empty{text-align:center;padding:24px 12px;color:var(--xy-secondary);font-size:14px;line-height:1.8}.task-empty>span{font-size:22px;color:var(--xy-accent)}
 .agent-workspace button{transition:background-color .15s,transform .12s}.agent-workspace button:active:not(:disabled){transform:scale(.96)}@media(prefers-reduced-motion:reduce){.agent-workspace button{transition:none}}
</style>
