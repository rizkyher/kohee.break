<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Save, ArrowUpRight, ChevronUp, ChevronDown } from '@lucide/svelte';
	import type { ProductRecord, MediaAsset } from '#lib/studio/contracts.ts';
	import { productSchema } from '#lib/studio/contracts.ts';
	import { mutate, protectChanges } from '#lib/studio/client.ts';
	import { formatRupiah } from '#lib/order.ts';
	import Notice from './Notice.svelte';
	import MediaPicker from './MediaPicker.svelte';
	import Confirm from './Confirm.svelte';
	let {
		product,
		categories,
		assets
	}: {
		product: ProductRecord | null;
		categories: { id: string; name: string }[];
		assets: MediaAsset[];
	} = $props();
	const initial = () =>
		product
			? productSchema.parse(product)
			: {
					name: '',
					slug: '',
					category_id: categories[0]?.id ?? null,
					short_description: '',
					description: '',
					price: 0,
					comparison_price: null,
					size: '250ml',
					available: true,
					stock: null,
					featured: false,
					display_order: 0,
					status: 'draft' as const,
					seo_title: '',
					seo_description: '',
					image_ids: [] as string[]
				};
	let model = $state(initial()),
		baseline = $state(JSON.stringify(initial())),
		busy = $state(false),
		message = $state(''),
		isError = $state(false),
		preview = $state(false);
	const dirty = $derived(JSON.stringify(model) !== baseline);
	const unload = protectChanges(() => dirty);
	function addImage(id: string) {
		if (id && !model.image_ids.includes(id) && model.image_ids.length < 10)
			model.image_ids = [...model.image_ids, id];
	}
	function move(index: number, delta: number) {
		const ids = [...model.image_ids];
		[ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
		model.image_ids = ids;
	}
	async function save() {
		busy = true;
		message = '';
		try {
			const parsed = productSchema.safeParse(model);
			if (!parsed.success)
				throw new Error(
					parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
				);
			const result = await mutate(
				`products${product ? `/${product.id}` : ''}`,
				product ? 'PUT' : 'POST',
				parsed.data
			);
			baseline = JSON.stringify(model);
			message = 'Produk berhasil disimpan.';
			isError = false;
			if (!product)
				await goto(
					resolve('/admin/(studio)/[...path]', {
						path: `/admin/products/${result.id}`.replace(/^\/admin\/?/, '')
					})
				);
		} catch (e) {
			isError = true;
			message = e instanceof Error ? e.message : 'Gagal menyimpan.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:window onbeforeunload={unload} />
<Notice {message} error={isError} />
<form
	onsubmit={(e) => {
		e.preventDefault();
		save();
	}}
>
	<div class="s-two">
		<div class="s-stack">
			<section class="s-panel">
				<div class="s-panel-header">
					<div>
						<h2>Product details</h2>
						<p>Informasi yang dilihat pelanggan di menu.</p>
					</div>
				</div>
				<div class="s-panel-body s-fields two">
					<label>Nama produk<input bind:value={model.name} required maxlength="120" /></label><label
						>Slug<input
							bind:value={model.slug}
							required
							pattern="[a-z0-9]+(-[a-z0-9]+)*"
							maxlength="100"
						/><small>Unik, huruf kecil dengan tanda hubung.</small></label
					>
					<label class="s-field-wide"
						>Short description<input
							bind:value={model.short_description}
							maxlength="200"
							placeholder="Contoh: Brown sugar latte"
						/></label
					><label class="s-field-wide"
						>Full description<textarea bind:value={model.description} maxlength="4000" rows="5"
						></textarea></label
					>
					<label
						>Harga jual (IDR)<input
							type="number"
							bind:value={model.price}
							min="0"
							max="100000000"
							step="1"
							required
						/></label
					><label
						>Harga pembanding (opsional)<input
							type="number"
							value={model.comparison_price ?? ''}
							oninput={(e) =>
								(model.comparison_price =
									e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
							min="0"
							max="100000000"
							step="1"
						/></label
					>
					<label
						>Kategori<select bind:value={model.category_id}
							><option value={null}>Tanpa kategori</option
							>{#each categories as category (category.id)}<option value={category.id}
									>{category.name}</option
								>{/each}</select
						></label
					><label>Ukuran / volume<input bind:value={model.size} required maxlength="60" /></label>
				</div>
			</section>
			<section class="s-panel">
				<div class="s-panel-header">
					<div>
						<h2>Images & gallery</h2>
						<p>Gambar pertama digunakan pada kartu produk. Maksimal 10 gambar.</p>
					</div>
				</div>
				<div class="s-panel-body s-stack">
					<div class="s-gallery">
						{#each model.image_ids as id, i (id)}{@const asset = assets.find(
								(a) => a.id === id
							)}{#if asset}<div>
									<img src={asset.url} alt={asset.alt || asset.name} />
									<div class="s-actions">
										{#if i > 0}<button
												type="button"
												aria-label="Pindahkan gambar ke depan"
												onclick={() => move(i, -1)}><ChevronUp size={14} /></button
											>{/if}{#if i < model.image_ids.length - 1}<button
												type="button"
												aria-label="Pindahkan gambar ke belakang"
												onclick={() => move(i, 1)}><ChevronDown size={14} /></button
											>{/if}
									</div>
									<button
										type="button"
										onclick={() => (model.image_ids = model.image_ids.filter((v) => v !== id))}
										>Lepas</button
									>
								</div>{/if}{/each}
					</div>
					<MediaPicker {assets} onselect={addImage} label="Tambah gambar" /><a
						href={resolve('/admin/(studio)/[...path]', {
							path: '/admin/media'.replace(/^\/admin\/?/, '')
						})}
						class="s-link">Upload gambar baru di Media Library</a
					>
				</div>
			</section>
			<section class="s-panel">
				<div class="s-panel-header"><h2>Search engine preview</h2></div>
				<div class="s-panel-body s-fields">
					<label>SEO title<input bind:value={model.seo_title} maxlength="160" /></label><label
						>SEO description<textarea bind:value={model.seo_description} maxlength="320" rows="3"
						></textarea></label
					>
				</div>
			</section>
		</div>
		<aside class="s-stack" style="align-self:start">
			<section class="s-panel">
				<div class="s-panel-header">
					<h2>Publication</h2>
					<span class="s-badge" class:published={model.status === 'published'}>{model.status}</span>
				</div>
				<div class="s-panel-body s-fields">
					<label
						>Status<select bind:value={model.status}
							><option value="draft">Draft</option><option value="published">Published</option
							><option value="archived">Archived</option></select
						></label
					><label
						>Display order<input
							type="number"
							bind:value={model.display_order}
							min="0"
							max="10000"
							required
						/></label
					><label class="s-check"
						><input type="checkbox" bind:checked={model.featured} />Featured product</label
					><label class="s-check"
						><input type="checkbox" bind:checked={model.available} />Tersedia untuk dipesan</label
					><label
						>Stok (opsional)<input
							type="number"
							min="0"
							max="1000000"
							value={model.stock ?? ''}
							oninput={(e) =>
								(model.stock = e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
						/><small
							>Kosong = tanpa hitung stok. Checkout memeriksa batas ini; konfirmasi stok tetap
							dilakukan via chat.</small
						></label
					><button type="submit" class="s-button primary" disabled={busy}
						><Save size={16} />{busy ? 'Menyimpan…' : 'Simpan produk'}</button
					><button type="button" class="s-button" onclick={() => (preview = !preview)}
						><ArrowUpRight size={16} />{preview ? 'Tutup preview' : 'Preview produk'}</button
					><small class="s-muted"
						>{dirty ? 'Ada perubahan belum disimpan.' : 'Semua perubahan tersimpan.'}</small
					>
				</div>
			</section>
			{#if preview}<section class="s-panel s-preview">
					<p class="s-eyebrow">PRODUCT PREVIEW</p>
					{#if model.image_ids[0]}{@const img = assets.find(
							(a) => a.id === model.image_ids[0]
						)}{#if img}<img src={img.url} alt={img.alt || model.name} />{/if}{/if}
					<h2>{model.name || 'Nama produk'}</h2>
					<p>{model.short_description}</p>
					<p>{model.description}</p>
					<p><strong>{formatRupiah(model.price || 0)}</strong> · {model.size}</p>
				</section>{/if}
			{#if product}<section class="s-panel">
					<div class="s-panel-body s-fields">
						<button
							type="button"
							class="s-button"
							disabled={busy}
							onclick={async () => {
								busy = true;
								try {
									const copy = await mutate(`products/${product.id}`, 'POST', {});
									await goto(
										resolve('/admin/(studio)/[...path]', {
											path: `/admin/products/${copy.id}`.replace(/^\/admin\/?/, '')
										})
									);
								} catch (e) {
									message = e instanceof Error ? e.message : 'Gagal menduplikasi.';
									isError = true;
								} finally {
									busy = false;
								}
							}}>Duplicate as draft</button
						><Confirm
							label="Arsipkan"
							description="Produk akan disembunyikan dari storefront. Catatan pesanan lama tetap tersimpan."
							onconfirm={async () => {
								await mutate(`products/${product.id}`, 'DELETE');
								baseline = JSON.stringify(model);
								await goto(
									resolve('/admin/(studio)/[...path]', {
										path: '/admin/products'.replace(/^\/admin\/?/, '')
									})
								);
							}}
						/>
					</div>
				</section>{/if}
		</aside>
	</div>
</form>
