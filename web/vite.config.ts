import { defineConfig, loadEnv } from "vite";
import { createGateway } from './server/xinyu/gateway.mjs';
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import wasm from "vite-plugin-wasm";
import strip from '@rollup/plugin-strip';
import tailwindcss from '@tailwindcss/vite'
// https://vitejs.dev/config/
export default defineConfig(({command, mode}) => {
  return {
    plugins: [
      { name:'xinyu-local-gateway', configureServer(server) { server.middlewares.use('/xinyu-api',createGateway({...loadEnv(mode,process.cwd(),''),...process.env})); } },
      svelte({
        preprocess: vitePreprocess(),
        onwarn: (warning, handler) => {
          // disable a11y warnings
          if (warning.code.startsWith("a11y-")) return;
          handler(warning);
        },
      }),
      tailwindcss(),
      wasm(),
      command === 'build' ? strip({
        include: '**/*.(mjs|js|svelte|ts)'
      }) : null
    ],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    // prevent vite from obscuring rust errors
    clearScreen: false,
    // 自有条款、隐私文件与原始服务提醒均已配置，保留上游 Legal 组件。
    define: { 'import.meta.env.VITE_RISU_LEGAL_CONFIGURED':'true' },
    // tauri expects a fixed port, fail if that port is not available
    server: {
      host: '127.0.0.1',
      port: 5178,
      strictPort: true,
      // Browser traces contain HTML snapshots; writing QA output must not reload an active chat.
      watch: { ignored: ['**/.runtime/**', '**/.impeccable/**', '**/test-results/**', '**/playwright-report/**'] },
      // hmr: false,
    },
    // to make use of `TAURI_ENV_DEBUG` and other env variables
    // https://v2.tauri.app/reference/environment-variables/
    envPrefix: ["VITE_", "TAURI_"],
    build: {
      target:'baseline-widely-available',
      // don't minify for debug builds
      minify: process.env.TAURI_ENV_DEBUG === 'true' ? false : 'oxc',
      // produce sourcemaps for debug builds
      sourcemap: process.env.TAURI_ENV_DEBUG === 'true',
      chunkSizeWarningLimit: 2000,
    },
    
    optimizeDeps:{
      exclude: [
        "@browsermt/bergamot-translator"
      ],
      needsInterop:[
        "@mlc-ai/web-tokenizers"
      ]
    },

    resolve:{
      alias:{
        'src':'/src',
      }
    },
    worker: {
      format: 'es'
    }
}
});
