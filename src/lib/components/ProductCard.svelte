<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import Shape, { type ShapeName } from './Shape.svelte';
	import { cart, ui } from '#lib/cart.svelte.ts';
	import { formatRupiah } from '#lib/order.ts';
	import type { Product } from '#lib/products.ts';

	let { product, index }: { product: Product; index: number } = $props();

	// Each spread gets its own cut-out and tilt, like the bottles scattered on the menu poster.
	const looks: { shape: ShapeName; tilt: number }[] = [
		{ shape: 'edge', tilt: -7 },
		{ shape: 'corner', tilt: 6 },
		{ shape: 'hill', tilt: -4 },
		{ shape: 'edge', tilt: 8 }
	];
	const look = $derived(looks[index % looks.length]);
	const number = $derived(String(index + 1).padStart(2, '0'));
	const inCart = $derived(cart.qtyOf(product.id));
</script>

<article class="card" class:sold-out={!product.available} aria-labelledby={`product-${product.id}`}>
	<button
		type="button"
		class="media"
		onclick={() => (ui.productId = product.id)}
		aria-label={`Lihat detail ${product.name}`}
	>
		<Shape name={look.shape} class={`media-shape shape-${look.shape} text-red`} />
		<span class="number display" aria-hidden="true">{number}</span>
		<enhanced:img
			src={product.image}
			alt=""
			class="bottle"
			style={`--tilt: ${look.tilt}deg`}
			sizes="(min-width: 1024px) 18vw, 50vw"
			loading="lazy"
		/>
		{#if product.badge}
			<span class="badge accent">{product.badge}</span>
		{/if}
		{#if !product.available}
			<span class="stamp accent">Sold out</span>
		{/if}
	</button>

	<div class="info">
		<p class="meta accent">
			{product.category === 'coffee' ? 'Coffee' : 'Non Coffee'} · {product.size}
		</p>
		<h3 id={`product-${product.id}`} class="name accent">{product.name}</h3>
		<p class="kind">{product.kind}</p>
		<p class="desc">{product.description}</p>

		<div class="buy">
			<p class="price display">{formatRupiah(product.price)}</p>
			<div class="flex gap-2">
				<button
					type="button"
					class="btn btn-red btn-sm"
					disabled={!product.available}
					onclick={() => cart.add(product.id)}
					aria-label={product.available
						? `Tambah ${product.name} ke keranjang`
						: `${product.name} sedang habis`}
				>
					{#if product.available}
						<Plus size={16} strokeWidth={2.5} aria-hidden="true" /> Tambah
					{:else}
						Habis
					{/if}
				</button>
				<button type="button" class="btn btn-sm" onclick={() => (ui.productId = product.id)}>
					Detail
				</button>
			</div>
		</div>
		{#if inCart > 0}
			<p class="in-cart">{inCart} di keranjang</p>
		{/if}
	</div>
</article>

<style>
	.card {
		display: grid;
		gap: 1.25rem;
	}

	.media {
		position: relative;
		display: grid;
		place-items: center;
		aspect-ratio: var(--media-ratio, 4 / 5);
		container-type: size;
		overflow: hidden;
		border: 2px solid var(--color-ink);
		background: var(--color-cream);
		cursor: pointer;
	}

	:global(.media-shape) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	:global(.media-shape.shape-hill) {
		inset: 30% 0 0;
		height: 70%;
	}

	.number {
		position: absolute;
		top: 0.75rem;
		left: 1rem;
		font-size: clamp(3rem, 12vw, 5rem);
		line-height: 1;
		color: var(--color-ink);
	}

	.bottle {
		position: relative;
		height: 74cqh;
		width: auto;
		transform: rotate(var(--tilt));
		filter: drop-shadow(0 1rem 1rem rgb(17 17 17 / 0.25));
		transition: transform 0.6s var(--ease-out-expo);
	}

	@media (hover: hover) {
		.media:hover .bottle {
			transform: rotate(calc(var(--tilt) * -0.6)) scale(1.06) translateY(-2%);
		}
	}

	.badge {
		position: absolute;
		top: 1rem;
		right: 1rem;
		padding: 0.35rem 0.6rem;
		background: var(--color-ink);
		color: var(--color-ivory);
		font-size: 0.75rem;
		letter-spacing: 0.12em;
	}

	.stamp {
		position: absolute;
		padding: 0.5rem 1rem;
		border: 3px solid var(--color-red);
		background: var(--color-ivory);
		color: var(--color-red);
		font-size: 1.5rem;
		letter-spacing: 0.1em;
		rotate: -12deg;
	}

	.sold-out .bottle {
		filter: grayscale(0.85);
		opacity: 0.6;
	}

	.meta {
		font-size: 0.75rem;
		letter-spacing: 0.16em;
		color: var(--color-muted);
	}

	.name {
		margin-top: 0.35rem;
		font-size: clamp(2rem, 7vw, 2.75rem);
		line-height: 1;
		letter-spacing: 0.06em;
		color: var(--color-red);
	}

	.kind {
		margin-top: 0.35rem;
		font-weight: 600;
	}

	.desc {
		margin-top: 0.5rem;
		max-width: 30rem;
		line-height: 1.55;
		color: var(--color-muted);
	}

	.buy {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem 1rem;
		margin-top: 1.1rem;
		padding-top: 1rem;
		border-top: 2px solid var(--color-ink);
	}

	.price {
		font-size: 2.25rem;
		line-height: 1;
	}

	.in-cart {
		margin-top: 0.6rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-red);
	}
</style>
