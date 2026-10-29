import {emotions,addEmotion,cleanText,dateKey,type CompanionData,type Emotion,type EmotionRecord,type EmotionReflection,type Fact,type FactSnapshot,type ProfileCategory,type FactRevision} from './domain';
export const profileGroups:Record<ProfileCategory,string>={interest:'兴趣与喜欢',rhythm:'生活节奏',support:'支持与交流',goal:'目标与期待',boundary:'相处边界',other:'其他了解'};
export const profileLabels=['兴趣','生活习惯','交流方式','我的目标','相处边界','其他'];
export function factCategory(f:Pick<Fact,'label'|'category'>):ProfileCategory{return f.category||({'兴趣':'interest','生活习惯':'rhythm','交流方式':'support','我的目标':'goal','相处边界':'boundary'}[f.label] as ProfileCategory)||'other';}
export function recordLabels(record:EmotionRecord):Emotion[]{return [...new Set([record.label,...record.reflection?.labels||[]])].filter(label=>Object.hasOwn(emotions,label)).slice(0,3);}
const strength=(value:number)=>{if(!Number.isInteger(value)||value<0||value>10)throw new Error('感受强度请选择 0–10。');return value;};
export function saveReflection(data:CompanionData,label:Emotion,note:string,detail:Omit<EmotionReflection,'actionDone'|'review'>){
 if(!Array.isArray(detail.labels)||detail.labels.some(x=>!Object.hasOwn(emotions,x)))throw new Error('请选择有效的感受。');
 const labels=[...new Set([label,...detail.labels])];if(labels.length>3)throw new Error('一次最多选择三种感受。');
 const reflection:EmotionReflection={labels,intensity:strength(detail.intensity),context:detail.context.trim().slice(0,120),need:detail.need.trim().slice(0,200),action:detail.action.trim().slice(0,200),actionDone:false};addEmotion(data,label,note);const record=data.emotions[0];record.reflection=reflection;return record;
}
export function reviewEmotion(data:CompanionData,id:string,intensity:number,note:string,helpful:'yes'|'unsure'|'no'){
 const record=data.emotions.find(e=>e.id===id);if(!record)throw new Error('这条记录已不存在。');if(!record.reflection)throw new Error('旧记录没有起始强度，可更正标签或新增一次完整记录。');if(!['yes','unsure','no'].includes(helpful))throw new Error('请选择回看感受。');
 record.reflection.review={intensity:strength(intensity),note:note.trim().slice(0,1000),helpful,at:Date.now()};
}
export function correctEmotion(data:CompanionData,id:string,label:Emotion){const item=data.emotions.find(x=>x.id===id);if(!item||!Object.hasOwn(emotions,label))throw new Error('这条情绪无法更正。');const previous=item.label;item.label=label;item.confirmed=true;if(item.reflection)item.reflection.labels=[...new Set([label,...item.reflection.labels.filter(x=>x!==previous)])].slice(0,3);}
export function reflectionSummary(records:EmotionRecord[]){
 const counts=new Map<string,number>(),contexts=new Map<string,number>();for(const r of records){for(const label of recordLabels(r))counts.set(label,(counts.get(label)||0)+1);const context=r.reflection?.context.trim();if(context)contexts.set(context,(contexts.get(context)||0)+1);}
 return {days:new Set(records.map(r=>dateKey(r.at))).size,total:records.length,reviewed:records.filter(r=>r.reflection?.review).length,actions:records.filter(r=>r.reflection?.actionDone).length,labels:[...counts].sort((a,b)=>b[1]-a[1]).map(([label,count])=>({label:label as Emotion,name:emotions[label],count})),contexts:[...contexts].sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}))};
}
export function reflectionDraft(record:EmotionRecord){const r=record.reflection;return ['我想和你一起梳理这一刻。',`我的感受：${recordLabels(record).map(l=>emotions[l]).join('、')}${r?'；强度 '+r.intensity+'/10':''}。`,record.note&&'我想说：'+record.note,r?.context&&'发生的情境：'+r.context,r?.need&&'此刻需要：'+r.need,r?.action&&'我想尝试的小行动：'+r.action,'请先倾听，用温柔的问题帮我理清事情与需要，不要替我下结论。'].filter(Boolean).join('\n');}
function snapshot(f:Fact):FactSnapshot{return {label:f.label,value:f.value,origin:f.origin,confirmed:f.confirmed,category:factCategory(f),active:f.active!==false};}
function revision(data:CompanionData,fact:Fact,action:FactRevision['action'],before?:FactSnapshot){(data.factHistory??=[]).unshift({id:crypto.randomUUID(),factId:fact.id,at:Date.now(),action,before,after:snapshot(fact),source:fact.source});}
export function createFact(data:CompanionData,label:string,value:string){const fact:Fact={id:crypto.randomUUID(),label:cleanText(label,40),value:cleanText(value,200),origin:'user_provided',confirmed:true,active:true,at:Date.now()};fact.category=factCategory(fact);data.facts.push(fact);revision(data,fact,'created');return fact;}
function findFact(data:CompanionData,id:string){const fact=data.facts.find(f=>f.id===id);if(!fact)throw new Error('这项了解已不存在。');return fact;}
export function editFact(data:CompanionData,id:string,label:string,value:string){const fact=findFact(data,id),before=snapshot(fact),nextLabel=cleanText(label,40),nextValue=cleanText(value,200);if(fact.label===nextLabel&&fact.value===nextValue)return;fact.label=nextLabel;fact.value=nextValue;fact.category=factCategory({label:nextLabel});fact.confirmed=true;fact.updatedAt=Date.now();revision(data,fact,'edited',before);}
export function confirmFact(data:CompanionData,id:string){const fact=findFact(data,id);if(fact.confirmed)return;const before=snapshot(fact);fact.confirmed=true;fact.updatedAt=Date.now();revision(data,fact,'confirmed',before);}
export function setFactActive(data:CompanionData,id:string,active:boolean){const fact=findFact(data,id);if((fact.active!==false)===active)return;const before=snapshot(fact);fact.active=active;fact.updatedAt=Date.now();revision(data,fact,active?'resumed':'paused',before);}
export function removeFact(data:CompanionData,id:string){data.facts=data.facts.filter(f=>f.id!==id);data.factHistory=(data.factHistory||[]).filter(h=>h.factId!==id);}
export function activeFacts(data:CompanionData,characterId:string){return data.facts.filter(f=>f.confirmed&&f.active!==false&&(!f.source?.characterId||f.source.characterId===characterId));}
