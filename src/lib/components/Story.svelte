<script lang="ts">
	import Mascot from './Mascot.svelte';
	import { brand } from '#lib/brand.ts';
	import { useStorefront } from '#lib/storefront.ts';
	const store = useStorefront();
	const products = $derived(store().products);
	const story = $derived(store().content.story);
	import { reveal } from '#lib/reveal.ts';

	const chocori = $derived(products.find((p) => p.category === 'non-coffee') ?? products[0]);
</script>

<section id="story" class="story" aria-labelledby="story-title">
	<div class="daruma text-ink" style="--daruma-opacity: 0.05; --daruma-pos: 300px 0"></div>

	<div class="wrap mx-auto max-w-[90rem] px-4 md:px-8">
		<div class="on-red block" use:reveal>
			<div class="daruma text-ivory" style="--daruma-opacity: 0.09; --daruma-size: 380px"></div>
			<p class="block-label accent">Our Story</p>
			<Mascot class="cat text-ivory" label="Maskot kucing Kohee Break memeluk segelas kopi" />
			<img
				src={store().media[story.imageId] ?? chocori?.image ?? '/products/bottle-chocori.png'}
				alt=""
				class="bottle"
				sizes="(min-width: 1024px) 12vw, 30vw"
				loading="lazy"
			/>
			<p class="block-jp" lang="ja" aria-hidden="true">{brand.katakana}</p>
		</div>

		<div class="text">
			<h2 id="story-title" class="quote display" use:reveal={{ clip: true }}>
				{story.heading.split('\n')[0]}
				<span class="text-red">{story.heading.split('\n').slice(1).join(' ')}</span>
			</h2>
			<div class="body" use:reveal={{ delay: 150 }}>
				{#each story.description.split('\n\n') as paragraph, i (i)}<p>{paragraph}</p>{/each}
			</div>
			<p class="sign accent" use:reveal={{ delay: 250 }}>
				<span class="rule" aria-hidden="true"></span>
				{brand.tagline}
			</p>
		</div>
	</div>
</section>

<style>
	.story {
		position: relative;
		isolation: isolate;
		overflow: clip;
		padding-block: 4rem 9rem;
	}

	.wrap {
		position: relative;
		display: grid;
		gap: 3rem;
	}

	.block {
		position: relative;
		overflow: hidden;
		display: grid;
		place-items: center;
		aspect-ratio: 4 / 5;
		max-height: 34rem;
		background: var(--color-red);
	}

	.block-label {
		position: absolute;
		top: 1.25rem;
		left: 1.25rem;
		font-size: 0.85rem;
		letter-spacing: 0.2em;
		color: var(--color-ivory);
	}

	.block :global(.cat) {
		position: relative;
		height: 68%;
		width: auto;
		translate: -8% 0;
	}

	.bottle {
		position: absolute;
		right: -4%;
		bottom: -10%;
		width: 34%;
		height: auto;
		rotate: 14deg;
		filter: drop-shadow(0 1rem 1.25rem rgb(17 17 17 / 0.35));
	}

	.block-jp {
		position: absolute;
		left: 1.25rem;
		bottom: 1.25rem;
		writing-mode: vertical-rl;
		letter-spacing: 0.45em;
		font-size: 0.75rem;
		color: var(--color-blush);
	}

	.quote {
		font-size: clamp(2.75rem, 11vw, 6rem);
		line-height: 0.95;
	}

	.quote span {
		display: block;
		margin-top: 0.15em;
	}

	.body {
		display: grid;
		gap: 1rem;
		margin-top: 1.75rem;
		max-width: 34rem;
		font-size: 1.1rem;
		line-height: 1.65;
	}

	.sign {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		margin-top: 2rem;
		font-size: 0.9rem;
		letter-spacing: 0.14em;
		color: var(--color-red);
	}

	.rule {
		width: 3rem;
		height: 2px;
		background: currentColor;
	}

	@media (min-width: 64rem) {
		.story {
			padding-block: 7rem 12rem;
		}

		.wrap {
			grid-template-columns: repeat(12, minmax(0, 1fr));
			align-items: center;
			column-gap: 1.5rem;
		}

		.block {
			grid-column: 1 / 6;
			max-height: none;
		}

		.text {
			grid-column: 7 / 13;
		}
	}
</style>
