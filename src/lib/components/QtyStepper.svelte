<script lang="ts">
	import { Minus, Plus } from '@lucide/svelte';
	import { MAX_QTY } from '#lib/order.ts';

	let {
		value,
		label,
		min = 1,
		onchange
	}: { value: number; label: string; min?: number; onchange: (qty: number) => void } = $props();
</script>

<div class="stepper" role="group" aria-label={`Jumlah ${label}`}>
	<button
		type="button"
		aria-label={`Kurangi ${label}`}
		disabled={value <= min}
		onclick={() => onchange(value - 1)}
	>
		<Minus size={16} strokeWidth={2.5} aria-hidden="true" />
	</button>
	<output aria-live="polite">{value}</output>
	<button
		type="button"
		aria-label={`Tambah ${label}`}
		disabled={value >= MAX_QTY}
		onclick={() => onchange(value + 1)}
	>
		<Plus size={16} strokeWidth={2.5} aria-hidden="true" />
	</button>
</div>

<style>
	.stepper {
		display: inline-grid;
		grid-template-columns: 2.75rem 2.5rem 2.75rem;
		height: 2.75rem;
		border: 2px solid var(--color-ink);
		background: var(--color-ivory);
	}

	button {
		display: grid;
		place-items: center;
		cursor: pointer;
	}

	button:hover:not(:disabled) {
		background: var(--color-ink);
		color: var(--color-ivory);
	}

	button:disabled {
		cursor: not-allowed;
		color: var(--color-muted);
	}

	output {
		display: grid;
		place-items: center;
		font-family: var(--font-accent);
		font-weight: 700;
		border-inline: 2px solid var(--color-ink);
	}
</style>
