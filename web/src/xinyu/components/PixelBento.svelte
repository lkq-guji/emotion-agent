<script lang="ts">
 import {type Snippet} from 'svelte';import {prefersReducedMotion} from 'svelte/motion';
 let {children,className='',reduced=false}:{children:Snippet;className?:string;reduced?:boolean}=$props();
 let quiet=$derived(reduced||prefersReducedMotion.current);
</script>
<div class="pixel-bento {className}" data-quiet={quiet}>{@render children()}</div>
<style>
 .pixel-bento{position:relative;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:stretch;max-width:1520px;margin-inline:auto}
 .pixel-bento>:global(.xy-panel){position:relative;isolation:isolate;min-width:0;grid-column:span 1!important;padding:24px;border-radius:12px;background:linear-gradient(150deg,color-mix(in srgb,var(--xy-panel) 95%,var(--xy-selected)),var(--xy-panel));box-shadow:0 5px 18px color-mix(in srgb,var(--xy-ink) 3%,transparent)}
 .pixel-bento>:global(.about-settings){grid-column:1/-1!important}.pixel-bento :global(.about-settings>div){flex-direction:row;flex-wrap:wrap;gap:12px 24px}.pixel-bento :global(.character-rows>div){flex-wrap:wrap;gap:8px}.pixel-bento :global(.character-rows>div>div){gap:12px}
 .pixel-bento :global(h2){text-wrap:balance}.pixel-bento :global(.setting-row){border-color:var(--xy-border)}
</style>
