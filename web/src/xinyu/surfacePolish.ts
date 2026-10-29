/** Pixel adaptation of the MagicBento light/edge/click-wave idea. No layout or business handlers. */
export function polishSurfaces(root:HTMLElement,reduced=false){
 const media=matchMedia('(prefers-reduced-motion: reduce)'),decorated=new Map<HTMLElement,HTMLElement>(),waves=new Set<Animation>();
 let frame=0,point={x:0,y:0},hovered:HTMLElement|undefined,lit:HTMLElement|undefined;
 const quiet=()=>reduced||media.matches||document.hidden;
 const surface=(target:EventTarget|null)=>target instanceof Element?target.closest<HTMLElement>('.xy-panel:not([data-pixel-card]),.scene-card,.xy-banner,.wardrobe-stage'):null;
 function reset(){cancelAnimationFrame(frame);frame=0;if(lit)lit.style.setProperty('--bento-light','0');lit=undefined;}
 function decoration(card:HTMLElement){if(!decorated.has(card)){const el=document.createElement('i');el.className='surface-light';el.setAttribute('aria-hidden','true');card.classList.add('xy-polished-surface');card.append(el);decorated.set(card,el);}return decorated.get(card)!;}
 function paint(){frame=0;if(quiet()||!hovered)return;const card=hovered,box=card.getBoundingClientRect();decoration(card);if(lit&&lit!==card)lit.style.setProperty('--bento-light','0');lit=card;card.style.setProperty('--bento-x',`${point.x-box.left}px`);card.style.setProperty('--bento-y',`${point.y-box.top}px`);card.style.setProperty('--bento-light','1');}
 function move(event:PointerEvent){if(quiet()||event.pointerType!=='mouse')return;const card=surface(event.target);if(!card||!root.contains(card)){reset();return;}hovered=card;point={x:event.clientX,y:event.clientY};if(!frame)frame=requestAnimationFrame(paint);}
 function focus(event:FocusEvent){if(quiet()||!(event.target instanceof HTMLElement)||!event.target.matches(':focus-visible'))return;const card=surface(event.target);if(card){hovered=card;const b=card.getBoundingClientRect();point={x:b.left+b.width/2,y:b.top+40};paint();}}
 function wave(event:MouseEvent){
  if(quiet()||!(event.target instanceof Element)||event.target.closest('input,textarea,select,label,summary,[contenteditable],[role=switch],.danger,.danger-text,.delete-conversation,.favorite-scene,[data-no-polish]'))return;
  const card=surface(event.target);if(!card||!root.contains(card))return;const b=card.getBoundingClientRect(),clip=document.createElement('i'),ring=document.createElement('i'),reach=Math.min(520,Math.max(b.width,b.height)*1.5);
  decoration(card);clip.className='surface-wave-clip';clip.setAttribute('aria-hidden','true');ring.className='bento-wave';ring.style.cssText=`left:${event.detail?event.clientX-b.left:b.width/2}px;top:${event.detail?event.clientY-b.top:b.height/2}px;width:${reach}px;height:${reach}px`;clip.append(ring);card.append(clip);
  const animation=ring.animate([{transform:'translate(-50%,-50%) scale(.04)',opacity:.28},{transform:'translate(-50%,-50%) scale(1)',opacity:0}],{duration:480,easing:'cubic-bezier(.2,0,0,1)'});waves.add(animation);void animation.finished.catch(()=>{}).finally(()=>{clip.remove();waves.delete(animation);});
 }
 function clear(){reset();for(const animation of waves)animation.cancel();}
 const sweep=new MutationObserver(()=>{for(const [card,el]of decorated)if(!card.isConnected){el.remove();decorated.delete(card);}});sweep.observe(root,{childList:true,subtree:true});
 root.addEventListener('pointermove',move,{passive:true});root.addEventListener('pointerleave',reset);root.addEventListener('focusin',focus);root.addEventListener('focusout',reset);root.addEventListener('click',wave);document.addEventListener('visibilitychange',clear);media.addEventListener('change',clear);
 return {update(value:boolean){reduced=value;if(quiet())clear();},destroy(){clear();sweep.disconnect();for(const [card,el]of decorated){el.remove();card.classList.remove('xy-polished-surface');}decorated.clear();root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',reset);root.removeEventListener('focusin',focus);root.removeEventListener('focusout',reset);root.removeEventListener('click',wave);document.removeEventListener('visibilitychange',clear);media.removeEventListener('change',clear);}};
}
