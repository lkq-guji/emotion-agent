export type BubbleRect={left:number;top:number;right:number;bottom:number};
export function placeRoomBubble(anchor:BubbleRect,width:number,height:number,viewport:{width:number;height:number},avoid:BubbleRect[]=[]){
 const cx=(anchor.left+anchor.right)/2,cy=(anchor.top+anchor.bottom)/2;
 const candidates=[
  {x:anchor.right-8,y:anchor.top-height-12,side:'above'},
  {x:anchor.left-width+8,y:anchor.top-height-12,side:'above'},
  {x:anchor.right+10,y:anchor.top+Math.min(28,(anchor.bottom-anchor.top)*.12)-height,side:'right'},
  {x:anchor.left-width-10,y:anchor.top+Math.min(28,(anchor.bottom-anchor.top)*.12)-height,side:'left'},
  {x:cx-width/2,y:anchor.top-height-12,side:'above'},
 ];
 for(const rect of avoid){
  candidates.push({x:anchor.right+10,y:rect.bottom+8,side:'right'},{x:anchor.left-width-10,y:rect.bottom+8,side:'left'},{x:anchor.right-8,y:rect.top-height-8,side:'above'},{x:anchor.left-width+8,y:rect.top-height-8,side:'above'});
  candidates.push({x:rect.right+6,y:anchor.top-height-8,side:'above'},{x:rect.left-width-6,y:anchor.top-height-8,side:'above'},{x:anchor.right-8,y:rect.bottom+6,side:'above'});
 }
 return candidates.map((candidate,index)=>{
  const x=Math.max(8,Math.min(viewport.width-width-8,candidate.x)),y=Math.max(8,Math.min(viewport.height-height-8,candidate.y));
  const overlap=avoid.reduce((sum,r)=>sum+Math.max(0,Math.min(x+width,r.right)-Math.max(x,r.left))*Math.max(0,Math.min(y+height,r.bottom)-Math.max(y,r.top)),0);
  const dx=x+width/2-cx,dy=y+height/2-cy,side=Math.abs(dy)>=Math.abs(dx)?dy>=0?'below':'above':dx>=0?'right':'left';
  const lower=Math.max(0,y+height-(anchor.top+(anchor.bottom-anchor.top)*.3));
  const gap=Math.hypot(Math.max(anchor.left-x-width,x-anchor.right,0),Math.max(anchor.top-y-height,y-anchor.bottom,0));
  return {...candidate,x,y,side,score:overlap*1000+lower*500+Math.max(0,gap-32)*100000+Math.abs(x-candidate.x)+Math.abs(y-candidate.y)+Math.hypot(dx,dy)*.03+index*.02,tailX:Math.max(12,Math.min(width-12,cx-x)),tailY:Math.max(10,Math.min(height-10,cy-y))};
 }).sort((a,b)=>a.score-b.score)[0];
}
