import {describe,it,expect} from 'vitest';
import {PrecipitationMotion,precipitationTarget} from '../../src/xinyu/precipitation';
import {rainDrops} from '../../src/xinyu/weather';import {snowFlakes} from '../../src/xinyu/pixelSnow';
import {freshData,hydrateData} from '../../src/xinyu/domain';
describe('precipitation strength',()=>{
 it('grows and recedes continuously across automatic cycles',()=>{
  expect(precipitationTarget('auto','rain',0)).toBeCloseTo(.16);expect(precipitationTarget('auto','rain',36000)).toBe(1);expect(precipitationTarget('auto','rain',72000)).toBeCloseTo(.16);
  for(const kind of ['rain','snow'])for(let t=0;t<144000;t+=100)expect(Math.abs(precipitationTarget('auto',kind,t+100)-precipitationTarget('auto',kind,t))).toBeLessThan(.004);
 });
 it('smooths both manual directions and integrates particle time without jumps',()=>{
  const motion=new PrecipitationMotion();let last=motion.sample(0,.16);let middle=last;
  for(let t=16;t<=3200;t+=16){const current=motion.sample(t,1);expect(current.intensity).toBeGreaterThanOrEqual(last.intensity);expect(current.intensity-last.intensity).toBeLessThan(.02);expect(current.time-last.time).toBeLessThan(34);if(t===400)middle=current;last=current;}
  expect(middle.intensity).toBeGreaterThan(.3);expect(middle.intensity).toBeLessThan(.7);expect(last.intensity).toBeGreaterThan(.98);
  for(let t=3216;t<=6416;t+=16){const current=motion.sample(t,.16);expect(current.intensity).toBeLessThanOrEqual(last.intensity);expect(current.time-last.time).toBeLessThan(34);last=current;}expect(last.intensity).toBeLessThan(.18);
  const still=motion.sample(7000,1,true);expect(still).toMatchObject({intensity:1,time:0});expect(motion.sample(9000,1,true)).toEqual(still);
 });
 it('changes density without changing the positions of existing particles',()=>{
  const light=rainDrops(10000,2172,724,.16),storm=rainDrops(10000,2172,724,1);expect(storm.length).toBeGreaterThan(light.length*3);
  for(const drop of light)expect(storm.some(other=>other.x===drop.x&&other.y===drop.y)).toBe(true);
  const a=snowFlakes(10000,2172,724,undefined,.16),b=snowFlakes(10000,2172,724,undefined,1);expect(b.filter(f=>f.alpha>.05).length).toBeGreaterThan(a.filter(f=>f.alpha>.05).length*3);expect(a.map(f=>[f.x,f.y])).toEqual(b.map(f=>[f.x,f.y]));
 });
 it('restores saved choices and defaults old records without altering time or weather',()=>{
  const data=freshData();data.preferences.weatherMode='rain';data.preferences.appearanceMode='day';data.preferences.rainStrength='extreme';data.preferences.snowStrength='auto';expect(hydrateData(data).preferences).toMatchObject(data.preferences);delete data.preferences.rainStrength;expect(hydrateData(data).preferences.rainStrength).toBe('light');
 });
});
