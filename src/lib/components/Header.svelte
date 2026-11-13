<script lang="ts">
	import { Menu as MenuIcon, ShoppingBag, X } from '@lucide/svelte';
	import Mascot from './Mascot.svelte';
	import { cart, ui } from '#lib/cart.svelte.ts';
	import { useStorefront } from '#lib/storefront.ts';
	const store = useStorefront();
	const storeName = $derived(store().settings.storeName);

	const links = [
		{ href: '#top', label: 'Home' },
		{ href: '#menu', label: 'Menu' },
		{ href: '#story', label: 'Our Story' }
	];

	let scrollY = $state(0);
	let menuOpen = $state(false);
</script>

<svelte:window bind:scrollY onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)} />

<header class="site-header" class:scrolled={scrollY > 12 || menuOpen}>
	<div class="mx-auto flex h-16 max-w-[90rem] items-center gap-3 px-4 md:h-20 md:px-8">
		<a
			href="#top"
			class="logo group flex items-center gap-2.5"
			aria-label={`${storeName}, kembali ke atas`}
		>
			{#key cart.bumps}
				<span class="mascot" class:hop={cart.bumps > 0}>
					<Mascot class="h-10 w-auto text-mascot md:h-12" />
				</span>
			{/key}
			<span class="flex flex-col gap-1 leading-none">
				<span class="display text-[1.4rem] md:text-[1.65rem]">{storeName}</span>
				<span class="text-[0.62rem] tracking-[0.32em] text-muted" lang="ja">コーヒーブレイク</span>
			</span>
		</a>

		<nav aria-label="Navigasi utama" class="ml-auto hidden md:block">
			<ul class="flex items-center gap-8">
				{#each links as link (link.href)}
					<li><a class="nav-link accent text-sm" href={link.href}>{link.label}</a></li>
				{/each}
			</ul>
		</nav>

		<button
			type="button"
			class="icon-btn ml-auto md:ml-4"
			onclick={() => (ui.cartOpen = true)}
			aria-label={cart.count
				? `Buka keranjang, ${cart.count} item`
				: 'Buka keranjang, masih kosong'}
		>
			<ShoppingBag size={22} strokeWidth={2.25} aria-hidden="true" />
			{#if cart.count > 0}
				{#key cart.bumps}
					<span class="badge" aria-hidden="true">{cart.count}</span>
				{/key}
			{/if}
		</button>

		<button
			type="button"
			class="icon-btn menu-toggle"
			aria-expanded={menuOpen}
			aria-controls="mobile-nav"
			aria-label={menuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
			onclick={() => (menuOpen = !menuOpen)}
		>
			{#if menuOpen}
				<X size={24} strokeWidth={2.25} aria-hidden="true" />
			{:else}
				<MenuIcon size={24} strokeWidth={2.25} aria-hidden="true" />
			{/if}
		</button>
	</div>

	<nav id="mobile-nav" aria-label="Navigasi utama" class="mobile-nav md:hidden" hidden={!menuOpen}>
		<ul class="px-4 pt-2 pb-6">
			{#each links as link, i (link.href)}
				<li>
					<a
						class="display flex items-baseline gap-3 py-2 text-5xl"
						href={link.href}
						onclick={() => (menuOpen = false)}
					>
						<span class="accent text-xs text-red">0{i + 1}</span>{link.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</header>

<style>
	.site-header {
		position: sticky;
		top: 0;
		z-index: 40;
		background: rgb(241 234 218 / 0);
		border-bottom: 2px solid transparent;
		transition:
			background-color 0.3s ease,
			border-color 0.3s ease;
	}

	.site-header.scrolled {
		background: var(--color-cream);
		border-color: var(--color-ink);
	}

	.mascot {
		display: block;
		transform-origin: 50% 100%;
		animation: hop 0.8s var(--ease-out-expo) 1.4s both;
	}

	.mascot.hop {
		animation-delay: 0s;
	}

	@media (hover: hover) {
		.logo:hover .mascot {
			animation: hop 0.8s var(--ease-out-expo);
		}
	}

	.nav-link {
		position: relative;
		display: inline-block;
		padding: 0.75rem 0;
	}

	.nav-link::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0.4rem;
		height: 2px;
		background: var(--color-red);
		transform: scaleX(0);
		transform-origin: right;
		transition: transform 0.4s var(--ease-out-expo);
	}

	.nav-link:hover::after,
	.nav-link:focus-visible::after {
		transform: scaleX(1);
		transform-origin: left;
	}

	.icon-btn {
		position: relative;
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border: 2px solid var(--color-ink);
		background: var(--color-cream);
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			color 0.2s ease;
	}

	.icon-btn:hover {
		background: var(--color-ink);
		color: var(--color-ivory);
	}

	.badge {
		position: absolute;
		top: -0.6rem;
		right: -0.6rem;
		min-width: 1.4rem;
		height: 1.4rem;
		padding: 0 0.3rem;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: var(--color-red);
		color: var(--color-ivory);
		font-family: var(--font-accent);
		font-weight: 700;
		font-size: 0.75rem;
		line-height: 1;
		animation: pop 0.45s var(--ease-spring);
	}

	@media (min-width: 48rem) {
		.menu-toggle {
			display: none;
		}
	}

	.mobile-nav {
		position: absolute;
		inset: 100% 0 auto 0;
		background: var(--color-cream);
		border-bottom: 2px solid var(--color-ink);
	}
</style>
