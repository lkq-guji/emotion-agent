export type AppearanceMode='day'|'dusk'|'night'|'auto';
export function brightnessValue(value:unknown):number{return typeof value==='number'&&Number.isFinite(value)?Math.round(Math.max(40,Math.min(100,value))):100;}
export function appearanceMode(value:unknown,legacy?:unknown):AppearanceMode{
  return ['day','dusk','night','auto'].includes(value as string)?value as AppearanceMode:legacy==='dusk'?'dusk':legacy==='night'?'night':'day';
}
export function themeAt(mode:AppearanceMode,at=Date.now()):'light'|'night'{
  if(mode==='auto'){const hour=new Date(at).getHours();return hour>=7&&hour<19?'light':'night';}
  return mode==='night'?'night':'light';
}

export function displayTheme(mode:AppearanceMode,brightness:unknown,at=Date.now()):'light'|'night'{return brightnessValue(brightness)<=55?'night':themeAt(mode,at);}

export function periodAt(mode:AppearanceMode,brightness:unknown,at=Date.now()):'day'|'dusk'|'night'{
 if(brightnessValue(brightness)<=55)return 'night';
 if(mode!=='auto')return mode;
 const hour=new Date(at).getHours();return hour<7||hour>=19?'night':hour>=16?'dusk':'day';
}
