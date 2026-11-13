<script lang="ts">
	import { Plus, Save } from '@lucide/svelte';
	import Notice from './Notice.svelte';
	import Confirm from './Confirm.svelte';
	import { mutate, protectChanges } from '#lib/studio/client.ts';
	let {
		categories
	}: {
		categories: {
			id: string;
			name: string;
			slug: string;
			display_order: number;
			products: number;
		}[];
	} = $props();
	let editing = $state<string | null>(null),
		name = $state(''),
		slug = $state(''),
		order = $state(0),
		busy = $state(false),
		message = $state(''),
		isError = $state(false);
	let baseline = $state(JSON.stringify(['', '', 0]));
	const unload = protectChanges(() => JSON.stringify([name, slug, order]) !== baseline);
	async function save() {
		busy = true;
		try {
			await mutate(`categories${editing ? `/${editing}` : ''}`, editing ? 'PUT' : 'POST', {
				name,
				slug,
				display_order: order
			});
			message = 'Kategori disimpan.';
			isError = false;
			editing = null;
			name = '';
			slug = '';
			order = 0;
			baseline = JSON.stringify(['', '', 0]);
		} catch (e) {
			message = e instanceof Error ? e.message : 'Gagal menyimpan.';
			isError = true;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:window onbeforeunload={unload} />
<Notice {message} error={isError} />
<div class="s-two">
	<section class="s-panel">
		<div class="s-table-wrap">
			<table class="s-table">
				<thead><tr><th>Kategori</th><th>Produk</th><th>Urutan</th><th>Aksi</th></tr></thead><tbody
					>{#each categories as category (category.id)}<tr
							><td
								><strong>{category.name}</strong><small class="s-muted" style="display:block"
									>{category.slug}</small
								></td
							><td>{category.products}</td><td>{category.display_order}</td><td
								><div class="s-actions">
									<button
										type="button"
										class="s-button"
										onclick={() => {
											editing = category.id;
											name = category.name;
											slug = category.slug;
											order = category.display_order;
											baseline = JSON.stringify([name, slug, order]);
										}}>Edit</button
									><Confirm
										description="Hapus kategori ini? Kategori yang masih digunakan produk tidak dapat dihapus."
										onconfirm={async () => {
											await mutate(`categories/${category.id}`, 'DELETE');
										}}
									/>
								</div></td
							></tr
						>{:else}<tr><td colspan="4" class="s-empty">Belum ada kategori.</td></tr>{/each}</tbody
				>
			</table>
		</div>
	</section>
	<section class="s-panel" style="align-self:start">
		<div class="s-panel-header">
			<h2>{editing ? 'Edit kategori' : 'Kategori baru'}</h2>
			<Plus size={18} />
		</div>
		<form
			class="s-panel-body s-fields"
			onsubmit={(e) => {
				e.preventDefault();
				save();
			}}
		>
			<label>Nama<input bind:value={name} required maxlength="80" /></label><label
				>Slug<input
					bind:value={slug}
					required
					pattern="[a-z0-9]+(-[a-z0-9]+)*"
					maxlength="100"
				/></label
			><label>Urutan<input type="number" bind:value={order} min="0" max="10000" required /></label>
			<div class="s-actions">
				<button type="submit" class="s-button primary" disabled={busy}
					><Save size={16} />{busy ? 'Menyimpan…' : 'Simpan kategori'}</button
				>{#if editing}<button
						type="button"
						class="s-button"
						onclick={() => {
							editing = null;
							name = '';
							slug = '';
							order = 0;
							baseline = JSON.stringify(['', '', 0]);
						}}>Batal</button
					>{/if}
			</div>
		</form>
	</section>
</div>
