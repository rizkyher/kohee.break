<script lang="ts">
	import { untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { ShoppingBag } from '@lucide/svelte';
	import { cart, ui } from '#lib/cart.svelte.ts';
	import { formatRupiah } from '#lib/order.ts';

	const TOAST_MS = 2400;
	let toast = $state('');
	const motion = $derived(prefersReducedMotion.current ? 0 : 350);

	$effect(() => {
		if (cart.bumps === 0) return;
		toast = `${untrack(() => cart.lastAdded)} masuk ke keranjang`;
		const timer = setTimeout(() => (toast = ''), TOAST_MS);
		return () => clearTimeout(timer);
	});
</script>

<!-- Live region is always mounted so screen readers announce each add. -->
<div class="toast-region" role="status" aria-live="polite">
	{#if toast}
		<p class="toast accent" transition:fly={{ y: 24, duration: motion }}>{toast}</p>
	{/if}
</div>

{#if cart.count > 0 && !ui.cartOpen}
	<div class="floating md:hidden" transition:fly={{ y: 96, duration: motion }}>
		<button type="button" class="btn btn-red w-full" onclick={() => (ui.cartOpen = true)}>
			<ShoppingBag size={18} strokeWidth={2.5} aria-hidden="true" />
			<span>Lihat keranjang · {cart.count} item</span>
			<span class="ml-auto">{formatRupiah(cart.total)}</span>
		</button>
	</div>
{/if}

<style>
	.toast-region {
		position: fixed;
		z-index: 45;
		left: 1rem;
		right: 1rem;
		bottom: calc(5.5rem + env(safe-area-inset-bottom));
		display: flex;
		justify-content: center;
		pointer-events: none;
	}

	.toast {
		padding: 0.75rem 1.1rem;
		border: 2px solid var(--color-ink);
		background: var(--color-ivory);
		font-size: 0.9rem;
		letter-spacing: 0.04em;
		box-shadow: 4px 4px 0 var(--color-ink);
	}

	.floating {
		position: fixed;
		z-index: 44;
		left: 1rem;
		right: 1rem;
		bottom: calc(1rem + env(safe-area-inset-bottom));
		box-shadow: 4px 4px 0 var(--color-ink);
	}

	.floating .btn {
		justify-content: flex-start;
		border-color: var(--color-ink);
		text-transform: none;
		letter-spacing: 0.02em;
	}

	@media (min-width: 48rem) {
		.toast-region {
			left: auto;
			right: 2rem;
			bottom: 2rem;
		}
	}
</style>
