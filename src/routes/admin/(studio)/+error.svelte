<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { CircleAlert, ArrowLeft } from '@lucide/svelte';
</script>

<svelte:head><title>{page.status} · Kohee Studio</title></svelte:head>
<section class="s-panel s-empty">
	<CircleAlert size={36} />
	<p class="s-eyebrow">STUDIO / {page.status}</p>
	<h1 style="font-size:1.5rem;margin-top:12px">
		{page.status === 403
			? 'Akses terbatas'
			: page.status === 404
				? 'Halaman tidak ditemukan'
				: 'Data belum dapat dimuat'}
	</h1>
	<p style="margin:12px auto;max-width:460px">
		{page.error?.message ?? 'Coba kembali ke overview atau muat ulang halaman.'}
	</p>
	<a class="s-button primary" href={resolve('/admin/(studio)/[...path]', { path: '' })}
		><ArrowLeft size={16} />Kembali ke Overview</a
	>
</section>
