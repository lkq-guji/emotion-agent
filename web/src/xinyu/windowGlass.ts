export type WindowBox = {x:number;y:number;width:number;height:number};

/** Flood only the known blue pane of room v3; never the blue walls or foliage. */
export function windowAperture(pixels:Uint8ClampedArray,width:number,height:number){
 const out=new Uint8ClampedArray(width*height*4),seen=new Uint8Array(width*height),queue=new Int32Array(width*height);
 const isPane=(p:number)=>{const i=p*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];return b>145&&b-r>18&&b-g>9&&g-r>8;};
 let seed=Math.floor(height*.45)*width+Math.floor(width*.5);
 if(!isPane(seed))return out;
 let read=0,end=1;queue[0]=seed;seen[seed]=1;
 while(read<end){const p=queue[read++],x=p%width,i=p*4;out[i]=out[i+1]=out[i+2]=out[i+3]=255;
  for(const n of [x?p-1:-1,x<width-1?p+1:-1,p-width,p+width])if(n>=0&&n<width*height&&!seen[n]){seen[n]=1;if(isPane(n))queue[end++]=n;}
 }
 return out;
}

const mattes=new WeakMap<HTMLImageElement,HTMLCanvasElement>();
function matte(plate:HTMLImageElement,box:WindowBox){
 let result=mattes.get(plate);if(result)return result;
 result=document.createElement('canvas');result.width=box.width;result.height=box.height;
 const c=result.getContext('2d',{willReadFrequently:true})!;
 c.drawImage(plate,box.x*plate.naturalWidth/2176,box.y*plate.naturalHeight/1088,box.width*plate.naturalWidth/2176,box.height*plate.naturalHeight/1088,0,0,box.width,box.height);
 const raw=c.getImageData(0,0,box.width,box.height);raw.data.set(windowAperture(raw.data,box.width,box.height));c.putImageData(raw,0,0);mattes.set(plate,result);return result;
}

/** The original frame, sill and plants remain in front of this aperture. */
export function finishWindow(pane:CanvasRenderingContext2D,plate:HTMLImageElement,box:WindowBox,period:'day'|'dusk'|'night'){
 const w=box.width,h=box.height,night=period==='night';pane.save();
 const shade=pane.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#28263b60');shade.addColorStop(.065,'#28263b0a');shade.addColorStop(.83,'#28263b00');shade.addColorStop(1,'#30263c28');pane.fillStyle=shade;pane.fillRect(0,0,w,h);
 const edge=pane.createLinearGradient(0,0,w,0);edge.addColorStop(0,'#38283a36');edge.addColorStop(.025,'#38283a00');edge.addColorStop(.97,'#38283a00');edge.addColorStop(1,'#38283a30');pane.fillStyle=edge;pane.fillRect(0,0,w,h);
 const glass=pane.createLinearGradient(w*.12,0,w*.77,h);glass.addColorStop(0,night?'#a9c1ec09':'#fff0d111');glass.addColorStop(.5,'#fff8e900');glass.addColorStop(.82,night?'#a9c1ec00':'#fff2db09');glass.addColorStop(1,'#fff8e900');pane.fillStyle=glass;pane.fillRect(0,0,w,h);
 pane.globalCompositeOperation='destination-in';pane.drawImage(matte(plate,box),0,0);pane.restore();
}
