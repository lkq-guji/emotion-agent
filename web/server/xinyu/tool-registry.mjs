const string=description=>({type:'string',description});
const definition=(name,description,properties={},required=[])=>({type:'function',function:{name,description,parameters:{type:'object',properties,required,additionalProperties:false}}});
export const agentTools=[
  definition('search_memory','检索用户已授权、已确认的相关记忆。没有相关结果时不要假装记得。',{query:string('具体主题或关键词')},['query']),
  definition('remember_preference','提出待用户逐条确认的记忆候选，当前不会保存为长期记忆。',{text:string('用户明确表达的偏好或希望记住的内容'),category:{type:'string',enum:['daily','interest','goal','important']}},['text','category']),
  definition('create_goal','提出待确认的小目标，可同时安排专注和提醒；确认前未创建。',{title:string('目标名称，最多120字'),steps:{type:'array',items:{type:'string'},description:'最多五个可执行的小步骤'},focusMinutes:{type:'integer',minimum:1,maximum:180},remindAt:string('可选；ISO8601并包含时区；时间不确定时先询问')},['title']),
  definition('update_goal','提出修改、完成、恢复或取消目标的操作，需要用户确认。',{id:string('get_progress返回的真实目标ID'),title:string('可选的新名称'),status:{type:'string',enum:['active','completed','cancelled']}},['id']),
  definition('manage_focus','提出启动、结束或取消专注计时的操作。确认后执行。',{operation:{type:'string',enum:['start','complete','cancel']},id:string('结束或取消时提供真实计时ID'),title:string('启动时的专注内容'),minutes:{type:'integer',minimum:1,maximum:180},goalId:string('可选的现有目标ID')},['operation']),
  definition('manage_reminder','提出创建、改期、完成或取消提醒的操作。仅在应用内提示。',{operation:{type:'string',enum:['create','reschedule','complete','cancel']},id:string('修改时的真实提醒ID'),title:string('创建时的提醒内容'),at:string('创建或改期时的ISO8601时间，必须包含时区'),goalId:string('可选的现有目标ID')},['operation']),
  definition('search_knowledge','查询允许提供给模型的本地文档。回答用 [片段ID] 引用来源。',{query:string('检索文字')},['query']),
  definition('get_progress','查看本机真实目标、提醒和计时结果，用于安排、修改或回顾。')
];

const byName=new Map(agentTools.map(tool=>[tool.function.name,tool.function.parameters]));
export function validateToolInput(name,args){
 const schema=byName.get(name);
 if(!schema||!args||typeof args!=='object'||Array.isArray(args))throw new TypeError('无效的工具或参数');
 for(const key of schema.required)if(!Object.hasOwn(args,key))throw new TypeError('缺少参数 '+key);
 for(const [key,value] of Object.entries(args)){
  const field=Object.hasOwn(schema.properties,key)&&schema.properties[key];
  if(!field)throw new TypeError('未知参数 '+key);
  const valid=field.type==='array'?Array.isArray(value)&&value.every(item=>typeof item===field.items.type):field.type==='integer'?Number.isInteger(value):typeof value===field.type;
  if(!valid||field.enum&&!field.enum.includes(value)||value<field.minimum||value>field.maximum)throw new TypeError('参数不符合约定 '+key);
 }
}
