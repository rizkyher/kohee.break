<script lang="ts">
	import { useStorefront } from '#lib/storefront.ts';
	import { reveal } from '#lib/reveal.ts';
	const store = useStorefront();
	const banners = $derived(
		[...store().content.banners.items]
			.filter((b) => b.active)
			.sort((a, b) => a.displayOrder - b.displayOrder)
	);
</script>

{#if banners.length}<section
		class="promos mx-auto max-w-[90rem] px-4 md:px-8"
		aria-label="Promosi Kohee Break"
	>
		{#each banners as banner (banner.id)}<article class="promo on-red" use:reveal>
				{#if store().media[banner.imageId]}<img
						src={store().media[banner.imageId]}
						alt={banner.title}
						loading="lazy"
					/>{/if}
				<div>
					<h2 class="display">{banner.title}</h2>
					{#if banner.ctaLabel && banner.ctaUrl}<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- CMS destination validated by safeLink on the server -->
						<a href={banner.ctaUrl} class="btn btn-ivory">{banner.ctaLabel}</a>{/if}
				</div>
			</article>{/each}
	</section>{/if}

<style>
	.promos {
		display: grid;
		gap: 2rem;
		padding-block: 3rem;
	}
	/* ivory on red is 9.87:1; the inherited ink colour was 1.9:1 */
	.promo {
		background: var(--color-red);
		color: var(--color-ivory);
		display: grid;
		grid-template-columns: 1fr;
		overflow: hidden;
	}
	.promo img {
		width: 100%;
		height: 20rem;
		object-fit: cover;
	}
	.promo > div {
		padding: 2rem;
	}
	.promo h2 {
		font-size: clamp(2.5rem, 7vw, 6rem);
		line-height: 1;
		margin-bottom: 1.5rem;
	}
	@media (min-width: 48rem) {
		.promo {
			grid-template-columns: 1fr 1fr;
			align-items: center;
		}
		.promo img {
			height: 100%;
			min-height: 22rem;
		}
	}
</style>
