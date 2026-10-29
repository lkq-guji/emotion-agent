import {emotions,type EmotionRecord,dateKey} from './domain';
export function calendarDays(records:(Pick<EmotionRecord,'at'|'label'>&Partial<Pick<EmotionRecord,'reflection'>>)[],days=7,now=Date.now()){
  const count=Math.max(1,Math.min(31,Math.floor(days))),today=new Date(now);today.setHours(0,0,0,0);
  return Array.from({length:count},(_,index)=>{const date=new Date(today);date.setDate(date.getDate()-(count-1-index));const key=dateKey(date.getTime()),items=records.filter(record=>dateKey(record.at)===key);
    const groups=Object.entries(emotions).map(([id,name])=>({id,name,count:items.filter(item=>item.label===id||item.reflection?.labels.includes(id as EmotionRecord['label'])).length})).filter(item=>item.count).sort((a,b)=>b.count-a.count);
    return {key,at:date.getTime(),date:date.toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'}),weekday:date.toLocaleDateString('zh-CN',{weekday:'short'}),total:items.length,groups};
  });
}
