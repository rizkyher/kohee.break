<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import Mascot from './Mascot.svelte';
	import { cart, ui } from '#lib/cart.svelte.ts';
	import { formatRupiah } from '#lib/order.ts';
	import { signature as product } from '#lib/products.ts';
	import { reveal } from '#lib/reveal.ts';
</script>

<!-- Poster "Our Signature Kuro Aren": the headline changes colour where it crosses the red panel -->
<section id="signature" class="signature" aria-labelledby="signature-title">
	<div class="panel on-red" aria-hidden="true">
		<div class="daruma text-ivory" style="--daruma-opacity: 0.08; --daruma-size: 420px"></div>
	</div>

	<p class="eyebrow accent">
		<span class="text-cream">Our</span>
		<span class="text-red">Signature</span>
	</p>

	<h2 id="signature-title" class="title display" use:reveal={{ clip: true }}>
		<span class="layer on-panel">Kuro<br />Aren</span>
		<span class="layer off-panel" aria-hidden="true">Kuro<br />Aren</span>
	</h2>

	<div class="visual" use:reveal={{ delay: 120 }}>
		<enhanced:img
			src={product.image}
			alt={`Botol Kohee Break ${product.size} berisi ${product.name}`}
			class="bottle"
			sizes="(min-width: 1024px) 22vw, 56vw"
			loading="lazy"
		/>
		<Mascot class="peek text-mascot" />
	</div>

	<div class="info" use:reveal={{ delay: 200 }}>
		<p class="percent display">100%</p>
		<p class="moment accent">Your break moment</p>

		<dl class="facts">
			<div>
				<dt>Rasa</dt>
				<dd>{product.kind}. {product.description}</dd>
			</div>
			<div class="pair">
				<div>
					<dt>Ukuran</dt>
					<dd class="accent">{product.size}</dd>
				</div>
				<div>
					<dt>Harga</dt>
					<dd class="price display">{formatRupiah(product.price)}</dd>
				</div>
			</div>
		</dl>

		<div class="actions">
			<button
				type="button"
				class="btn btn-red"
				disabled={!product.available}
				onclick={() => cart.add(product.id)}
			>
				<Plus size={18} strokeWidth={2.5} aria-hidden="true" />
				{product.available ? 'Add to My Break' : 'Sedang habis'}
			</button>
			<button type="button" class="details" onclick={() => (ui.productId = product.id)}>
				Lihat detail {product.name}
			</button>
		</div>
	</div>
</section>

<style>
	.signature {
		--split: 36%;
		position: relative;
		isolation: isolate;
		display: grid;
		grid-template-columns: var(--split) minmax(0, 1fr);
		grid-template-rows: auto auto auto auto;
		margin-top: 2.5rem;
		overflow: clip;
	}

	.panel {
		grid-column: 1;
		grid-row: 1 / 4;
		position: relative;
		overflow: hidden;
		background: var(--color-red);
		z-index: -1;
	}

	.eyebrow {
		grid-column: 1 / -1;
		grid-row: 1;
		display: grid;
		grid-template-columns: var(--split) 1fr;
		padding-top: 2.5rem;
		font-size: clamp(0.85rem, 2.6vw, 1.1rem);
		letter-spacing: 0.2em;
	}

	.eyebrow span:first-child {
		justify-self: end;
		padding-right: 0.6em;
	}

	.title {
		grid-column: 1 / -1;
		grid-row: 2;
		display: grid;
		padding-top: 0.5rem;
		font-size: clamp(6rem, 33vw, 19rem);
		line-height: 0.82;
	}

	.layer {
		grid-area: 1 / 1;
		padding-left: calc(var(--split) - 0.95em);
	}

	.on-panel {
		color: var(--color-cream);
		clip-path: inset(0 calc(100% - var(--split)) 0 0);
	}

	.off-panel {
		color: var(--color-red);
		clip-path: inset(0 0 0 var(--split));
	}

	.visual {
		grid-column: 1 / -1;
		grid-row: 3;
		position: relative;
		justify-self: start;
		width: min(58vw, 22rem);
		margin-left: calc(var(--split) - min(29vw, 11rem));
		margin-top: -2.5rem;
		padding-bottom: 2rem;
	}

	.bottle {
		display: block;
		width: 100%;
		height: auto;
		transform: rotate(-6deg);
		filter: drop-shadow(0 1.5rem 1.5rem rgb(17 17 17 / 0.28));
	}

	.visual :global(.peek) {
		position: absolute;
		right: -18%;
		bottom: 1.5rem;
		height: 28%;
		width: auto;
	}

	.info {
		grid-column: 1 / -1;
		grid-row: 4;
		padding: 2rem 1rem 0;
	}

	.percent {
		color: var(--color-red);
		font-size: clamp(5rem, 24vw, 10rem);
		line-height: 0.85;
	}

	.moment {
		font-size: clamp(1rem, 3.5vw, 1.35rem);
		letter-spacing: 0.12em;
	}

	.facts {
		margin-top: 1.75rem;
		border-top: 2px solid var(--color-ink);
	}

	.facts > div {
		padding-block: 1rem;
		border-bottom: 2px solid var(--color-ink);
	}

	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	dt {
		font-family: var(--font-accent);
		font-weight: 700;
		font-size: 0.75rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	dd {
		margin-top: 0.35rem;
		font-size: 1.05rem;
		line-height: 1.5;
		max-width: 34rem;
	}

	.price {
		color: var(--color-red);
		font-size: 2.25rem;
		line-height: 1;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem 1.5rem;
		margin-top: 1.5rem;
	}

	.details {
		min-height: 2.75rem;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 0.3em;
		text-decoration-thickness: 2px;
		cursor: pointer;
	}

	.details:hover {
		color: var(--color-red);
	}

	@media (min-width: 64rem) {
		.signature {
			--split: 40%;
			grid-template-rows: auto auto 1fr;
			margin-top: 4rem;
		}

		.panel {
			grid-row: 1 / -1;
		}

		.title {
			font-size: min(17vw, 17rem);
		}

		.visual {
			grid-column: 1;
			grid-row: 3;
			justify-self: end;
			width: min(24vw, 22rem);
			margin: -4rem -10% 0 0;
			padding-bottom: 7rem;
		}

		/* sits beside the headline, filling the cream half the way "100%" does on the poster */
		.info {
			grid-column: 2;
			grid-row: 2 / 4;
			align-self: center;
			padding: 2rem 3rem 4rem 30%;
		}
	}
</style>
