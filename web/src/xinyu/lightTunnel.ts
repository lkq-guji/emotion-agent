const ease=(value:number)=>{const p=Math.max(0,Math.min(1,value));return p*p*(3-2*p);};
export const tunnelDuration=1580;
export function tunnelAt(elapsed:number){return{opacity:ease((elapsed-1090)/260)*(1-ease((elapsed-1400)/180)),progress:Math.max(0,(elapsed-1090)/490),done:elapsed>=tunnelDuration};}
