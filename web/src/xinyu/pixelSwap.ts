/** A bounded square reveal; the last composed frame is the source of an interrupted swap. */
export function swapCellProgress(x:number,y:number,columns:number,rows:number,elapsed:number){
 const index=y*columns+x,noise=((Math.imul(index+13,1597334677)>>>0)%997)/997;
 const distance=Math.hypot((x+.5)/columns-.48,(y+.5)/rows-.45)/.75;
 const p=Math.max(0,Math.min(1,(elapsed-distance*220-noise*65)/240));
 return p*p*(3-2*p);
}
export class PixelSwapFrame{
 private frame?:HTMLCanvasElement;private prior?:HTMLCanvasElement;private key='';private started=0;
 active=false;
 constructor(private width:number,private height:number,private size=48){}
 draw(destination:CanvasRenderingContext2D,key:string,time:number,paint:(ctx:CanvasRenderingContext2D)=>void,reduced=false){
  if(!this.frame){this.frame=document.createElement('canvas');this.frame.width=this.width;this.frame.height=this.height;}
  if(key!==this.key){
   if(this.key&&!reduced){this.prior??=document.createElement('canvas');this.prior.width=this.width;this.prior.height=this.height;this.prior.getContext('2d')!.drawImage(this.frame,0,0);this.started=time;this.active=true;}
   this.key=key;
  }
  const ctx=this.frame.getContext('2d')!;ctx.clearRect(0,0,this.width,this.height);
  if(reduced||time-this.started>=560)this.active=false;
  if(this.active&&this.prior){
   ctx.drawImage(this.prior,0,0);ctx.save();ctx.beginPath();
   const size=Math.max(this.size,Math.ceil(Math.sqrt(this.width*this.height/520))),columns=Math.ceil(this.width/size),rows=Math.ceil(this.height/size);
   for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const p=swapCellProgress(x,y,columns,rows,time-this.started);if(p>0){const half=(size+1)*p/2;ctx.rect(x*size+size/2-half,y*size+size/2-half,half*2,half*2);}}
   ctx.clip();paint(ctx);ctx.restore();
  }else paint(ctx);
  destination.drawImage(this.frame,0,0);
 }
}
