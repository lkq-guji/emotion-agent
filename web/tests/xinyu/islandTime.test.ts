import {describe,it,expect} from 'vitest';
import {IslandTimeLedger,timeParts} from '../../src/xinyu/islandTime';
import {brightnessValue} from '../../src/xinyu/theme';
import {freshData,hydrateData,dateKey} from '../../src/xinyu/domain';

describe('island foreground clock',()=>{
 it('does not count intervals spent without focus or visibility',()=>{const at=new Date(2026,9,26,11).getTime(),clock=new IslandTimeLedger(at,0,true);clock.sample(at+2500,2500,false);clock.sample(at+12500,12500,true);clock.sample(at+15500,15500,false);expect(clock.pending()).toEqual({[dateKey(at)]:5});clock.acknowledge(clock.pending());expect(clock.pending()).toEqual({});clock.sample(at+16000,16000,true);clock.sample(at+16500,16500,false);expect(clock.pending()).toEqual({[dateKey(at)]:1});});
 it('splits a real foreground interval across local midnight',()=>{const at=new Date(2026,9,26,23,59,58).getTime(),clock=new IslandTimeLedger(at,0,true);clock.sample(at+4000,4000,true);expect(clock.pending()).toEqual({[dateKey(at)]:2,[dateKey(at+4000)]:2});});
 it('uses monotonic elapsed time and caps a suspended-device gap',()=>{const at=new Date(2026,9,26,11).getTime(),clock=new IslandTimeLedger(at,0,true);clock.sample(at+3600000,2000,true);expect(clock.pending()).toEqual({[dateKey(at)]:2});clock.sample(at+7200000,3602000,true);expect(clock.pending()).toEqual({[dateKey(at)]:7});});
 it('acknowledges only saved seconds and discards the old account after reset',()=>{const at=new Date(2026,9,26,11).getTime(),clock=new IslandTimeLedger(at,0,true);clock.sample(at+1400,1400,true);clock.acknowledge({[dateKey(at)]:1});clock.sample(at+2200,2200,true);expect(clock.pending()).toEqual({[dateKey(at)]:1});clock.reset(at+3000,3000,false);clock.sample(at+4000,4000,false);expect(clock.pending()).toEqual({});});
 it('formats real durations without converting missing data to a fake total',()=>{expect(timeParts(3661)).toEqual({hours:1,minutes:1,seconds:1});expect(timeParts(-1)).toEqual({hours:0,minutes:0,seconds:0});expect(timeParts(NaN)).toEqual({hours:0,minutes:0,seconds:0});});
});
describe('brightness save migration',()=>{
 it('defaults older saves and rejects nonnumeric display values',()=>{const old=freshData();delete old.preferences.brightness;expect(hydrateData(old).preferences.brightness).toBe(100);for(const v of [undefined,null,'0',NaN,Infinity])expect(brightnessValue(v)).toBe(100);});
 it('clamps the readable range while preserving chat-adjacent data and unknown fields',()=>{const old=freshData();old.preferences.brightness=-30;(old.preferences as any).futurePreference={keep:true};const record={id:'actual-user-record',at:1,label:'joy',note:'保留',origin:'manual',confirmed:true} as const;old.emotions.push(record);const next=hydrateData(old);expect(next.preferences.brightness).toBe(40);expect(next.emotions[0]).toEqual(record);expect((next.preferences as any).futurePreference).toEqual({keep:true});expect(brightnessValue(170)).toBe(100);expect(brightnessValue(71.6)).toBe(72);});
});
