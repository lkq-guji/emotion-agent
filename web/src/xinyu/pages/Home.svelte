<script lang="ts">
  import PixelIcon from '../components/PixelIcon.svelte';
  import IslandScene from '../components/IslandScene.svelte';
  import PixelCard from '../components/PixelCard.svelte';
  import { companion } from '../state.svelte';
  import { DBState } from '../../ts/stores.svelte';
  import { emotions,dateKey,visibleReply } from '../domain';
  import { selectCharacter,selectConversation } from '../bridge.svelte';
  import Counter from '../components/Counter.svelte';import {interfaceState} from '../interfaceState.svelte';import {timeParts} from '../islandTime';
  const quotes=[
    '不必每一天都很厉害。能照顾好自己的心情，也是一件了不起的事。',
    '今天的你，已经走到了这里。先让自己歇一会儿吧。',
    '心情像窗外的云，来来去去，你都可以慢慢说。',
    '不用急着把一切想明白，我们可以从一句话开始。',
    '把肩膀放松一点，给此刻的自己一点余地。',
    '一小步也算向前，休息也是照顾自己的方式。',
    '那些还没整理好的感受，可以先放在这里。',
    '愿你今天，能遇到一件让心里亮起来的小事。'
  ];
  let quoteIndex=$state(0);
  let island:{enterRoom:(after?:()=>void|Promise<void>)=>void};
  let recent=$derived(DBState.db.characters.flatMap((char,ci)=>char.chats.map((chat,ti)=>({char,chat,ci,ti}))).filter(item=>item.chat.message.length).sort((a,b)=>(b.chat.lastDate||0)-(a.chat.lastDate||0)).slice(0,2).map(item=>{
    const message=item.chat.message.filter(message=>!message.isComment).at(-1);
    return {...item,preview:message?(message.role==='char'?visibleReply(message.data):message.data):''};
  }));
  let currentMood=$derived(companion.data.emotions[0]);
  let todayMood=$derived(companion.data.emotions.find(item=>dateKey(item.at)===dateKey(interfaceState.now)));
  let seconds=$derived((companion.data.activeSeconds[dateKey(interfaceState.now)]||0)+(interfaceState.activePreview[dateKey(interfaceState.now)]||0));
  let duration=$derived(timeParts(seconds));
  function openRecent(ci:number,ti:number){island.enterRoom(async()=>{await selectCharacter(ci);await selectConversation(ti);location.hash='/chat';});}
</script>
<section class="xy-home island-home" class:motion-quiet={companion.data.preferences.reduceMotion}>
  <IslandScene bind:this={island}/>
  <div class="home-content">
    <div class="home-bottom">
      <section class="xy-panel recent-island" aria-label="最近对话"><PixelCard reduced={companion.data.preferences.reduceMotion}/><h2><PixelIcon src="/xinyu/art/nav_2.png" size={24}/>最近对话</h2>
        {#if recent.length}<ul>{#each recent as item}<li><button aria-label={'打开对话：'+item.chat.name} onclick={()=>openRecent(item.ci,item.ti)}><span><strong>{item.chat.name}</strong><span>{item.preview||'打开这段对话'}</span></span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button></li>{/each}</ul>
        {:else}<p>心事还没写下也没关系，<br/>小屿在亮着灯的小屋里等你。</p><button class="text-link" type="button" onclick={()=>island.enterRoom()}>去小屋坐坐 <span aria-hidden="true">→</span></button>{/if}
      </section>
      <a class="xy-panel daily-summary summary-link" href="#/growth" aria-labelledby="daily-card-heading"><PixelCard reduced={companion.data.preferences.reduceMotion}/><h2 id="daily-card-heading"><PixelIcon src="/xinyu/art/nav_6.png" size={24}/>今日在岛时光</h2><div class="time-value island-duration" role="timer" data-seconds={seconds} aria-live="off" aria-label={`今日累计${duration.hours}小时${duration.minutes}分${duration.seconds}秒`}><span class="duration-part"><Counter value={duration.hours} minDigits={2} reduced={companion.data.preferences.reduceMotion}/><small>时</small></span><b>:</b><span class="duration-part"><Counter value={duration.minutes} minDigits={2} reduced={companion.data.preferences.reduceMotion}/><small>分</small></span><b>:</b><span class="duration-part"><Counter value={duration.seconds} minDigits={2} reduced={companion.data.preferences.reduceMotion}/><small>秒</small></span></div><p class="time-explainer" title="前台、获得焦点且未锁定时累计；离开、隐藏或锁定立即暂停，每15秒及离开时保存。">前台停留时间，<br/>不等同于聊天时长。</p><span class="text-link">看看我的成长 <span>→</span></span></a>
      <a class="xy-panel mood-summary summary-link" href="#/emotion" aria-labelledby="mood-card-heading"><PixelCard reduced={companion.data.preferences.reduceMotion}/><h2 id="mood-card-heading"><PixelIcon src="/xinyu/art/nav_3.png" size={24}/>今日心情</h2>{#if todayMood}<div class="mood-word">{emotions[todayMood.label]}</div><p>{todayMood.origin==='manual'?'你主动记录的心情':'来自 AI 的参考观察'}<br/>{new Date(todayMood.at).toLocaleDateString('zh-CN')}</p>{:else}<div class="mood-word">今天，感觉如何？</div><p>每一种情绪都值得被看见。<br/>记录此刻，慢慢认识自己。</p>{/if}<span class="text-link">记录此刻 <span>→</span></span></a>
    </div>
    <footer class="home-footnote"><button type="button" class="quote-switch" aria-label="换一句暖心语录" title="点击换一句" onclick={()=>quoteIndex=(quoteIndex+1)%quotes.length}><span class="quote-text" aria-live="polite">{#key quoteIndex}<span>{quotes[quoteIndex]}</span>{/key}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.5-1L20 9M4 15l2.4 3A7 7 0 0 0 18 17"/></svg></button><a href="/xinyu/privacy.html" target="_blank" rel="noreferrer">了解隐私保护</a></footer>
  </div>
</section>
<style>
 .island-home{position:relative;max-width:1960px!important;margin:0 auto;padding:22px 28px 0}
 .island-home .home-content{padding:20px 0 0}
 .island-home .home-bottom{margin:0;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr);gap:18px}
 .island-home .home-bottom .xy-panel{position:relative;isolation:isolate;min-height:166px;padding:18px 20px}
 .island-home .home-bottom h2{font-size:16px;line-height:1.5;margin:0 0 12px;align-items:center;white-space:normal;gap:8px}
 .island-home .home-bottom p{font-size:14px;line-height:1.8;color:var(--xy-secondary)}
 .recent-island ul{list-style:none;padding:0;margin:0}.recent-island li+li{border-top:1px solid var(--xy-border)}
 .recent-island li button{display:flex;align-items:center;gap:20px;width:100%;text-align:left;min-height:54px;background:transparent;border:0;padding:8px 0;color:var(--xy-ink)}
 .recent-island li button>span{display:grid;min-width:0;gap:4px;flex:1}.recent-island strong{font-size:14px;font-weight:600}.recent-island li button>span>span{font-size:12px;color:var(--xy-secondary)}
 .recent-island li button>span>*{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.recent-island li button:hover{color:var(--xy-accent)}.recent-island svg{flex:none}
 .recent-island>.text-link{align-self:start;min-height:40px;background:transparent;border:0;color:var(--xy-accent);padding:4px 0;display:flex;gap:8px;align-items:center;font-size:14px}
 .summary-link{display:flex;flex-direction:column;position:relative;text-decoration:none;color:var(--xy-ink);transition:background-color .15s,border-color .15s}.summary-link:hover{background:color-mix(in srgb,var(--xy-panel) 88%,var(--xy-selected));border-color:var(--xy-accent)}
 .summary-link .text-link{margin-top:auto;font-size:14px;display:flex;gap:12px;min-height:36px;align-items:center;padding-top:4px}
 .island-duration{display:flex;align-items:start;gap:2px;font-size:clamp(22px,1.7vw,30px);line-height:1.15;font-variant-numeric:tabular-nums;white-space:nowrap;margin-bottom:8px}.duration-part{display:grid;justify-items:center;font-size:inherit!important;line-height:1.15}.duration-part small{font-size:12px;font-weight:400;line-height:1.5;color:var(--xy-secondary);margin-top:4px}.island-duration b{font-size:.65em;font-weight:400;padding-top:.2em}
 .island-home .home-bottom .time-explainer{font-size:12px;line-height:1.7;margin-bottom:4px}.island-home .mood-word{font-size:16px;margin:0 0 7px}
 .home-footnote{display:flex;justify-content:space-between;align-items:center;gap:16px;text-align:left;color:var(--xy-secondary);margin-top:9px}
 .quote-switch{display:flex;align-items:center;gap:10px;text-align:left;min-height:44px;max-width:76ch;border:0;padding:7px 0;background:transparent;color:var(--xy-secondary);font-size:14px;line-height:1.8;cursor:pointer}.quote-switch:hover{color:var(--xy-ink)}.quote-switch svg{flex:none;opacity:.7;transition:transform .2s}.quote-switch:hover svg{transform:rotate(35deg)}
 .home-footnote>a{flex:none;font-size:12px;min-height:44px;display:flex;align-items:center;text-decoration:underline;text-underline-offset:3px}
 .motion-quiet *{transition:none!important}
</style>
