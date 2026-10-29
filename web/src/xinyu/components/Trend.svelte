<script lang="ts">
  import {calendarDays} from '../emotionCalendar';
  import type {EmotionRecord} from '../domain';
  let {records,days=7,selected='',onselect=()=>{}}=$props<{records:EmotionRecord[];days?:number;selected?:string;onselect?:(key:string)=>void}>();
  let dates=$derived(calendarDays(records,days));
  let recorded=$derived(dates.filter(day=>day.total).length);
</script>
<div class="mood-calendar" class:month={days>7}>
 <p class="calendar-explanation">每格是一天，显示当天留下的心情。<strong>未记录不代表心情不好。</strong></p>
 <div class="calendar-days" aria-label={`近${days}天的每日心情`}>
 {#each dates as day}<button type="button" class="mood-day" class:recorded={day.total>0} class:chosen={selected===day.key} aria-pressed={selected===day.key} disabled={!day.total} aria-label={day.date+(day.total?'，'+day.groups.map(g=>g.name+g.count+'条').join('，')+'，查看当天日记':'，未记录')} onclick={()=>onselect(selected===day.key?'':day.key)}>
  <span class="day-date">{day.date}<small>{day.weekday}</small></span>
  {#if day.total}<span class="day-emotions">{#each day.groups.slice(0,days>7?1:2) as group}<span>{group.name}{#if group.count>1}<small> ×{group.count}</small>{/if}</span>{/each}{#if day.groups.length>(days>7?1:2)}<small>等 {day.groups.length} 种心情</small>{/if}</span><small class="day-count">{day.total} 条记录</small>{:else}<span class="day-empty">未记录</span>{/if}
 </button>{/each}</div>
 <p class="calendar-caption">这段时间记录了 {recorded} 天 · 点击有记录的日期，查看下方日记</p>
</div>
<style>
 .calendar-explanation{font-size:14px;line-height:1.8;color:var(--xy-secondary);margin-bottom:18px}.calendar-explanation strong{font-weight:500}.calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:9px}.mood-day{display:flex;flex-direction:column;align-items:center;gap:12px;min-width:0;min-height:152px;padding:12px 5px;border:1px solid var(--xy-border);border-radius:8px;background:var(--xy-page);color:var(--xy-ink);font:inherit;text-align:center}.mood-day:disabled{opacity:1!important;cursor:default}.mood-day.recorded{background:var(--xy-panel);border-color:var(--xy-accent)}.mood-day.chosen{background:var(--xy-selected);outline:2px solid var(--xy-accent);outline-offset:1px}.day-date{font-size:14px;font-weight:600}.day-date small{display:block;font-weight:400;font-size:12px;color:var(--xy-secondary);margin-top:2px}.day-emotions{display:grid;gap:4px;font-size:14px}.day-emotions>span{display:block}.day-emotions small,.day-count{font-size:12px;color:var(--xy-secondary)}.day-count{margin-top:auto}.day-empty{margin:auto 0;color:var(--xy-secondary);font-size:12px}.calendar-caption{font-size:12px;color:var(--xy-secondary);margin-top:15px}.month .mood-day{min-height:116px;gap:6px}.month .calendar-days{gap:7px}@media(max-width:1450px){.calendar-days{grid-template-columns:repeat(4,minmax(0,1fr))}.mood-day{min-height:128px}.month .calendar-days{grid-template-columns:repeat(7,minmax(0,1fr))}}@media(max-width:700px){.calendar-days,.month .calendar-days{grid-template-columns:repeat(3,minmax(0,1fr))}.mood-day{min-height:128px;padding:10px 5px}.calendar-explanation{font-size:14px}.month .mood-day{min-height:112px}}
</style>
