import {characterVoiceLines} from './voice';
let current:HTMLAudioElement|undefined;
export function stopRoomVoice(){if(current){current.pause();current.currentTime=0;current=undefined;}}
export async function playRoomVoice(target:'character'|'cat'|'cloud',line=0,profile:'soft'|'warm'='soft'){
  stopRoomVoice();current=new Audio(target==='cat'?'/xinyu/audio/cat-meow.mp3':'/xinyu/audio/neural/'+profile+'-'+(target==='cloud'?3:characterVoiceLines[line%characterVoiceLines.length])+'.mp3');current.volume=target==='cat'?.35:.65;if(target==='cat'){current.preservesPitch=false;current.playbackRate=[1,.96,1.04][line%3];}
  await current.play();
}
