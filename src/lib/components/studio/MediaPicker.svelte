<script lang="ts">
	import { Image, Plus, Check, Search } from '@lucide/svelte';
	import type { MediaAsset } from '#lib/studio/contracts.ts';
	let {
		assets,
		value = '',
		onselect,
		label = 'Pilih gambar'
	}: {
		assets: MediaAsset[];
		value?: string;
		onselect: (id: string) => void;
		label?: string;
	} = $props();
	let dialog: HTMLDialogElement;
	let q = $state('');
	const filtered = $derived(assets.filter((a) => a.name.toLowerCase().includes(q.toLowerCase())));
	const selected = $derived(assets.find((a) => a.id === value));
</script>

<div class="s-stack" style="gap:12px">
	{#if selected}<img
			src={selected.url}
			alt={selected.alt || selected.name}
			class="s-image-preview"
		/>{/if}
	<div class="s-actions">
		<button type="button" class="s-button" onclick={() => dialog.showModal()}
			><Image size={16} />{label}</button
		>{#if value}<button class="s-button" type="button" onclick={() => onselect('')}
				>Lepas gambar</button
			>{/if}
	</div>
</div>
<dialog bind:this={dialog} class="studio-confirm media-picker" aria-label="Pilih media">
	<div class="s-panel-header">
		<h2>Media Library</h2>
		<button class="s-button" type="button" onclick={() => dialog.close()}>Tutup</button>
	</div>
	<div class="s-panel-body">
		<div class="s-toolbar">
			<Search size={17} /><input
				type="search"
				aria-label="Cari media"
				placeholder="Cari nama file…"
				bind:value={q}
			/>
		</div>
		{#if filtered.length === 0}<p class="s-empty">
				Belum ada gambar. Upload dahulu melalui Media Library.
			</p>{:else}<div class="picker-grid">
				{#each filtered as asset (asset.id)}<button
						type="button"
						class:selected={asset.id === value}
						onclick={() => {
							onselect(asset.id);
							dialog.close();
						}}
						><img src={asset.url} alt={asset.alt || asset.name} /><span>{asset.name}</span
						>{#if asset.id === value}<Check size={16} />{:else}<Plus size={16} />{/if}</button
					>{/each}
			</div>{/if}
	</div>
</dialog>

<style>
	.media-picker {
		max-width: 760px;
		padding: 0;
		max-height: 85dvh;
		overflow-y: auto;
	}
	.picker-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: 12px;
	}
	.picker-grid button {
		border: 1px solid var(--s-border);
		padding: 10px;
		cursor: pointer;
		text-align: left;
		position: relative;
	}
	.picker-grid button.selected {
		border-color: var(--color-red);
		background: var(--color-cream);
	}
	.picker-grid img {
		height: 120px;
		width: 100%;
		object-fit: contain;
	}
	.picker-grid span {
		font-size: 0.65rem;
		display: block;
		overflow-wrap: anywhere;
		margin: 8px 16px 0 0;
	}
	.picker-grid :global(svg) {
		position: absolute;
		right: 8px;
		bottom: 10px;
		color: var(--color-red);
	}
</style>
