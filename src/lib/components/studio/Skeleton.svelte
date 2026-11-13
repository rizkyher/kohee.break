<div class="s-loading" role="status" aria-label="Memuat data Studio">
	<div class="s-skeleton skeleton-title"></div>
	<div class="s-grid">
		{#each [0, 1, 2, 3] as id (id)}<div class="s-panel s-skeleton skeleton-card"></div>{/each}
	</div>
	<div class="s-panel s-skeleton skeleton-table"></div>
	<span class="sr-only">Memuat data Studio…</span>
</div>

<style>
	.s-loading {
		display: grid;
		gap: 24px;
	}
	.s-skeleton {
		background: var(--s-wash);
		animation: loading 1.2s ease-in-out infinite;
	}
	.skeleton-title {
		height: 32px;
		width: min(60%, 350px);
		border-radius: 4px;
	}
	.skeleton-card {
		height: 155px;
	}
	.skeleton-table {
		height: 280px;
	}
	@keyframes loading {
		50% {
			opacity: 0.5;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.s-skeleton {
			animation: none;
		}
	}
</style>
