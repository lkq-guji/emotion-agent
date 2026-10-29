<script lang="ts">
  import XinyuApp from './xinyu/XinyuApp.svelte';
  import LockScreen from './xinyu/components/LockScreen.svelte';
  import {companion,initializeCompanion} from './xinyu/state.svelte';
  import {loadedStore,alertStore,LoadingStatusState,hypaV3ModalOpen,hypaV3ProgressStore} from './ts/stores.svelte';
  import AlertComp from './lib/Others/AlertComp.svelte';
  import Legal from './lib/Others/Legal.svelte';
  import PluginAlertModal from './lib/Others/PluginAlertModal.svelte';
  import HypaV3Modal from './lib/Others/HypaV3Modal.svelte';
  import HypaV3Progress from './lib/Others/HypaV3Progress.svelte';
  $effect.pre(()=>{if($loadedStore)initializeCompanion();});
</script>
{#if !(import.meta.env.VITE_RISU_LEGAL_CONFIGURED||globalThis.__RISU_LEGAL_CONFIGURED__)}
  <Legal/>
{:else if !$loadedStore||!companion.ready}
  <div class="startup" role="status"><strong>正在点亮心屿…</strong><p>{LoadingStatusState.text||'正在读取私人记录'}</p></div>
{:else if companion.locked}<LockScreen/>
{:else}<XinyuApp/>{/if}
{#if $alertStore.type!=='none'}<AlertComp/>{/if}
<PluginAlertModal/>
{#if $loadedStore&&!companion.locked&&$hypaV3ModalOpen}<HypaV3Modal/>{/if}
{#if $loadedStore&&!companion.locked&&$hypaV3ProgressStore.open}<HypaV3Progress/>{/if}
<style>.startup{display:grid;place-content:center;height:100dvh;text-align:center;background:#f8f6fd;color:#403157;font:16px 'Microsoft YaHei',sans-serif}.startup p{font-size:14px;color:#69658a;margin-top:16px}</style>
