export type PrecipitationStrength='auto'|'light'|'medium'|'heavy'|'extreme';
export const strengthLevels=[{id:'light',value:.16},{id:'medium',value:.4},{id:'heavy',value:.7},{id:'extreme',value:1}] as const;
export function normalizeStrength(value:unknown):PrecipitationStrength{return ['auto','light','medium','heavy','extreme'].includes(value as string)?value as PrecipitationStrength:'light';}
export function precipitationTarget(mode:unknown,weather:string,at=Date.now()){
 const selected=normalizeStrength(mode);if(selected!=='auto')return strengthLevels.find(level=>level.id===selected)!.value;
 const phase=(((at+(weather==='snow'?19000:0))%72000)+72000)%72000/72000;
 return .16+.84*(.5-.5*Math.cos(phase*Math.PI*2));
}
export function strengthName(weather:string,amount:number){const suffix=weather==='snow'?'雪':'雨';return amount<.28?'小'+suffix:amount<.55?'中'+suffix:amount<.86?'大'+suffix:'暴'+suffix;}

/** Integrate speed rather than multiplying absolute time, so changes never teleport particles. */
export class PrecipitationMotion{
 private last:number|undefined;private clock=0;private amount:number|undefined;
 sample(now:number,target:number,still=false){const dt=this.last===undefined?0:Math.max(0,Math.min(64,now-this.last));this.last=now;
  this.amount=this.amount===undefined||still?target:this.amount+(target-this.amount)*(1-Math.exp(-dt/750));
  if(!still)this.clock+=dt*(.65+this.amount*1.45);
  return{intensity:this.amount,time:still?0:this.clock};
 }
}
