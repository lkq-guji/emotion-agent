import {describe,it,expect,vi} from 'vitest';
import {weatherSamples,WeatherPlayer,weatherAudio,ambienceFade,softenLoopEdge} from '../../src/xinyu/weatherAudio';

describe('quiet weather ambience',()=>{
 it('connects a decoded loop edge without changing the body or inserting a silent gap',()=>{const a=Float32Array.from({length:1000},(_,i)=>Math.sin(i*.37)*.1+.02);const original=a.slice();softenLoopEdge(a,24000);expect(a[0]).toBeCloseTo(a.at(-1)!,7);expect(a.slice(0,700)).toEqual(original.slice(0,700));expect(a.some(x=>x!==0)).toBe(true);});
 it('keeps the snow air quiet, bounded and free of a hard loop edge',()=>{
  const snow=weatherSamples(24000,'snow'),peak=snow.reduce((p,x)=>Math.max(p,Math.abs(x)),0),rms=Math.sqrt(snow.reduce((sum,x)=>sum+x*x,0)/snow.length);
  expect(rms).toBeLessThan(.005);expect(rms).toBeGreaterThan(0);expect(peak).toBeLessThan(.05);expect(Math.abs(snow[0]-snow.at(-1)!)).toBeLessThan(.00001);
 });
 function rig(){const context={state:'running',close:vi.fn(async()=>{})} as unknown as AudioContext;const create=vi.fn(()=>({start:vi.fn(),setIntensity:vi.fn(),release:vi.fn(async()=>{}),disconnect:vi.fn()} as unknown as ReturnType<typeof weatherAudio>));return {context,create,player:new WeatherPlayer(context,create)};}
 it('never starts another voice for repeated preference snapshots or intensity changes',async()=>{
  const {player,create}=rig();for(let i=0;i<60;i++)player.set('rain',true,i/60);expect(create).toHaveBeenCalledTimes(1);expect(create.mock.results[0].value.start).toHaveBeenCalledTimes(1);expect(create.mock.results[0].value.release).not.toHaveBeenCalled();expect(player.playing).toBe(true);await player.close();
 });
 it('only crossfades on actual weather changes, and releases once when disabled',async()=>{
  const {player,create,context}=rig();player.set('rain',true,.16);player.set('snow',true,.4);expect(create).toHaveBeenCalledTimes(2);expect(create.mock.results[0].value.release).toHaveBeenCalledTimes(1);player.set('snow',false,.4);player.set('snow',false,.4);expect(create.mock.results[1].value.release).toHaveBeenCalledTimes(1);expect(player.playing).toBe(false);await player.close();expect(context.close).toHaveBeenCalledTimes(1);player.set('rain',true,1);expect(create).toHaveBeenCalledTimes(2);
 });
 it('keeps sunshine silent and preserves a perceptible start and end envelope',async()=>{
  const {player,create}=rig();player.set('sunny',true,1);player.set('rain',false,.4);expect(create).not.toHaveBeenCalled();expect(ambienceFade.in).toBeGreaterThan(1);expect(ambienceFade.out).toBeGreaterThan(1);await player.close();
 });
 it('can close a suspended audio context without waiting for a frozen audio clock',async()=>{const {player,create,context}=rig();player.set('rain',true,.16);Object.defineProperty(context,'state',{value:'suspended'});await player.close();expect(context.close).toHaveBeenCalledTimes(1);expect(create.mock.results[0].value.disconnect).toHaveBeenCalledTimes(1);expect(player.playing).toBe(false);});
});
