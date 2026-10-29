import {dateKey} from './domain';

export {brightnessValue} from './theme';
export function timeParts(seconds:number){
  const whole=Math.max(0,Math.floor(Number.isFinite(seconds)?seconds:0));
  return {hours:Math.floor(whole/3600),minutes:Math.floor(whole/60)%60,seconds:whole%60};
}

/** Pending monotonic foreground time, split at local midnight; no storage dependency. */
export class IslandTimeLedger {
  private pendingMs:Record<string,number>={};
  constructor(private wall:number,private monotonic:number,private active:boolean){}
  sample(wall:number,monotonic:number,active:boolean){
    // A delayed timer after a suspended device must not count the entire absence.
    const elapsed=this.active?Math.max(0,Math.min(5000,monotonic-this.monotonic)):0;
    let cursor=wall-elapsed;
    while(cursor<wall){
      const midnight=new Date(cursor);midnight.setHours(24,0,0,0);
      const end=Math.min(wall,midnight.getTime()),key=dateKey(cursor);
      this.pendingMs[key]=(this.pendingMs[key]||0)+end-cursor;cursor=end;
    }
    this.wall=wall;this.monotonic=monotonic;this.active=active;
  }
  pending(){return Object.fromEntries(Object.entries(this.pendingMs).map(([key,ms])=>[key,Math.floor(ms/1000)]).filter(([,seconds])=>Number(seconds)>0)) as Record<string,number>;}
  acknowledge(saved:Record<string,number>){for(const [key,seconds]of Object.entries(saved))this.pendingMs[key]=Math.max(0,(this.pendingMs[key]||0)-seconds*1000);}
  reset(wall:number,monotonic:number,active:boolean){this.pendingMs={};this.wall=wall;this.monotonic=monotonic;this.active=active;}
}
