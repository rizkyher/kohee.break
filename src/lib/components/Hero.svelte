<script lang="ts">
	import Mascot from './Mascot.svelte';
	import Shape from './Shape.svelte';
	import { ui } from '#lib/cart.svelte.ts';
	import { brand } from '#lib/brand.ts';
	import { products, signature } from '#lib/products.ts';

	const chocori = products.find((p) => p.category === 'non-coffee') ?? signature;
</script>

<section id="top" class="hero" aria-labelledby="hero-title">
	<div class="daruma text-ink" style="--daruma-opacity: 0.055; --daruma-size: 520px"></div>
	<Shape name="edge" class="hero-edge text-red" />

	<div class="hero-grid cq mx-auto max-w-[90rem] px-4 md:px-8">
		<p class="kicker accent text-xs md:text-sm">
			<span class="text-red">{brand.tagline}</span>
			<span class="rule" aria-hidden="true"></span>
			<span>250ml</span>
		</p>

		<h1 id="hero-title" class="title display">
			<span class="line line-1"><span>Break dulu.</span></span>
			<span class="line line-2"><span>Kopinya lanjut.</span></span>
		</h1>

		<div class="visual" aria-hidden="true">
			<Shape name="hill" class="visual-hill text-red" />
			<!-- stage caps the bottle group's width so tablets keep phone proportions -->
			<div class="stage">
				<div class="parallax back" style="--parallax: -2.5rem">
					<enhanced:img
						src={chocori.image}
						alt=""
						class="bottle"
						sizes="(min-width: 1024px) 15vw, 34vw"
					/>
				</div>
				<div class="parallax front" style="--parallax: -5rem">
					<enhanced:img
						src={signature.image}
						alt=""
						class="bottle"
						sizes="(min-width: 1024px) 19vw, 46vw"
						fetchpriority="high"
						loading="eager"
					/>
				</div>
				<div class="parallax cat" style="--parallax: -8rem">
					<Mascot class="h-full w-auto" />
				</div>
			</div>
		</div>

		<div class="copy">
			<p class="lead">Kadang, yang kamu butuhkan cuma jeda dan sebotol Kohee Break.</p>
			<div class="ctas">
				<a href="#menu" class="btn">Explore Our Menu</a>
				<button type="button" class="btn btn-red" onclick={() => (ui.cartOpen = true)}>
					Order Your Break
				</button>
			</div>
		</div>

		<p class="vertical" lang="ja" aria-hidden="true">{brand.katakana}</p>
	</div>
</section>

<style>
	.hero {
		position: relative;
		isolation: isolate;
		overflow: clip;
		padding-block: 1.25rem 3.5rem;
	}

	:global(.hero-edge) {
		position: absolute;
		z-index: -1;
		right: -22vw;
		top: 52%;
		width: 78vw;
		height: auto;
	}

	.hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas: 'kicker' 'title' 'visual' 'copy';
	}

	.kicker {
		grid-area: kicker;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.rule {
		flex: 0 1 4rem;
		height: 2px;
		background: currentColor;
	}

	.title {
		grid-area: title;
		position: relative;
		z-index: 1;
	}

	.line {
		display: block;
		overflow: hidden;
		padding-bottom: 0.04em;
		white-space: nowrap;
	}

	.line > span {
		display: block;
		animation: rise 1s var(--ease-out-expo) both;
	}

	/* Anton measures 4.52em (line 1) and 6.09em (line 2), so these fill the column exactly */
	.line-1 {
		font-size: calc(100cqi / 4.7);
		color: var(--color-red);
	}

	.line-2 {
		font-size: calc(100cqi / 6.3);
	}

	.line-2 > span {
		animation-delay: 0.12s;
	}

	.visual {
		grid-area: visual;
		position: relative;
		height: 27rem;
		margin-top: 0.5rem;
	}

	:global(.visual-hill) {
		position: absolute;
		left: 50%;
		bottom: -0.5rem;
		width: min(30rem, 108%);
		translate: -50% 0;
	}

	.stage {
		position: absolute;
		inset-block: 0;
		left: 50%;
		width: min(100%, 27rem);
		translate: -50% 0;
	}

	.back,
	.front,
	.cat {
		position: absolute;
	}

	.back {
		width: 36%;
		left: 12%;
		bottom: 3.5rem;
	}

	.front {
		width: 48%;
		left: 40%;
		bottom: 0.5rem;
	}

	/* sits on cream on phones, so it keeps the mascot red */
	.cat {
		height: 5.5rem;
		left: 4%;
		top: 1rem;
		color: var(--color-mascot);
	}

	.bottle {
		display: block;
		width: 100%;
		height: auto;
		filter: drop-shadow(0 1.25rem 1.25rem rgb(17 17 17 / 0.22));
	}

	.back .bottle {
		--from-rotate: -14deg;
		transform: rotate(-9deg);
		animation: bottle-in 1.2s var(--ease-out-expo) 0.35s both;
	}

	.front .bottle {
		--from-rotate: 12deg;
		transform: rotate(5deg);
		animation: bottle-in 1.2s var(--ease-out-expo) 0.2s both;
	}

	.cat :global(svg) {
		transform-origin: 50% 100%;
		animation: hop 0.9s var(--ease-out-expo) 1.5s both;
	}

	.copy {
		grid-area: copy;
		position: relative;
		z-index: 1;
		margin-top: 1.5rem;
	}

	.lead {
		max-width: 26rem;
		font-size: 1.125rem;
		line-height: 1.5;
		font-weight: 500;
	}

	.ctas {
		display: grid;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.vertical {
		display: none;
	}

	@media (min-width: 40rem) {
		.ctas {
			display: flex;
			flex-wrap: wrap;
		}

		.visual {
			height: 32rem;
		}

		.stage {
			width: min(100%, 30rem);
		}
	}

	@media (min-width: 64rem) {
		.hero {
			padding-block: 2rem 5rem;
		}

		:global(.hero-edge) {
			top: -8%;
			right: -9vw;
			width: 40vw;
		}

		.hero-grid {
			grid-template-columns: repeat(12, minmax(0, 1fr));
			grid-template-rows: auto auto 1fr;
			grid-template-areas: none;
			column-gap: 1.5rem;
		}

		.kicker {
			grid-column: 1 / 7;
			grid-row: 1;
		}

		.title {
			grid-column: 1 / -1;
			grid-row: 2;
		}

		.line-1 {
			font-size: min(13.5vw, 13rem);
		}

		.line-2 {
			font-size: min(9.4vw, 9rem);
			margin-left: 8%;
		}

		.visual {
			grid-column: 8 / -1;
			grid-row: 1 / 4;
			height: auto;
			min-height: 40rem;
			margin: 0;
		}

		.stage {
			left: 0;
			width: 100%;
			translate: none;
		}

		:global(.visual-hill) {
			width: 120%;
			left: 52%;
			bottom: -3rem;
		}

		.back {
			width: 38%;
			left: 6%;
			bottom: 5rem;
		}

		.front {
			width: 50%;
			left: 38%;
			bottom: 1rem;
		}

		/* inside the red hill here, so flip to ivory like the Our Story block */
		.cat {
			height: 8.5rem;
			top: auto;
			left: 2%;
			bottom: 1rem;
			color: var(--color-ivory);
		}

		.copy {
			grid-column: 1 / 7;
			grid-row: 3;
			align-self: end;
			margin-top: 2.5rem;
		}

		.lead {
			font-size: 1.3rem;
		}

		.vertical {
			display: block;
			position: absolute;
			right: 1.25rem;
			top: 50%;
			translate: 0 -50%;
			writing-mode: vertical-rl;
			letter-spacing: 0.5em;
			font-size: 0.75rem;
			color: var(--color-ivory);
		}
	}
</style>
