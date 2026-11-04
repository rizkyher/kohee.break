<script lang="ts">
	import '@fontsource/anton/latin-400.css';
	import '@fontsource/chakra-petch/latin-700.css';
	import '@fontsource-variable/space-grotesk/wght.css';
	import './layout.css';
	import antonWoff2 from '@fontsource/anton/files/anton-latin-400-normal.woff2?url';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<!-- Anton sets the hero headline, so fetch it before CSS discovers it -->
	<link rel="preload" href={antonWoff2} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

{@render children()}
