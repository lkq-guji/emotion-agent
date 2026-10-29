import express from 'express';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { rateLimit } from 'express-rate-limit';

// 仅本机同源会话；客户端不能指定上游 URL 或获取服务端密钥。
export function createGateway(env = process.env, fetchImpl = fetch) {
  const router = express.Router();
  const key = env.XINYU_API_KEY || env.DEEPSEEK_API_KEY || '';
  const model = env.XINYU_MODEL || env.DEEPSEEK_MODEL || 'deepseek-flash';
  const base = (env.XINYU_BASE_URL || env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/,'');
  const endpoint = base.endsWith('/chat/completions') ? base : base+'/chat/completions';
  const sessions = new Map();
  router.use((req,res,next)=> {
    res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
    if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(req.headers.host || '')) return res.status(403).json({error:'此服务仅供本机访问。'});
    const expected = `http://${req.headers.host}`;
    if (req.headers.origin && req.headers.origin !== expected) return res.status(403).json({error:'不允许跨站访问。'});
    if (req.method !== 'GET' && req.headers.origin !== expected) return res.status(403).json({error:'需要同源请求。'});
    next();
  });
  router.get('/health',(req,res)=> {
    for (const [id,expires] of sessions) if(expires<Date.now()) sessions.delete(id);
    if (sessions.size>200) sessions.delete(sessions.keys().next().value);
    const token = randomBytes(32).toString('hex'); sessions.set(token,Date.now()+8*3600_000);
    res.cookie('xinyu_session',token,{httpOnly:true,sameSite:'strict',path:'/xinyu-api',maxAge:8*3600_000});
    res.json({configured:!!key,model,localOnly:true});
  });
  router.use((req,res,next)=> {
    const cookie = (req.headers.cookie || '').split(';').map(c=>c.trim()).find(c=>c.startsWith('xinyu_session='));
    const token = cookie?.slice('xinyu_session='.length);
    if (!token || (sessions.get(token) || 0)<Date.now()) return res.status(401).json({error:'会话已过期，请刷新连接状态。'});
    res.locals.token = token; next();
  });
  router.post('/logout',(req,res)=> { sessions.delete(res.locals.token); res.clearCookie('xinyu_session',{path:'/xinyu-api'}); res.json({ok:true}); });
  router.use(express.json({limit:'2mb'}));
  router.use(rateLimit({windowMs:60_000,limit:24,standardHeaders:'draft-8',legacyHeaders:false}));
  router.post('/chat/completions',async(req,res)=> {
    if (!key) return res.status(503).json({error:{message:'服务端未配置模型密钥，请查看运行说明。'}});
    const input = req.body;
    if (!Array.isArray(input?.messages) || !input.messages.length || input.messages.length>256 || input.messages.some(m=>!['system','user','assistant','tool'].includes(m.role) || !(typeof m.content==='string' || Array.isArray(m.content) || m.tool_calls))) return res.status(400).json({error:{message:'消息结构不合法。'}});
    let url; try { url = new URL(endpoint); } catch { return res.status(503).json({error:{message:'服务端模型地址配置有误。'}}); }
    if (url.protocol!=='https:' && !(url.protocol==='http:' && ['127.0.0.1','localhost','[::1]'].includes(url.hostname))) return res.status(503).json({error:{message:'远程模型地址需要 HTTPS。'}});
    const body = {model,messages:input.messages,max_tokens:Math.min(Math.max(Number(input.max_tokens)||768,1),4096),stream:input.stream===true};
    if(url.hostname==='api.deepseek.com')body.thinking={type:'disabled'};
    for(const name of ['temperature','top_p','presence_penalty','frequency_penalty','stop','response_format','tools','tool_choice','reasoning_effort']) if(input[name]!==undefined) body[name]=input[name];
    const abort = new AbortController();
    const timer = setTimeout(()=>abort.abort(),Math.min(Number(env.DEEPSEEK_TIMEOUT_SECONDS)||120,300)*1000);
    res.on('close',()=>{ if (!res.writableEnded) abort.abort(); });
    try {
      const response = await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(body),signal:abort.signal});
      if (!response.ok) return res.status(response.status).json({error:{message:`模型服务返回 HTTP ${response.status}，请检查模型配置或稍后重试。`}});
      res.status(200).setHeader('Content-Type',body.stream?'text/event-stream; charset=utf-8':'application/json; charset=utf-8');
      if (body.stream && response.body) {
        const source = Readable.fromWeb(response.body); source.on('error',()=>res.destroy());
        await new Promise(resolve=>{res.on('finish',resolve);res.on('close',resolve);source.pipe(res);});
      } else res.send(await response.text());
    } catch { if (!res.headersSent) res.status(502).json({error:{message:abort.signal.aborted?'模型请求已停止或超时。':'无法连接模型服务，请检查网络后重试。'}}); }
    finally {clearTimeout(timer);}
  });
  router.use((error,req,res,next)=>res.status(error.status===413?413:400).json({error:{message:'请求内容无法读取或过大。'}}));
  // Vite 的 Connect 中间件没有 Express 的 response 方法，需要由 app 安装。
  const app = express(); app.disable('x-powered-by'); app.use(router); return app;
}
