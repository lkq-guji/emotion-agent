import {describe,it,expect} from 'vitest';
import {resolveWeather,weatherAt,weatherMode} from '../../src/xinyu/weather';
import {periodAt} from '../../src/xinyu/theme';
import {snowFlakes} from '../../src/xinyu/pixelSnow';
import {tunnelAt,tunnelDuration} from '../../src/xinyu/lightTunnel';
import {freshData,hydrateData} from '../../src/xinyu/domain';

describe('independent weather and light',()=>{
 it('keeps every manual weather through all periods and clock changes',()=>{
  for(const period of ['day','dusk','night'] as const)for(const weather of ['sunny','rain','snow'] as const)for(const time of [0,600000,Date.now()]){
   expect(resolveWeather(weather,time)).toBe(weather);expect(periodAt(period,100,time)).toBe(period);
  }
 });
 it('retains the weighted automatic schedule and migrates missing preferences',()=>{
  for(const time of [0,899999,1600000000000])expect(resolveWeather('auto',time)).toBe(weatherAt(time));
  expect(weatherMode('bad')).toBe('auto');const old=freshData();delete old.preferences.weatherMode;expect(hydrateData(old).preferences.weatherMode).toBe('auto');
 });
});
describe('pixel snow motion',()=>{
 it('has different depths, sprites and sizes without a global reset',()=>{
  const flakes=snowFlakes(8000,2172,724),next=snowFlakes(8016,2172,724);
  expect(new Set(flakes.map(f=>f.sprite)).size).toBe(4);expect(new Set(flakes.map(f=>f.pixel)).size).toBeGreaterThan(2);
  let moving=0;flakes.forEach((f,i)=>{expect(Number.isFinite(f.x+f.y)).toBe(true);expect(f.alpha).toBeGreaterThanOrEqual(0);expect(f.alpha).toBeLessThanOrEqual(1);if(Math.abs(next[i].y-f.y)<10){expect(Math.hypot(next[i].x-f.x,next[i].y-f.y)).toBeLessThan(1);moving++;}});expect(moving).toBeGreaterThan(150);
 });
 it('lets the pointer brush nearby flakes, leaving distant flakes untouched',()=>{
  const flakes=snowFlakes(3000,900,500),target=flakes.find(f=>f.x>200&&f.x<700&&f.y>100&&f.y<400)!;
  const brushed=snowFlakes(3000,900,500,{x:(target.x+20)/900,y:target.y/500});
  expect(brushed.some((f,i)=>Math.abs(f.x-flakes[i].x)>.5)).toBe(true);expect(brushed.filter((f,i)=>f.x===flakes[i].x&&f.y===flakes[i].y).length).toBeGreaterThan(20);
 });
});
describe('entry tunnel envelope',()=>{
 it('covers the route switch, then reveals the real room and finishes',()=>{
  expect(tunnelAt(1000).opacity).toBe(0);expect(tunnelAt(1360).opacity).toBe(1);expect(tunnelAt(1400).opacity).toBe(1);
  expect(tunnelAt(1500).opacity).toBeGreaterThan(0);expect(tunnelAt(tunnelDuration)).toMatchObject({opacity:0,done:true});
  for(let t=1000;t<1600;t+=5)expect(Math.abs(tunnelAt(t+1).opacity-tunnelAt(t).opacity)).toBeLessThan(.009);
 });
});
describe('lock length migration',()=>{
 it('keeps legacy locks and accepts optional new lengths without changing the hash',()=>{
  const old=freshData();old.lock={salt:'fixture-salt',hash:'fixture-hash'};expect(hydrateData(old).lock).toEqual(old.lock);
  for(const digits of [6,8,12]){old.lock.digits=digits;expect(hydrateData(old).lock).toEqual(old.lock);}
  old.lock.digits=4;expect(hydrateData(old).lock).toEqual({salt:'fixture-salt',hash:'fixture-hash'});
 });
});
