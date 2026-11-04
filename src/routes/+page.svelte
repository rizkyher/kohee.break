<script lang="ts">
	import { onMount } from 'svelte';
	import CartDialog from '#lib/components/CartDialog.svelte';
	import CartFeedback from '#lib/components/CartFeedback.svelte';
	import FinalCta from '#lib/components/FinalCta.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import Header from '#lib/components/Header.svelte';
	import Hero from '#lib/components/Hero.svelte';
	import Marquee from '#lib/components/Marquee.svelte';
	import Menu from '#lib/components/Menu.svelte';
	import ProductDialog from '#lib/components/ProductDialog.svelte';
	import Signature from '#lib/components/Signature.svelte';
	import Story from '#lib/components/Story.svelte';
	import { brand } from '#lib/brand.ts';
	import { cart } from '#lib/cart.svelte.ts';

	const title = 'Kohee Break | Break Time, Kohee Time';
	const description =
		'Kopi botol 250ml dari Kohee Break: Kuro Aren, Amai Scotch, Kuro Latte, dan Chocori. Pilih favoritmu, lalu pesan langsung lewat WhatsApp.';
	const ogImage = `${brand.siteUrl ?? ''}/og.png`;

	onMount(() => cart.load());
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	{#if brand.siteUrl}
		<link rel="canonical" href={`${brand.siteUrl}/`} />
		<meta property="og:url" content={`${brand.siteUrl}/`} />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="id_ID" />
	<meta property="og:site_name" content="Kohee Break" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Maskot kucing Kohee Break dan botol kopi 250ml" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<a href="#menu" class="skip sr-only-focusable btn btn-red">Langsung ke menu</a>
<Header />
<main>
	<Hero />
	<Marquee />
	<Signature />
	<Menu />
	<Story />
	<FinalCta />
</main>
<Footer />

<CartFeedback />
<ProductDialog />
<CartDialog />

<style>
	.skip {
		position: fixed;
		z-index: 60;
		top: 0.75rem;
		left: 0.75rem;
	}
</style>
