import { saveKV } from '../ts/storage/saveKV';
import { freshData, hydrateData, type CompanionData } from './domain';

export const NAMESPACE = 'xinyu.companion.v1';
export const companion = $state({ data: freshData(), ready: false, locked: false, error: '', notice: '', saveStatus: '已读取本机记录' });
let toastTimer: ReturnType<typeof setTimeout>;
let failures = 0;
let retryAfter = 0;
export function notify(message: string) {
  companion.notice = message; clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ companion.notice = ''; }, 4200);
}
export function initializeCompanion() {
  if (companion.ready) return;
  try {
    companion.data = hydrateData(saveKV.get(NAMESPACE, 'data'));
    companion.locked = !!companion.data.lock;
  } catch (error) { companion.error = String(error); }
  companion.ready = true;
  window.addEventListener('xinyu:save', (event: CustomEvent<{ok:boolean}>)=> {
    companion.saveStatus = event.detail.ok ? '已保存到本机' : '保存失败，请保留页面并重试';
    if (!event.detail.ok) companion.error = '存储写入失败。请检查磁盘与浏览器存储权限。';
  });
}
export function updateData(action: (draft: CompanionData)=>void) {
  if (companion.locked) throw new Error('请先解锁应用。');
  if (companion.error) throw new Error('请先解决存储错误，原记录不会被覆盖。');
  const draft = structuredClone($state.snapshot(companion.data));
  action(draft);
  // 使用上游 SaveKV 扩展块，原有角色、聊天及未知字段不经过重新映射。
  saveKV.set(NAMESPACE, 'data', draft);
  companion.data = draft;
  companion.saveStatus = '正在保存…';
}
const hex = (value: Uint8Array) => Array.from(value,b=>b.toString(16).padStart(2,'0')).join('');
async function hashPin(pin: string, salt: string) {
  const material = await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:210000,hash:'SHA-256'},material,256)));
}
export async function setPin(pin: string) {
  if (!/^\d{6,12}$/.test(pin)) throw new Error('请设置 6–12 位数字的应用密码。');
  const salt = hex(crypto.getRandomValues(new Uint8Array(24)));
  const hash = await hashPin(pin,salt);
  updateData(data=>{ data.lock = { salt, hash, digits:pin.length }; });
  notify('应用锁已设置，下次打开时需要解锁。');
}
export async function unlock(pin: string, beforeOpen?:()=>void|Promise<void>) {
  if (Date.now() < retryAfter) throw new Error('尝试次数较多，请稍后再试。');
  const lock = companion.data.lock;
  if (!lock || await hashPin(pin,lock.salt) === lock.hash) {
    await beforeOpen?.();companion.locked = false; failures = 0;retryAfter=0;return;
  }
  failures++; if (failures >= 5) retryAfter = Date.now()+30000;
  throw new Error('密码不正确，请重试。');
}
export async function disablePin(pin:string){
  if(companion.locked)throw new Error('请先解锁应用。');
  const previous=companion.data.lock;if(!previous)return;
  await unlock(pin);
  if(companion.data.lock?.hash!==previous.hash||companion.data.lock?.salt!==previous.salt)throw new Error('应用锁设置已变化，请重新输入密码。');
  updateData(data=>{delete data.lock;});failures=0;retryAfter=0;
  notify('应用锁已关闭，下次打开可直接进入。');
}
export function lockApp() { if (companion.data.lock) { window.dispatchEvent(new Event('xinyu:before-lock')); companion.locked = true; } else notify('请在“我的”中先设置应用密码。'); }
