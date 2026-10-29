import type {Weather} from './weather';

type WetWeather=Exclude<Weather,'sunny'>;
const buffers=new WeakMap<BaseAudioContext,Map<string,AudioBuffer>>();
/** Snow remains a very quiet original soft-air bed; rain uses licensed field recordings. */
export function weatherSamples(rate:number,weather:'snow',dense=false,seconds=24){
 const samples=new Float32Array(Math.round(rate*seconds));let seed=19421,air=0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<samples.length;i++){air+=(random()*2-1-air)*.009;const t=i/rate,seam=Math.min(1,t/.3,(seconds-t)/.3);samples[i]=air*.045*(.7+.12*Math.sin(t*.4)+.08*Math.sin(t*.73))*Math.sin(seam*Math.PI/2)**2;}
 return samples;
}
export const rainFiles=['/xinyu/audio/rain/window-soft-v1.ogg','/xinyu/audio/rain/ambient-soft-v1.ogg'] as const;
/** Join a decoded codec boundary without adding silence or pitching the rain. */
export function softenLoopEdge(samples:Float32Array,rate:number){const n=Math.min(samples.length,Math.max(2,Math.round(rate*.012))),difference=samples[0]-samples[samples.length-1];for(let i=0;i<n;i++){const p=i/(n-1),weight=p*p*(3-2*p);samples[samples.length-n+i]+=difference*weight;}}
const rainLoads=new WeakMap<BaseAudioContext,Promise<void>>();
export function prepareRainAudio(context:BaseAudioContext){
 let pending=rainLoads.get(context);if(!pending){pending=Promise.all(rainFiles.map(async(file,index)=>{const response=await fetch(file);if(!response.ok)throw new Error('Rain recording unavailable');const buffer=await context.decodeAudioData(await response.arrayBuffer());for(let channel=0;channel<buffer.numberOfChannels;channel++)softenLoopEdge(buffer.getChannelData(channel),buffer.sampleRate);let cached=buffers.get(context);if(!cached){cached=new Map();buffers.set(context,cached);}cached.set(index?'rain-dense':'rain',buffer);})).then(()=>{}).catch(error=>{rainLoads.delete(context);throw error;});rainLoads.set(context,pending);}return pending;
}
function bufferFor(context:BaseAudioContext,weather:WetWeather,dense=false){
 let cached=buffers.get(context);if(!cached){cached=new Map();buffers.set(context,cached);}const key=weather+(dense?'-dense':'');if(cached.has(key))return cached.get(key)!;
 if(weather==='rain')throw new Error('Prepare rain recordings before playback');
 const samples=weatherSamples(context.sampleRate,'snow'),buffer=context.createBuffer(1,samples.length,context.sampleRate);buffer.copyToChannel(samples,0);cached.set(key,buffer);return buffer;
}
export const ambienceFade={in:1.4,out:1.05};
export function weatherAudio(context:BaseAudioContext,weather:WetWeather){
 const gain=context.createGain(),envelope=context.createGain(),detail=context.createGain(),filter=context.createBiquadFilter();
 const volume=weather==='rain'?.38:.12;gain.gain.value=volume;envelope.gain.value=0;detail.gain.value=0;
 filter.type='lowpass';filter.frequency.value=weather==='rain'?4500:650;filter.Q.value=.4;
 const source=context.createBufferSource();source.buffer=bufferFor(context,weather);source.loop=true;source.connect(filter);
 const extra=weather==='rain'?context.createBufferSource():undefined;if(extra){extra.buffer=bufferFor(context,weather,true);extra.loop=true;extra.connect(detail);detail.connect(filter);}
 filter.connect(gain);gain.connect(envelope);envelope.connect(context.destination);let stopped=false;
 const disconnect=()=>{source.disconnect();extra?.disconnect();detail.disconnect();filter.disconnect();gain.disconnect();envelope.disconnect();};
 return {source,gain,envelope,volume,
  start(){const now=context.currentTime;source.start();extra?.start();envelope.gain.setValueAtTime(0,now);envelope.gain.linearRampToValueAtTime(1,now+ambienceFade.in);},
  setIntensity(value:number){const amount=Math.max(0,Math.min(1,value)),at=context.currentTime;gain.gain.setTargetAtTime(volume*(weather==='rain'?.8+amount*.2:.75+amount*.25),at,.5);detail.gain.setTargetAtTime(Math.max(0,(amount-.18)/.82)*.65,at,.65);},
  release(){if(stopped)return Promise.resolve();stopped=true;const now=context.currentTime;
   envelope.gain.cancelAndHoldAtTime(now);envelope.gain.linearRampToValueAtTime(0,now+ambienceFade.out);source.stop(now+ambienceFade.out+.02);extra?.stop(now+ambienceFade.out+.02);
   return new Promise<void>(resolve=>{source.onended=()=>{disconnect();resolve();};});
  },disconnect};
}

/** One player for the application; irrelevant settings writes cannot restart a weather voice. */
export class WeatherPlayer{
 private current?:{weather:WetWeather;voice:ReturnType<typeof weatherAudio>};private retiring=new Set<Promise<void>>();private closed=false;
 constructor(private context:AudioContext,private create=weatherAudio){}
 get playing(){return !!this.current;}
 private retire(){const old=this.current;if(!old)return;this.current=undefined;const task=old.voice.release();this.retiring.add(task);void task.finally(()=>this.retiring.delete(task));}
 set(weather:Weather,enabled:boolean,intensity:number){
  if(this.closed)return;
  if(!enabled||weather==='sunny'){this.retire();return;}
  if(this.current?.weather===weather){this.current.voice.setIntensity(intensity);return;}
  this.retire();const voice=this.create(this.context,weather);this.current={weather,voice};voice.setIntensity(intensity);voice.start();
 }
 async close(){if(this.closed)return;this.closed=true;if(this.context.state==='suspended'){this.current?.voice.disconnect();this.current=undefined;await this.context.close();return;}this.retire();await Promise.all([...this.retiring]);if(this.context.state!=='closed')await this.context.close();}
}
