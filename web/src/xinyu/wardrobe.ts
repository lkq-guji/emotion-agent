import {loadChibi,drawChibi,type ChibiAssets,type ChibiMotion} from './avatarRig';
export interface WardrobeConfig{version:2;outfit:'hoodie'|'cardigan'|'sailor';color:'lilac'|'rose'|'cream';hairColor:'lilac'|'rose';accessory:'none'|'star'|'flower';angle:number}
export const defaultWardrobe:WardrobeConfig={version:2,outfit:'hoodie',color:'lilac',hairColor:'lilac',accessory:'none',angle:0};
export function normalizeWardrobe(input:unknown):WardrobeConfig{
 const value=input&&typeof input==='object'?input as Record<string,unknown>:{};const next={...defaultWardrobe};
 if(value.version===1){next.color=value.top==='rose'?'rose':value.top==='white'?'cream':'lilac';if(['lilac','rose'].includes(value.hairColor as string))next.hairColor=value.hairColor as WardrobeConfig['hairColor'];return next;}
 const allowed={outfit:['hoodie','cardigan','sailor'],color:['lilac','rose','cream'],hairColor:['lilac','rose'],accessory:['none','star','flower']};
 for(const key of Object.keys(allowed))if(allowed[key].includes(value[key]))next[key]=value[key];
 return next;
}
export function presetWardrobe(tone='lilac'):WardrobeConfig{return {...defaultWardrobe,color:tone==='rose'?'rose':tone==='cream'?'cream':'lilac'};}
export const loadWardrobe=loadChibi;
export function drawWardrobe(ctx:CanvasRenderingContext2D,assets:ChibiAssets,config:WardrobeConfig,time=0,motion:ChibiMotion={still:true}){drawChibi(ctx,assets,config,time,motion);}
