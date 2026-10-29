import {appearanceMode,brightnessValue} from './theme';
import {normalizeWardrobe} from './wardrobe';
import {validLocalScene} from './sceneLibrary';
export const emotions = {
  joy: '开心', gratitude: '感激', relaxed: '平静', care: '关心', pride: '自豪', neutral: '平常',
  surprise: '惊喜', mixed: '复杂', sadness: '低落', loneliness: '孤单', anxiety: '焦虑',
  anger: '生气', fear: '害怕', disgust: '反感', shame: '羞愧', helplessness: '无助',
} as const;
export type Emotion = keyof typeof emotions;
export interface Source { characterId: string; conversationId: string; messageId?: string }
export interface EmotionReflection { labels:Emotion[]; intensity:number; context:string; need:string; action:string; actionDone:boolean; review?:{intensity:number;note:string;helpful:'yes'|'unsure'|'no';at:number} }
export interface EmotionRecord { id: string; label: Emotion; note: string; at: number; origin: 'manual' | 'model'; confirmed: boolean; source?: Source; reflection?:EmotionReflection }
export interface Memory { id: string; text: string; category: 'daily'|'interest'|'goal'|'important'; at: number; consented: true; source?: Source }
export function memoriesForCharacter(memories:Memory[],characterId?:string):Memory[]{
  return memories.filter(memory=>!memory.source?.characterId||memory.source.characterId===characterId);
}
export type ProfileCategory='interest'|'rhythm'|'support'|'goal'|'boundary'|'other';
export interface Fact { id: string; label: string; value: string; origin: 'user_provided'|'model_inferred'; confirmed: boolean; at: number; source?: Source; category?:ProfileCategory;active?:boolean;updatedAt?:number }
export type FactSnapshot=Pick<Fact,'label'|'value'|'origin'|'confirmed'|'category'|'active'>;
export interface FactRevision {id:string;factId:string;at:number;action:'created'|'edited'|'confirmed'|'paused'|'resumed';before?:FactSnapshot;after:FactSnapshot;source?:Source}
export interface Goal { id: string; text: string; at: number; completedAt?: number }
export interface Preferences {
  name: string; memoryEnabled: boolean; profileEnabled: boolean; analysisEnabled: boolean; brightness?: number; roomLamp?: boolean; chatView?:'table'|'theatre';
  reduceMotion: boolean; sound: boolean; ambientSound?:boolean; dockAutoHide?: boolean; weatherMode?:import('./weather').WeatherMode; rainStrength?:import('./precipitation').PrecipitationStrength; snowStrength?:import('./precipitation').PrecipitationStrength; scene: string; avatar: string; theme: 'light'|'dusk'|'night'; appearanceMode?: import('./theme').AppearanceMode; voiceProfile?: 'soft'|'warm'; islandLight?: boolean; favorites: string[]; sidebarCollapsed?: boolean; gatewaySetupVersion?: number; customAvatar?: import('./wardrobe').WardrobeConfig;
}
export interface CompanionData {
  version: 1; createdAt: number; preferences: Preferences; emotions: EmotionRecord[];
  memories: Memory[]; facts: Fact[]; goals: Goal[]; activeSeconds: Record<string, number>; factHistory?:FactRevision[];sceneLibrary?:import('./sceneLibrary').LocalScene[];
  lock?: { salt: string; hash: string; digits?:number };
}
export const scenes = [
  { id: 'warm_room', name: '晴昼小屋', time: '日间', description: '把忙碌留在门外，陪你度过一个柔软的午后。', sky: '#b6dcf3' },
  { id: 'star_room', name: '星空小屋', time: '夜晚', description: '当世界安静下来，星光仍在听你说话。', sky: '#7771b4' },
  { id: 'sakura', name: '樱花庭院', time: '自然', description: '风吹过庭院，心事也可以慢慢落下。', sky: '#f2c8db' },
  { id: 'sunset', name: '落日海岸', time: '自然', description: '坐一会儿，等一场属于你的温柔日落。', sky: '#e8b5aa' },
  { id: 'city', name: '城市微光', time: '夜晚', description: '万家灯火里，也有为你留着的一盏。', sky: '#929dd0' },
  { id: 'island', name: '心屿小岛', time: '自然', description: '在自己的小岛上，不必急着成为谁。', sky: '#b3dddf' },
  { id: 'overcast', name: '阴云小屋', time: '自然', description: '云层轻轻合拢，窗边的暖灯陪你听雨。', sky: '#a4aaba' },
  { id: 'forest', name: '林间溪流', time: '自然', description: '听水穿过苔石，把脚步放得慢一点。', sky: '#b8dce9' },
  { id: 'lighthouse', name: '海边灯塔', time: '日间', description: '云朵经过灯塔，海面替你收好今天的光。', sky: '#b6dce9' },
  { id: 'mountain', name: '雪山湖畔', time: '自然', description: '远山与湖面，都愿意陪你安静片刻。', sky: '#b6d5e8' },
] as const;
export function freshData(now = Date.now()): CompanionData {
  return { version: 1, createdAt: now, preferences: { name: '', memoryEnabled: false, profileEnabled: false,
    analysisEnabled: false, chatView:'table', reduceMotion: false, sound: false, ambientSound:false, dockAutoHide:false, weatherMode:'auto', rainStrength:'light', snowStrength:'light', scene: 'warm_room', avatar: 'lilac', theme: 'light', appearanceMode:'auto',voiceProfile:'soft',islandLight:false,brightness:100,roomLamp:true, favorites: [] },
    emotions: [], memories: [], facts: [], goals: [], activeSeconds: {},factHistory:[] };
}
export function cleanText(value: string, limit = 2000): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('请先填写内容。');
  if (value.trim().length > limit) throw new Error(`内容请控制在 ${limit} 字以内。`);
  return value.trim();
}
export function visibleReply(value: string): string {
  if (typeof value !== 'string') return '';
  return value.replace(/<(Thoughts|think|thinking|analysis)>[\s\S]*?<\/\1>/gi,'')
    .replace(/<(Thoughts|think|thinking|analysis)>[\s\S]*$/gi,'').trim();
}
export function hydrateData(input: unknown): CompanionData {
  if (input == null) return freshData();
  const data = input as CompanionData;
  if (data.version !== 1 || !data.preferences || !['emotions','memories','facts','goals'].every(key => Array.isArray(data[key]))) {
    throw new Error('记录版本无法识别。原数据已保留，请先导出备份。');
  }
  const next = structuredClone(data);
  next.factHistory ??= [];
  const validId=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=200;
  const validAt=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
  const validSource=(v:Source|undefined)=>v===undefined||(v&&validId(v.characterId)&&validId(v.conversationId)&&(v.messageId===undefined||validId(v.messageId)));
  const lists=[data.emotions,data.memories,data.facts,data.goals];
  if(!validAt(data.createdAt)||lists.some(list=>list.some(item=>!validId(item.id)||!validAt(item.at))||new Set(list.map(item=>item.id)).size!==list.length)
    ||data.emotions.some(e=>!Object.hasOwn(emotions,e.label)||typeof e.note!=='string'||!['manual','model'].includes(e.origin)||typeof e.confirmed!=='boolean'||!validSource(e.source))
    ||data.memories.some(m=>m.consented!==true||typeof m.text!=='string'||!['daily','interest','goal','important'].includes(m.category)||!validSource(m.source))
    ||data.facts.some(f=>typeof f.label!=='string'||typeof f.value!=='string'||!['user_provided','model_inferred'].includes(f.origin)||typeof f.confirmed!=='boolean'||!validSource(f.source))
    ||data.goals.some(g=>typeof g.text!=='string'||(g.completedAt!==undefined&&!validAt(g.completedAt)))) throw new Error('记录内容校验失败。原数据已保留，请先导出备份。');
  const score=(n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=10;
  const snapshot=(f:FactSnapshot)=>f&&typeof f.label==='string'&&typeof f.value==='string'&&['user_provided','model_inferred'].includes(f.origin)&&typeof f.confirmed==='boolean'&&(f.active===undefined||typeof f.active==='boolean')&&(f.category===undefined||['interest','rhythm','support','goal','boundary','other'].includes(f.category));
  if(data.emotions.some(e=>e.reflection&&(!Array.isArray(e.reflection.labels)||!e.reflection.labels.length||e.reflection.labels.length>3||e.reflection.labels.some(l=>!Object.hasOwn(emotions,l))||!score(e.reflection.intensity)||['context','need','action'].some(k=>typeof e.reflection[k]!=='string')||typeof e.reflection.actionDone!=='boolean'||e.reflection.review&&(!score(e.reflection.review.intensity)||typeof e.reflection.review.note!=='string'||!['yes','unsure','no'].includes(e.reflection.review.helpful)||!validAt(e.reflection.review.at)))))throw new Error('情绪回看内容校验失败，原数据已保留。');
  if(data.facts.some(f=>!snapshot(f)||f.updatedAt!==undefined&&!validAt(f.updatedAt))||!Array.isArray(next.factHistory)||next.factHistory.some(h=>!validId(h.id)||!validId(h.factId)||!validAt(h.at)||!['created','edited','confirmed','paused','resumed'].includes(h.action)||!snapshot(h.after)||h.before!==undefined&&!snapshot(h.before)||!validSource(h.source)))throw new Error('画像变化记录校验失败，原数据已保留。');
  for(const key of ['memoryEnabled','profileEnabled','analysisEnabled','reduceMotion','sound','ambientSound']) if(data.preferences[key]!==undefined&&typeof data.preferences[key]!=='boolean') throw new Error('隐私偏好格式不正确，原数据已保留。');
  next.preferences = { ...freshData().preferences, ...data.preferences };
  next.preferences.ambientSound=data.preferences.ambientSound===undefined?data.preferences.sound===true:data.preferences.ambientSound;
  if(next.preferences.avatar==='mint')next.preferences.avatar='cream';
  next.preferences.appearanceMode=appearanceMode(next.preferences.appearanceMode,next.preferences.theme);
  next.preferences.voiceProfile=next.preferences.voiceProfile==='warm'?'warm':'soft';
  next.preferences.islandLight=next.preferences.islandLight===true;
  next.preferences.sidebarCollapsed=next.preferences.sidebarCollapsed===true;
  next.preferences.dockAutoHide=next.preferences.dockAutoHide===true;
  if(!['auto','sunny','rain','snow'].includes(next.preferences.weatherMode))next.preferences.weatherMode='auto';
  for(const key of ['rainStrength','snowStrength'] as const)if(!['auto','light','medium','heavy','extreme'].includes(next.preferences[key]))next.preferences[key]='light';
  next.preferences.brightness=brightnessValue(next.preferences.brightness);
  next.preferences.roomLamp=next.preferences.roomLamp!==false;
  next.preferences.chatView=next.preferences.chatView==='theatre'?'theatre':'table';
  if(next.lock?.digits!==undefined&&(!Number.isInteger(next.lock.digits)||next.lock.digits<6||next.lock.digits>12))delete next.lock.digits;
  if(next.sceneLibrary!==undefined&&(!Array.isArray(next.sceneLibrary)||next.sceneLibrary.length>20||next.sceneLibrary.some(item=>!validLocalScene(item))||new Set(next.sceneLibrary.map(item=>item.id)).size!==next.sceneLibrary.length))throw new Error('本地场景信息校验失败，原记录仍然保留。');
  if (!scenes.some(s => s.id === next.preferences.scene)&&!next.sceneLibrary?.some(s=>s.id===next.preferences.scene)) next.preferences.scene = 'warm_room';
  if(next.preferences.customAvatar)next.preferences.customAvatar=normalizeWardrobe(next.preferences.customAvatar);
  next.activeSeconds ??= {};
  return next;
}
export function addMemory(data: CompanionData, text: string, category: Memory['category'], consent: boolean, source?: Source) {
  if (!data.preferences.memoryEnabled || !consent) throw new Error('请先开启记忆，并确认同意保存这条内容。');
  if (!['daily','interest','goal','important'].includes(category)) throw new Error('请选择有效的记忆分类。');
  data.memories.unshift({ id: crypto.randomUUID(), text: cleanText(text), category, at: Date.now(), consented: true, source });
}
export function addEmotion(data: CompanionData, label: Emotion, note = '', source?: Source, origin: EmotionRecord['origin'] = 'manual') {
  if (!Object.hasOwn(emotions,label)) throw new Error('无法识别这个情绪标签。');
  if (origin === 'model' && !data.preferences.analysisEnabled) throw new Error('对话分析尚未授权。');
  data.emotions.unshift({ id: crypto.randomUUID(), label, note: note.slice(0,2000), source, origin, confirmed: origin === 'manual', at: Date.now() });
}
export function removeConversationSources(data: CompanionData, characterId: string, conversationId: string) {
  const keep = (item: {source?: Source}) => !(item.source?.characterId === characterId && item.source?.conversationId === conversationId);
  data.emotions = data.emotions.filter(keep); data.memories = data.memories.filter(keep); data.facts = data.facts.filter(keep);
  data.factHistory=(data.factHistory||[]).filter(h=>keep(h)&&data.facts.some(f=>f.id===h.factId));
}
export function dateKey(at: number) { return new Date(at).toLocaleDateString('sv-SE'); }
export function growthFrom(data: CompanionData, times: number[]) {
  const days = new Set([...times.filter(Number.isFinite).map(dateKey), ...data.emotions.map(e=>dateKey(e.at)), ...data.goals.filter(g=>g.completedAt).map(g=>dateKey(g.completedAt))]);
  return { days: days.size, conversations: times.length, goals: data.goals.filter(g=>g.completedAt).length,
    memories: data.memories.length, minutes: Math.floor(Object.values(data.activeSeconds).reduce((a,b)=>a+b,0)/60) };
}
export function isLocalGateway(url: string, origin: string): boolean {
  try { const value = new URL(url); return value.origin === origin && !value.username && !value.password && value.pathname === '/xinyu-api/chat/completions' && !value.search; }
  catch { return false; }
}
