import {describe,it,expect} from 'vitest';
import {flowStreak,waterDrift} from '../../src/xinyu/flowMotion';
describe('continuous water movement',()=>{
 it('fades falling highlights to zero when their position wraps',()=>{
  const speed=.18,index=3,wrap=(2-index*.38196601125)/speed;
  const before=flowStreak(wrap-.001,index,speed),after=flowStreak(wrap+.001,index,speed);
  expect(before.opacity).toBeLessThan(.00001);expect(after.opacity).toBeLessThan(.00001);
 });
 it('keeps texture drift continuous across the old reset interval',()=>{
  for(const seconds of [0,12/11,16/34,4,10]){const a=waterDrift(seconds,1),b=waterDrift(seconds+.001,1);expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeLessThan(.005);}
 });
});
