import {describe,it,expect} from 'vitest';
import {memoriesForCharacter,type Memory} from '../../src/xinyu/domain';
const base={category:'daily',at:1,consented:true} as const;
describe('room memory summary',()=>{
 it('includes shared and current-character memories but never another character’s memories',()=>{
  const records:Memory[]=[{...base,id:'shared',text:'共有'},{...base,id:'current',text:'当前',source:{characterId:'a',conversationId:'1'}},{...base,id:'other',text:'其他',source:{characterId:'b',conversationId:'2'}}];
  expect(memoriesForCharacter(records,'a').map(m=>m.id)).toEqual(['shared','current']);
  expect(memoriesForCharacter(records.filter(m=>m.id==='other'),'a')).toEqual([]);
  expect(memoriesForCharacter(records,undefined).map(m=>m.id)).toEqual(['shared']);
 });
});
