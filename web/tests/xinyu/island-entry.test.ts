import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {islandEntryAt,islandActorBlendAt,entryDuration} from '../../src/xinyu/islandEntry';
import {floatingIslandOffset} from '../../src/xinyu/islandEnvironment';
import {appearanceMode,periodAt} from '../../src/xinyu/theme';
const manifest=JSON.parse(readFileSync('public/xinyu/island/assets.json','utf8'));
describe('island arrival contract',()=>{
 it('uses complete integer frames inside the supplied atlas',()=>{
  for(const atlas of [manifest.actor,manifest.door])for(const frame of atlas.frames){
   const r=frame.source;for(const n of Object.values(r))expect(Number.isInteger(n)).toBe(true);
   expect(r.x+r.width).toBeLessThanOrEqual(atlas.width);expect(r.y+r.height).toBeLessThanOrEqual(atlas.height);
   expect(frame.anchor.x).toBeGreaterThan(0);expect(frame.anchor.y).toBeLessThanOrEqual(r.height);
  }
 });
 it('walks continuously to the threshold, opens before entering, and ends inside',()=>{
  const p=manifest.placement;let prior=islandEntryAt(0,p),phases=new Set<string>();
  for(let t=0;t<=entryDuration;t+=10){const f=islandEntryAt(t,p);phases.add(f.phase);expect(Math.abs(f.y-prior.y)).toBeLessThan(.004);expect(f.actor).toBeLessThan(8);expect(f.door).toBeLessThan(4);if(f.phase==='enter')expect(f.door).toBe(3);prior=f;}
  expect([...phases]).toEqual(['turn','pause','walk','reach','open','enter','arrive']);
  expect(prior).toMatchObject({x:p.actorInside.x,y:p.actorInside.y,alpha:0,veil:1,done:true});
  expect(islandEntryAt(-100,p).y).toBe(p.actorIdle.y);
 });
 it('smoothly blends complete adjacent poses without moving the feet anchor or resetting scenery motion',()=>{
  const p=manifest.placement;
  for(const t of [0,220,340,495,650,805,960,1140,1410,2030]){const at=islandActorBlendAt(t/2,p),after=islandActorBlendAt(t/2+20,p),done=islandActorBlendAt(t/2+43,p);expect(at.mix).toBeGreaterThanOrEqual(0);expect(at.mix).toBeLessThanOrEqual(1);expect(after.mix).toBeGreaterThanOrEqual(at.mix);expect(done.mix).toBe(1);}
  for(let index=0;index<3;index++){const start=floatingIslandOffset(0,index),one=floatingIslandOffset(.016,index),later=floatingIslandOffset(8,index);expect(Math.hypot(one.x-start.x,one.y-start.y)).toBeLessThan(.08);expect(Math.hypot(later.x-start.x,later.y-start.y)).toBeGreaterThan(.1);}
 });
 it('keeps island and room on the same manual, scheduled and dimmed period',()=>{
  for(const [hour,period] of [[6,'night'],[7,'day'],[15,'day'],[16,'dusk'],[18,'dusk'],[19,'night']] as const)expect(periodAt('auto',100,new Date(2026,9,26,hour).getTime())).toBe(period);
  expect(periodAt('dusk',100)).toBe('dusk');expect(periodAt('day',55)).toBe('night');expect(periodAt('day',56)).toBe('day');expect(appearanceMode(undefined,'dusk')).toBe('dusk');
 });
});
