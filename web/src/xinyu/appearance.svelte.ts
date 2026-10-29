import {companion,updateData} from './state.svelte';
import {interfaceState} from './interfaceState.svelte';
import type {AppearanceMode} from './theme';

export function chooseAppearance(mode:AppearanceMode){
 interfaceState.brightnessPreview=null;
 updateData(data=>{
  data.preferences.appearanceMode=mode;
  if(mode!=='auto'){
   data.preferences.theme=mode==='night'?'night':mode==='dusk'?'dusk':'light';
   if(mode!=='night'&&Number(data.preferences.brightness)<=55)data.preferences.brightness=70;
  }
 });
}
