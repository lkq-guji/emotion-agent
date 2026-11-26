import {describe,it,expect} from 'vitest';
import {relevantMemories} from '../../src/xinyu/memoryRetrieval.mjs';
import type {Memory} from '../../src/xinyu/domain';
const memory=(id:string,text:string,at=1):Memory=>({id,text,category:'interest',consented:true,at});
describe('bounded, authorized memory retrieval',()=>{
 it('finds a relevant older preference without injecting unrelated records',()=>{const records=[memory('cat','小猫叫奶糖',100),memory('study','学习英语喜欢25分钟专注',1)];expect(relevantMemories(records,'安排英语学习').map(m=>m.id)).toEqual(['study']);});
 it('does not treat empty questions and generic words as memory evidence',()=>{expect(relevantMemories([memory('x','我喜欢画画')],'我喜欢')).toEqual([]);expect(relevantMemories([memory('x','英语学习')],'')).toEqual([]);});
 it('ignores nonconsented input and keeps a strict text budget',()=>{const records=[{...memory('no','英语学习'),consented:false} as never,...Array.from({length:8},(_,i)=>memory(String(i),'英语学习'.repeat(400),i))];const found=relevantMemories(records,'英语学习',3,2100);expect(found.map(m=>m.id)).not.toContain('no');expect(found.length).toBeLessThanOrEqual(3);expect(found.reduce((n,m)=>n+m.text.length,0)).toBeLessThanOrEqual(2100);});
});
