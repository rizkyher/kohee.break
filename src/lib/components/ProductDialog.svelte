<script lang="ts">
	import { X } from '@lucide/svelte';
	import QtyStepper from './QtyStepper.svelte';
	import Shape from './Shape.svelte';
	import { cart, ui } from '#lib/cart.svelte.ts';
	import { formatRupiah } from '#lib/order.ts';
	import { productById, type Product } from '#lib/products.ts';

	let dialog: HTMLDialogElement;
	let qty = $state(1);
	// Keep the last product rendered while the sheet animates closed.
	let shown = $state<Product>();

	$effect(() => {
		const product = productById(ui.productId);
		if (product) {
			shown = product;
			qty = 1;
			if (!dialog.open) dialog.showModal();
		} else if (dialog.open) {
			dialog.close();
		}
	});

	function addToCart() {
		if (!shown) return;
		cart.add(shown.id, qty);
		dialog.close();
	}
</script>

<dialog
	bind:this={dialog}
	class="sheet panel"
	aria-labelledby="product-dialog-title"
	onclose={() => (ui.productId = null)}
	onclick={(e) => e.target === dialog && dialog.close()}
>
	{#if shown}
		<div class="layout">
			<div class="media on-red" aria-hidden="true">
				<div class="daruma text-ivory" style="--daruma-opacity: 0.09; --daruma-size: 360px"></div>
				<Shape name="hill" class="media-hill text-cream" />
				<enhanced:img
					src={shown.image}
					alt=""
					class="bottle"
					sizes="(min-width: 768px) 24rem, 60vw"
				/>
			</div>

			<div class="body">
				<button
					type="button"
					class="close"
					onclick={() => dialog.close()}
					aria-label="Tutup detail"
				>
					<X size={22} strokeWidth={2.5} aria-hidden="true" />
				</button>

				<p class="meta accent">
					{shown.category === 'coffee' ? 'Coffee' : 'Non Coffee'} · {shown.size}
					{#if shown.badge}· {shown.badge}{/if}
				</p>
				<h2 id="product-dialog-title" class="name accent">{shown.name}</h2>
				<p class="kind">{shown.kind}</p>
				<p class="desc">{shown.description}</p>

				<dl class="facts">
					<div>
						<dt>Harga</dt>
						<dd class="display price">{formatRupiah(shown.price)}</dd>
					</div>
					<div>
						<dt>Ukuran</dt>
						<dd class="accent text-xl">{shown.size}</dd>
					</div>
				</dl>

				{#if shown.available}
					<div class="buy">
						<QtyStepper value={qty} label={shown.name} onchange={(n) => (qty = n)} />
						<button type="button" class="btn btn-red grow" onclick={addToCart}>
							Add to Cart · {formatRupiah(shown.price * qty)}
						</button>
					</div>
					{#if cart.qtyOf(shown.id) > 0}
						<p class="note">
							Sudah ada {cart.qtyOf(shown.id)} di keranjang. Jumlah ini akan ditambahkan.
						</p>
					{/if}
				{:else}
					<p class="soldout" role="status">
						{shown.name} sedang habis. Cek lagi nanti atau tanyakan stoknya lewat WhatsApp.
					</p>
				{/if}
			</div>
		</div>
	{/if}
</dialog>

<style>
	.layout {
		display: grid;
		overflow-y: auto;
		max-height: inherit;
		overscroll-behavior: contain;
	}

	.media {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 15rem;
		padding: 1.5rem 0 0;
		overflow: hidden;
		background: var(--color-red);
	}

	:global(.media-hill) {
		position: absolute;
		inset: auto 0 0;
		width: 100%;
		height: 55%;
	}

	.bottle {
		position: relative;
		width: min(42vw, 13rem);
		height: auto;
		transform: rotate(-5deg) translateY(8%);
		filter: drop-shadow(0 1rem 1rem rgb(17 17 17 / 0.3));
	}

	.body {
		position: relative;
		padding: 1.5rem 1rem 2rem;
	}

	.close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border: 2px solid var(--color-ink);
		cursor: pointer;
	}

	.close:hover {
		background: var(--color-ink);
		color: var(--color-ivory);
	}

	.meta {
		font-size: 0.75rem;
		letter-spacing: 0.16em;
		color: var(--color-muted);
		padding-right: 3.5rem;
	}

	.name {
		margin-top: 0.5rem;
		font-size: clamp(2.25rem, 9vw, 3.5rem);
		line-height: 1;
		letter-spacing: 0.06em;
		color: var(--color-red);
	}

	.kind {
		margin-top: 0.5rem;
		font-weight: 600;
		font-size: 1.1rem;
	}

	.desc {
		margin-top: 0.5rem;
		line-height: 1.6;
		color: var(--color-muted);
	}

	.facts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		margin-top: 1.25rem;
		border-block: 2px solid var(--color-ink);
	}

	.facts > div {
		padding-block: 0.9rem;
	}

	.facts > div + div {
		padding-left: 1rem;
		border-left: 2px solid var(--color-ink);
	}

	dt {
		font-family: var(--font-accent);
		font-weight: 700;
		font-size: 0.75rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	.price {
		margin-top: 0.25rem;
		font-size: 2rem;
		line-height: 1;
		color: var(--color-red);
	}

	.buy {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.note,
	.soldout {
		margin-top: 1rem;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.soldout {
		padding: 1rem;
		border: 2px solid var(--color-red);
		color: var(--color-red);
		font-weight: 600;
	}

	@media (min-width: 48rem) {
		.layout {
			grid-template-columns: 2fr 3fr;
		}

		.media {
			min-height: 32rem;
		}

		.bottle {
			width: 68%;
		}

		.body {
			padding: 2.5rem 2.5rem 2.5rem;
			align-self: center;
		}
	}
</style>
