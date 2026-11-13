<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	let { total, pageNumber, limit }: { total: number; pageNumber: number; limit: number } = $props();
	const pages = $derived(Math.max(1, Math.ceil(total / limit)));
	function query(n: number) {
		const p = new SvelteURLSearchParams(page.url.searchParams.toString());
		p.set('page', String(n));
		return p.toString();
	}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- typed resolve route plus URL-encoded query parameters -->
<nav class="s-pagination" aria-label="Halaman data">
	<span>{total} data · Halaman {pageNumber} dari {pages}</span>
	<div class="s-actions">
		{#if pageNumber > 1}<a
				class="s-button"
				href={resolve('/admin/(studio)/[...path]', {
					path: page.url.pathname.replace(/^\/admin\/?/, '')
				}) +
					'?' +
					query(pageNumber - 1)}><ChevronLeft size={16} /> Sebelumnya</a
			>{/if}{#if pageNumber < pages}<a
				class="s-button"
				href={resolve('/admin/(studio)/[...path]', {
					path: page.url.pathname.replace(/^\/admin\/?/, '')
				}) +
					'?' +
					query(pageNumber + 1)}>Berikutnya <ChevronRight size={16} /></a
			>{/if}
	</div>
</nav>

<!-- eslint-enable svelte/no-navigation-without-resolve -->
