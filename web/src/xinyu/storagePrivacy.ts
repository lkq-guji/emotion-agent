import localforage from 'localforage';

// 名称逐一来自原 Risu 的存储定义；只操作当前 origin 的应用数据。
const stores = [
  {name:'risuai'}, {name:'risuSaveCache'}, {name:'risuaiAccountCached'},
  {name:'LLMTranslateCache'}, {name:'hypaVector'},
  {name:'iris_dialogues',storeName:'iris_dialogues'},
  {name:'plugin',storeName:'plugin'},
  {name:'plugin_permissions',storeName:'plugin_permissions'},
  {name:'inlay',storeName:'inlay'},
  {name:'google-search-credentials',storeName:'credentials'},
  {name:'mcp-tool-calls',storeName:'mcp-tool-calls'},
];

export async function clearDerivedSaveCaches() {
  // 这两类缓存可由保留的原始记录重建，避免删除后留下旧序列化块或译文。
  await localforage.createInstance({name:'risuSaveCache'}).clear();
  await localforage.createInstance({name:'LLMTranslateCache'}).clear();
}

export async function clearAllOriginStores() {
  for(const store of stores) await localforage.createInstance(store).clear();
  await localforage.clear();
  if('caches' in window) for(const key of await caches.keys()) await caches.delete(key);
  if(navigator.storage?.getDirectory) {
    const root=await navigator.storage.getDirectory();
    for await(const name of (root as FileSystemDirectoryHandle & {keys():AsyncIterable<string>}).keys()) await root.removeEntry(name,{recursive:true});
  }
}
