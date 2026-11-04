<script lang="ts">
	import { MessageCircle } from '@lucide/svelte';
	import Shape from './Shape.svelte';
	import { ui } from '#lib/cart.svelte.ts';
	import { reveal } from '#lib/reveal.ts';

	// Fuel gauge from the "Fuel It Up!" poster: 13 ticks across a 140° arc.
	const ticks = Array.from({ length: 13 }, (_, i) => {
		const angle = ((-160 + (i * 140) / 12) * Math.PI) / 180;
		const major = i === 0 || i === 6 || i === 12;
		const [outer, inner] = [140, major ? 108 : 120];
		return {
			x1: 150 + outer * Math.cos(angle),
			y1: 150 + outer * Math.sin(angle),
			x2: 150 + inner * Math.cos(angle),
			y2: 150 + inner * Math.sin(angle),
			width: major ? 9 : 5
		};
	});
</script>

<section id="order" class="final on-red" aria-labelledby="final-title">
	<Shape name="wave" stretch class="final-wave-top text-red" />
	<div class="clip" aria-hidden="true">
		<div class="daruma text-ivory" style="--daruma-opacity: 0.07; --daruma-size: 480px"></div>
	</div>

	<div class="inner mx-auto max-w-[90rem] px-4 md:px-8">
		<div class="gauge" use:reveal aria-hidden="true">
			<svg viewBox="0 0 300 170">
				{#each ticks as tick, i (i)}
					<line {...tick} stroke="currentColor" stroke-width={tick.width} stroke-linecap="square" />
				{/each}
				<text x="14" y="168" class="display" fill="currentColor" font-size="24">E</text>
				<text x="272" y="168" class="display" fill="currentColor" font-size="24">F</text>
				<g class="needle">
					<path d="M146 150 L150 46 L154 150 Z" fill="currentColor" />
					<circle cx="150" cy="150" r="9" fill="currentColor" />
				</g>
			</svg>
			<p class="accent fuel">Fuel it up!</p>
		</div>

		<h2 id="final-title" class="title display" use:reveal={{ clip: true }}>
			Your break<br />is calling.
		</h2>
		<p class="lead">Pilih favoritmu. Pesan lewat WhatsApp. Nikmati waktu jedamu.</p>
		<button type="button" class="btn btn-ivory cta" onclick={() => (ui.cartOpen = true)}>
			<MessageCircle size={18} strokeWidth={2.5} aria-hidden="true" /> Order Your Kohee
		</button>
	</div>

	<Shape name="wave" stretch class="final-wave-bottom text-cream" />
</section>

<style>
	.final {
		position: relative;
		isolation: isolate;
		background: var(--color-red);
		color: var(--color-ivory);
		padding-block: 3rem 7rem;
	}

	:global(.final-wave-top) {
		position: absolute;
		left: 0;
		bottom: calc(100% - 1px);
		width: 100%;
		height: 3rem;
	}

	:global(.final-wave-bottom) {
		position: absolute;
		left: 0;
		bottom: -1px;
		width: 100%;
		height: 3rem;
		scale: -1 1;
	}

	.clip {
		position: absolute;
		inset: 0;
		overflow: hidden;
		z-index: -1;
	}

	.inner {
		display: grid;
		justify-items: start;
	}

	.gauge {
		width: min(17rem, 70vw);
		justify-self: end;
		text-align: center;
	}

	.needle {
		transform-origin: 150px 150px;
		rotate: 60deg;
		transition: rotate 1.8s var(--ease-spring) 0.25s;
	}

	:global(.reveal-pending) .needle {
		rotate: -70deg;
	}

	.fuel {
		margin-top: 0.5rem;
		font-size: 0.9rem;
		letter-spacing: 0.2em;
		color: var(--color-blush);
	}

	.title {
		margin-top: 1.5rem;
		font-size: clamp(4rem, 19vw, 14rem);
		line-height: 0.86;
	}

	.lead {
		margin-top: 1.5rem;
		max-width: 30rem;
		font-size: 1.15rem;
		line-height: 1.55;
		color: var(--color-blush);
	}

	.cta {
		margin-top: 2rem;
	}

	@media (min-width: 64rem) {
		.final {
			padding-block: 4rem 9rem;
		}

		:global(.final-wave-top),
		:global(.final-wave-bottom) {
			height: 5rem;
		}

		.inner {
			grid-template-columns: repeat(12, minmax(0, 1fr));
			column-gap: 1.5rem;
		}

		.gauge {
			grid-column: 9 / 13;
			grid-row: 1 / 3;
			align-self: center;
			width: 100%;
		}

		.title {
			grid-column: 1 / 9;
			grid-row: 1;
		}

		.lead,
		.cta {
			grid-column: 1 / 8;
		}

		.lead {
			font-size: 1.3rem;
		}
	}
</style>
