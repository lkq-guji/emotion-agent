export const routes=[
  {id:'home',label:'首页'},{id:'chat',label:'对话'},{id:'emotion',label:'情绪'},
  {id:'memories',label:'记忆'},{id:'profile',label:'画像'},{id:'growth',label:'成长'},
  {id:'avatar',label:'形象'},{id:'scenes',label:'场景'},{id:'settings',label:'我的'}
] as const;
export function routeHref(id:string){return id==='home'?'#/':'#/'+id;}
