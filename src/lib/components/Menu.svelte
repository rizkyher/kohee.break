<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import ProductCard from './ProductCard.svelte';
	import { categories, products, type Category } from '#lib/products.ts';
	import { reveal } from '#lib/reveal.ts';

	let filter = $state<Category | 'all'>('all');
	const visible = $derived(
		filter === 'all' ? products : products.filter((p) => p.category === filter)
	);
	const motion = $derived(prefersReducedMotion.current ? 0 : 450);
</script>

<section id="menu" class="menu" aria-labelledby="menu-title">
	<div class="daruma text-ink" style="--daruma-opacity: 0.05; --daruma-pos: 160px 80px"></div>

	<div class="cq relative mx-auto max-w-[90rem] px-4 md:px-8">
		<header class="head">
			<h2 id="menu-title" class="title accent" use:reveal={{ clip: true }}>Coffee Menu</h2>
			<p class="sub" lang="ja" aria-hidden="true">メニュー</p>
			<p class="intro">
				Semua 250ml, siap dibawa ke mana pun jedamu. Tap botolnya untuk lihat detail.
			</p>

			<div class="filters" role="group" aria-label="Filter menu">
				{#each categories as category (category.value)}
					<button
						type="button"
						class="chip accent"
						aria-pressed={filter === category.value}
						onclick={() => (filter = category.value)}
					>
						{category.label}
						<span class="count">
							{category.value === 'all'
								? products.length
								: products.filter((p) => p.category === category.value).length}
						</span>
					</button>
				{/each}
			</div>
		</header>

		{#if visible.length > 0}
			<ul class="grid-list">
				{#each visible as product (product.id)}
					<li animate:flip={{ duration: motion }} in:fade={{ duration: motion / 1.5 }}>
						<ProductCard {product} index={products.indexOf(product)} />
					</li>
				{/each}
			</ul>
		{:else}
			<div class="empty">
				<p class="accent text-xl">Belum ada menu di kategori ini.</p>
				<p class="mt-2 text-muted">
					Menu baru akan muncul di sini. Sementara itu, cek pilihan lainnya.
				</p>
				<button type="button" class="btn mt-5" onclick={() => (filter = 'all')}
					>Lihat semua menu</button
				>
			</div>
		{/if}
	</div>
</section>

<style>
	.menu {
		position: relative;
		isolation: isolate;
		overflow: clip;
		padding-block: 5rem 6rem;
	}

	.head {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 2.5rem;
	}

	.title {
		font-size: min(calc(100cqi / 7.8), 9.5rem); /* 7.68em wide including tracking */
		line-height: 0.9;
		letter-spacing: 0.08em;
		color: var(--color-red);
	}

	.sub {
		font-size: 0.875rem;
		letter-spacing: 0.6em;
		color: var(--color-muted);
	}

	.intro {
		max-width: 28rem;
		font-size: 1.05rem;
		line-height: 1.55;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 2.75rem;
		padding: 0 1rem;
		border: 2px solid var(--color-ink);
		font-size: 0.9rem;
		letter-spacing: 0.08em;
		cursor: pointer;
		transition:
			background-color 0.25s ease,
			color 0.25s ease;
	}

	.chip:hover {
		background: var(--color-ivory);
	}

	.chip[aria-pressed='true'] {
		background: var(--color-ink);
		color: var(--color-ivory);
	}

	.count {
		font-size: 0.75rem;
		opacity: 0.8;
	}

	.grid-list {
		display: grid;
		gap: 3.5rem;
	}

	.empty {
		padding: 3rem 1.5rem;
		border: 2px dashed var(--color-ink);
		text-align: center;
	}

	@media (min-width: 48rem) {
		.grid-list {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			column-gap: 2rem;
		}

		/* stagger the second column so the spread reads like a magazine page, not a shelf */
		.grid-list > li:nth-child(even) {
			margin-top: 7rem;
		}
	}

	@media (min-width: 64rem) {
		.head {
			grid-template-columns: 1fr auto;
			align-items: end;
			column-gap: 3rem;
			margin-bottom: 4rem;
		}

		.title {
			grid-column: 1 / -1;
		}

		.sub {
			grid-column: 1 / -1;
			margin-top: -0.5rem;
		}

		.filters {
			justify-self: end;
			margin: 0;
		}

		.grid-list {
			grid-template-columns: repeat(12, minmax(0, 1fr));
			column-gap: 2.5rem;
			row-gap: 0;
		}

		.grid-list > li:nth-child(4n + 1),
		.grid-list > li:nth-child(4n) {
			--media-ratio: 5 / 4;
		}

		.grid-list > li:nth-child(4n + 1) {
			grid-column: 1 / 7;
		}

		.grid-list > li:nth-child(4n + 2) {
			grid-column: 8 / 12;
			margin-top: 9rem;
		}

		.grid-list > li:nth-child(4n + 3) {
			grid-column: 2 / 6;
			margin-top: -2rem;
		}

		.grid-list > li:nth-child(4n) {
			grid-column: 7 / 13;
			margin-top: 5rem;
		}
	}
</style>
