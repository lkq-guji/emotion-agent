<script lang="ts">
 import SceneLibrary from '../components/SceneLibrary.svelte';
  import PixelIcon from '../components/PixelIcon.svelte';
  import { DBState } from '../../ts/stores.svelte';
  import { companion,updateData,notify } from '../state.svelte';
  import { syncPersonalLore,selectCharacter,selectConversation,pruneBackups } from '../bridge.svelte';
  import { addMemory,cleanText,growthFrom,scenes,type Memory,type Source } from '../domain';
  import PixelRoom from '../components/PixelRoom.svelte';
  import Wardrobe from '../components/Wardrobe.svelte';
  import CompanionPortrait from '../components/CompanionPortrait.svelte';
  import {sceneMotion} from '../art';
  import EmotionJourney from '../components/EmotionJourney.svelte';
  import ProfileArchive from '../components/ProfileArchive.svelte';
  import SceneArt from '../components/SceneArt.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  let { page, initialSearch='' }: {page:string;initialSearch?:string}=$props();
  let query=$state(''),category=$state('all');
  $effect(()=>{query=initialSearch;});
  let memoryText=$state(''),memoryCategory=$state<Memory['category']>('daily'),memoryConsent=$state(false),editingMemory=$state('');
  let goalText=$state('');
  let draftAvatar=$state(companion.data.preferences.avatar);
  let confirm=$state<{title:string;description:string;label?:string;destructive?:boolean;action:()=>void|Promise<void>}|null>(null);
  let filteredMemories=$derived(companion.data.memories.filter(m=>(category==='all'||m.category===category)&&m.text.includes(query.trim())));
  let chatTimes=$derived(DBState.db.characters.flatMap(c=>c.chats.filter(chat=>chat.message.some(m=>m.role==='user')).map(chat=>chat.message.find(m=>m.role==='user')?.time)).filter(Number.isFinite));
  let growth=$derived(growthFrom(companion.data,chatTimes));
  const categoryNames={daily:'生活点滴',interest:'兴趣偏好',goal:'心愿目标',important:'重要时刻'};
  const headings={emotion:['照顾每一种情绪','开心或低落，都有被温柔接住的地方。'],memories:['我们的记忆星光','只珍藏你愿意留下的瞬间。'],profile:['慢慢认识真实的你','你来定义自己，画像可以随时修改。'],growth:['一起成长的日子','不和别人比较，记录属于自己的每一步。'],avatar:['小屿的模样','为你的陪伴，挑选一种喜欢的色调。'],scenes:['挑一个安心的角落','窗外的风景，也可以跟着心情变换。']};
  function safely(fn:()=>void){try{fn();}catch(error){notify(String(error).replace(/^Error: /,''));}}
  function enable(kind:'memoryEnabled'|'profileEnabled'){
    confirm={title:kind==='memoryEnabled'?'开启长期记忆？':'允许画像参与陪伴？',description:kind==='memoryEnabled'?'只保存你逐条确认的内容。开启后，已保存记忆可随对话发送给所选模型，你可以随时关闭或删除。':'只有你确认的画像标签会参与对话；模型推断会先标注为待确认。你可以随时更正、移除或关闭。',label:'确认开启',action:()=>{updateData(data=>data.preferences[kind]=true);syncPersonalLore();notify('已开启，你随时可以撤销。');}};
  }
  async function erase(kind:'memories'|'goals',id:string){
    confirm={destructive:true,title:'删除这条记录？',description:'此操作会删除当前记录并清理本机历史备份，无法撤销。已导出的副本需要另行处理。',action:async()=>{await pruneBackups(()=>{updateData(data=>{data[kind]=data[kind].filter(item=>item.id!==id) as never;});syncPersonalLore();});notify('记录已删除。');}};
  }
  function saveMemory(e:SubmitEvent){e.preventDefault();safely(()=>{updateData(data=>{if(editingMemory){const item=data.memories.find(m=>m.id===editingMemory);if(!item)throw new Error('这条记忆已不存在。');item.text=cleanText(memoryText);item.category=memoryCategory;}else addMemory(data,memoryText,memoryCategory,memoryConsent);});syncPersonalLore();memoryText='';memoryConsent=false;editingMemory='';notify('记忆已保存。');});}
  function addGoal(e:SubmitEvent){e.preventDefault();safely(()=>{updateData(data=>data.goals.unshift({id:crypto.randomUUID(),text:cleanText(goalText,120),at:Date.now()}));goalText='';notify('给未来的自己，留下一颗小种子。');});}
  async function openSource(source:Source){const ci=DBState.db.characters.findIndex(c=>c.chaId===source.characterId);const ti=DBState.db.characters[ci]?.chats.findIndex(c=>c.id===source.conversationId);if(ci<0||ti<0){notify('来源对话已不存在。');return;}await selectCharacter(ci);await selectConversation(ti);location.hash='/chat';}
  function formatTime(at:number){return new Date(at).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}
</script>
<div class="xy-page-heading"><div><h1>{headings[page]?.[0]}</h1><p>{headings[page]?.[1]}</p></div></div>
{#if page==='emotion'}
  <EmotionJourney/>
{:else if page==='memories'}
  <div class="xy-banner memory-banner"><div><h2><span>把重要的瞬间，</span><span>收进星光里</span></h2><p>你的记忆由你决定，只有明确同意的内容才会保存。</p></div><img src="/xinyu/art/girl_card.png" alt=""/></div>
  <div class="consent-strip"><div><strong>长期记忆{companion.data.preferences.memoryEnabled?'已开启':'尚未开启'}</strong><p>{companion.data.preferences.memoryEnabled?'已保存的记忆可参与陪伴；你随时可以撤销。':'开启后，仍需逐条同意。关闭期间不会自动记住对话。'}</p></div>{#if companion.data.preferences.memoryEnabled}<button class="xy-btn" onclick={()=>{updateData(data=>data.preferences.memoryEnabled=false);syncPersonalLore();}}>关闭记忆</button>{:else}<button class="xy-btn" onclick={()=>enable('memoryEnabled')}>了解并开启</button>{/if}</div>
  <div class="memory-layout"><section class="xy-panel"><div class="panel-title"><h2>我的记忆 <small>{filteredMemories.length} 条</small></h2></div><label class="sr-only" for="memory-search">搜索记忆</label><input class="xy-input" id="memory-search" bind:value={query} placeholder="寻找一段记忆…"/><div class="filter-tabs"><button class:chosen={category==='all'} aria-pressed={category==='all'} onclick={()=>category='all'}>全部</button>{#each Object.entries(categoryNames) as [value,label]}<button class:chosen={category===value} aria-pressed={category===value} onclick={()=>category=value}>{label}</button>{/each}</div>
    {#if filteredMemories.length}<div class="memory-timeline">{#each filteredMemories as item}<article><time>{formatTime(item.at)} <span>{categoryNames[item.category]}</span></time><p>{item.text}</p><div class="memory-actions">{#if item.source}<button class="text-button" onclick={()=>openSource(item.source)}>查看来源对话 ↗</button>{:else}<span>由你主动保存</span>{/if}<button class="text-button" onclick={()=>{editingMemory=item.id;memoryText=item.text;memoryCategory=item.category;memoryConsent=true;}}>编辑</button><button class="text-button danger-text" onclick={()=>erase('memories',item.id)}>删除</button></div></article>{/each}</div>{:else}<div class="module-empty illustrated"><PixelIcon src="/xinyu/art/nav_4.png" size={24}/><h3>{query?'没有找到这段记忆':'星光还在等第一段故事'}</h3><p>可以写下想珍藏的事，或在对话中主动保存。</p></div>{/if}</section>
    <aside><section class="xy-panel"><h2>{editingMemory?'编辑这段记忆':'留下一段记忆'}</h2>{#if !companion.data.preferences.memoryEnabled&&!editingMemory}<div class="memory-enable-note"><strong>先开启长期记忆，再留下这一刻</strong><p>开启后仍需逐条同意；只会把你明确留下的内容用于陪伴。</p><button class="xy-btn" type="button" onclick={()=>enable('memoryEnabled')}>了解并开启记忆</button></div>{/if}<form onsubmit={saveMemory}><label for="memory-text">记忆内容</label><textarea id="memory-text" rows="5" bind:value={memoryText} maxlength="2000" placeholder="例如：我喜欢下雨天听轻音乐。"></textarea><label for="memory-category">分类</label><select id="memory-category" bind:value={memoryCategory}>{#each Object.entries(categoryNames) as [value,label]}<option value={value}>{label}</option>{/each}</select>{#if !editingMemory}<label class="checkbox-label"><input type="checkbox" bind:checked={memoryConsent}/>我同意保存这条记忆，并在开启记忆时用于陪伴对话</label>{/if}<div class="xy-actions"><button class="xy-btn primary" disabled={!memoryText.trim()||(!editingMemory&&(!memoryConsent||!companion.data.preferences.memoryEnabled))}>保存记忆</button>{#if editingMemory}<button class="xy-btn" type="button" onclick={()=>{editingMemory='';memoryText='';memoryConsent=false;}}>取消编辑</button>{/if}</div></form></section><section class="xy-panel privacy-card"><h2>记忆，也有边界</h2><p>不开启，就不自动记住。<br/>不准确，就修改或删除。<br/>属于你的故事，始终由你掌握。</p><a class="text-link" href="/xinyu/privacy.html" target="_blank" rel="noreferrer">了解数据与删除方式 →</a></section></aside></div>
{:else if page==='profile'}
  <ProfileArchive/>
{:else if page==='growth'}
  <div class="xy-banner growth-banner"><div><h2>每一小步，都在悄悄发芽</h2><p>成长不需要分数。你愿意照顾自己，就已经很好。</p><span>属于你的小岛，正在慢慢长大</span></div><img src="/xinyu/generated/sidebar-island-v3.png" alt="生长中的像素小岛"/></div>
  <div class="growth-stats"><div><span>留下足迹的日子</span><strong>{growth.days}<small> 天</small></strong></div><div><span>真正开始的对话</span><strong>{growth.conversations}<small> 段</small></strong></div><div><span>已完成的小目标</span><strong>{growth.goals}<small> 个</small></strong></div><div><span>主动珍藏的记忆</span><strong>{growth.memories}<small> 条</small></strong></div></div>
  <div class="growth-layout"><section class="xy-panel"><h2>给自己的小目标</h2><form class="goal-form" onsubmit={addGoal}><label for="goal-text" class="sr-only">新的小目标</label><input id="goal-text" bind:value={goalText} maxlength="120" placeholder="今天，想为自己做一件什么小事？"/><button class="xy-btn primary" disabled={!goalText.trim()}>种下目标</button></form>{#if companion.data.goals.length}<div class="goal-list">{#each companion.data.goals as goal}<article class:completed={!!goal.completedAt}><label><input type="checkbox" checked={!!goal.completedAt} onchange={()=>safely(()=>updateData(data=>{const item=data.goals.find(g=>g.id===goal.id);item.completedAt=item.completedAt?undefined:Date.now();}))}/><span>{goal.text}<small>{goal.completedAt?'完成于 '+formatTime(goal.completedAt):'从一点点开始就好'}</small></span></label><button class="text-button danger-text" onclick={()=>erase('goals',goal.id)}>删除</button></article>{/each}</div>{:else}<p class="module-empty">散步十分钟，喝一杯水，早点休息。<br/>选一件属于你的小事，慢慢来。</p>{/if}</section><section class="xy-panel"><h2>小岛的成长印记</h2><div class="milestones">{#each [{name:'第一次倾诉',done:growth.conversations>0,icon:2,detail:'开始第一段对话'},{name:'看见心情',done:companion.data.emotions.length>0,icon:3,detail:'留下第一条情绪记录'},{name:'珍藏瞬间',done:growth.memories>0,icon:4,detail:'主动保存一条记忆'},{name:'小小约定',done:growth.goals>0,icon:6,detail:'完成一个自己的目标'},{name:'七日足迹',done:growth.days>=7,icon:8,detail:'在七个不同的日子留下记录'},{name:'慢慢熟悉',done:growth.conversations>=10,icon:5,detail:'开始十段对话'}] as badge}<div class:unlocked={badge.done}><PixelIcon src={'/xinyu/art/nav_'+badge.icon+'.png'} size={24}/><strong>{badge.name}</strong><small>{badge.done?'已留下印记':badge.detail}</small></div>{/each}</div></section></div>
{:else if page==='avatar'}
  <div class="avatar-layout"><section class="xy-panel avatar-preview"><div class="avatar-room"><PixelRoom scene={companion.data.preferences.scene} avatar={draftAvatar} reduced={companion.data.preferences.reduceMotion} sound={companion.data.preferences.sound} compact/></div><h2>今天，也很高兴见到你</h2><p>轻点小屿，听听她的问候。</p></section><section class="xy-panel"><h2>选一种温柔的色调</h2><p class="section-description">保留自然肤色，为整套造型选择喜欢的衣服色调。</p><div class="avatar-presets">{#each [{id:'lilac',name:'淡紫小屿',color:'#b6a2d7'},{id:'rose',name:'樱粉小屿',color:'#dfa8c3'},{id:'cream',name:'奶油小屿',color:'#ddc59b'}] as preset}<button class:chosen={draftAvatar===preset.id} aria-pressed={draftAvatar===preset.id} onclick={()=>draftAvatar=preset.id}><div style:background={preset.color+'33'}><CompanionPortrait tone={preset.id}/></div><strong>{preset.name}</strong></button>{/each}</div><div class="xy-actions"><button class="xy-btn primary" onclick={()=>safely(()=>{updateData(data=>data.preferences.avatar=draftAvatar);notify('小屿的新色调已保存。');})}>保存形象</button><button class="xy-btn" onclick={()=>draftAvatar=companion.data.preferences.avatar}>撤销预览</button></div><div class="asset-note"><h3>也可以，亲手搭配</h3><p>在下方给小屿换上连帽衫、针织衫或水手服，再配一枚小胸针。</p></div></section></div>
  <Wardrobe onapply={()=>draftAvatar='custom'}/>
{:else if page==='scenes'}
  <SceneLibrary/>
{/if}
{#if confirm}<ConfirmDialog destructive={confirm.destructive} title={confirm.title} description={confirm.description} confirmText={confirm.label||'确认删除'} onconfirm={confirm.action} onclose={()=>confirm=null}/>{/if}
