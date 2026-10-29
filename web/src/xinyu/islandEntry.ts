export interface IslandPlacement {
 door:{x:number;y:number;width:number};
 actorIdle:{x:number;y:number;width:number};
 actorAtDoor:{x:number;y:number;scale:number};
 actorInside:{x:number;y:number;scale:number};
}
export const entryDuration=1400;
export const entryPlaybackRate=2;
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
const lerp=(a:number,b:number,p:number)=>a+(b-a)*p;

export function islandEntryAt(elapsed:number,p:IslandPlacement){
 const t=Math.max(0,elapsed)*entryPlaybackRate,walk=smooth((t-250)/850),inside=smooth((t-1960)/690);
 const phase=t<220?'turn':t<340?'pause':t<1140?'walk':t<1410?'reach':t<2030?'open':t<2650?'enter':'arrive';
 const actor=t<220?1:t<340?2:t<1140?(Math.floor((t-340)/155)%2?4:3):t<1410?5:t<2030?6:7;
 return {phase,actor,door:t<1410?0:t<1630?1:t<1850?2:3,
  x:lerp(lerp(p.actorIdle.x,p.actorAtDoor.x,walk),p.actorInside.x,inside),
  y:lerp(lerp(p.actorIdle.y,p.actorAtDoor.y,walk),p.actorInside.y,inside),
  scale:lerp(lerp(1,p.actorAtDoor.scale,walk),p.actorInside.scale,inside),
  alpha:1-smooth((t-2210)/440),zoom:1+walk*.12,veil:smooth((t-2540)/260),done:elapsed>=entryDuration};
}

/** Blend only adjacent whole poses around each transition; both share the floor anchor. */
export function islandActorBlendAt(elapsed:number,p:IslandPlacement){
 const t=Math.max(0,elapsed),current=islandEntryAt(t,p).actor,previous=t<40?0:islandEntryAt(t-40,p).actor;
 if(previous===current)return {from:current,to:current,mix:1};
 let left=Math.max(0,t-40),right=t;
 if(t>=40)while(right-left>1){const middle=(left+right)/2;if(islandEntryAt(middle,p).actor===current)right=middle;else left=middle;}
 else right=0;
 return {from:previous,to:current,mix:smooth((t-right)/40)};
}
