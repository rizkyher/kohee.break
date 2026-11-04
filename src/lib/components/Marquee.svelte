<script lang="ts">
	import { Pause, Play } from '@lucide/svelte';
	import Mascot from './Mascot.svelte';

	const words = ['Break Time', 'Kohee Time', 'Sweet', 'Smooth', 'Tasty'];
	let paused = $state(false);
</script>

<section class="marquee on-red" aria-label="Break Time, Kohee Time. Sweet, smooth, tasty.">
	<div class="band">
		<div class="track" class:paused>
			{#each [0, 1] as copy (copy)}
				<ul class="group" aria-hidden="true">
					{#each words as word (word)}
						<li class="display">{word}</li>
						<li class="icon"><Mascot class="h-full w-auto" /></li>
					{/each}
				</ul>
			{/each}
		</div>
	</div>
	<button
		type="button"
		class="toggle"
		aria-pressed={paused}
		aria-label={paused ? 'Jalankan teks berjalan' : 'Hentikan teks berjalan'}
		onclick={() => (paused = !paused)}
	>
		{#if paused}
			<Play size={16} strokeWidth={2.5} aria-hidden="true" />
		{:else}
			<Pause size={16} strokeWidth={2.5} aria-hidden="true" />
		{/if}
	</button>
</section>

<style>
	.marquee {
		position: relative;
		padding-block: 1.5rem 3.75rem;
		/* the rotated band is wider than the screen; clip here or mobile Chrome widens the viewport */
		overflow-x: clip;
	}

	.band {
		width: 112%;
		margin-left: -6%;
		rotate: -2.5deg;
		background: var(--color-red);
		color: var(--color-ivory);
		border-block: 2px solid var(--color-ink);
		overflow: hidden;
	}

	.track {
		display: flex;
		width: max-content;
		animation: marquee 38s linear infinite;
	}

	.track.paused {
		animation-play-state: paused;
	}

	.group {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 0.85rem 0.75rem;
	}

	.display {
		font-size: clamp(1.75rem, 5vw, 3.5rem);
		line-height: 1;
		white-space: nowrap;
	}

	.icon {
		height: clamp(1.75rem, 4.5vw, 3rem);
		color: var(--color-ivory);
	}

	.toggle {
		position: absolute;
		right: 0.75rem;
		bottom: 0;
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border: 2px solid var(--color-ink);
		background: var(--color-cream);
		color: var(--color-ink);
		cursor: pointer;
	}

	.toggle:hover {
		background: var(--color-ink);
		color: var(--color-ivory);
	}

	@media (prefers-reduced-motion: reduce) {
		.track {
			animation: none;
		}

		.toggle {
			display: none;
		}
	}
</style>
