<script lang="ts">
	import { Upload, Copy, Image, RefreshCw } from '@lucide/svelte';
	import type { MediaAsset } from '#lib/studio/contracts.ts';
	import { mutate } from '#lib/studio/client.ts';
	import Notice from './Notice.svelte';
	import Confirm from './Confirm.svelte';
	let { assets }: { assets: MediaAsset[] } = $props();
	let fileInput: HTMLInputElement,
		file = $state<File | null>(null),
		alt = $state(''),
		replace = $state<string | null>(null),
		busy = $state(false),
		message = $state(''),
		isError = $state(false),
		localPreview = $state('');
	$effect(() => {
		if (file) {
			const url = URL.createObjectURL(file);
			localPreview = url;
			return () => URL.revokeObjectURL(url);
		}
		localPreview = '';
	});
	async function upload() {
		if (!file) return;
		busy = true;
		try {
			const data = new FormData();
			data.set('file', file);
			data.set('alt', alt);
			await mutate(`media${replace ? `/${replace}` : ''}`, 'POST', data);
			message = replace
				? 'Media diganti. Semua referensi menggunakan gambar baru.'
				: 'Gambar berhasil diupload.';
			isError = false;
			file = null;
			alt = '';
			replace = null;
			fileInput.value = '';
		} catch (e) {
			message = e instanceof Error ? e.message : 'Upload gagal.';
			isError = true;
		} finally {
			busy = false;
		}
	}
</script>

<Notice {message} error={isError} />
<section class="s-panel" style="margin-bottom:24px">
	<div class="s-panel-header">
		<div>
			<h2>{replace ? 'Replace media' : 'Upload images'}</h2>
			<p>JPG, PNG, atau WebP · maksimal 5 MB · SVG tidak diterima.</p>
		</div>
		<Upload size={20} />
	</div>
	<form
		class="s-panel-body s-fields two"
		onsubmit={(e) => {
			e.preventDefault();
			upload();
		}}
	>
		<label
			>File gambar<input
				bind:this={fileInput}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				required
				onchange={(e) => (file = e.currentTarget.files?.[0] ?? null)}
			/></label
		><label
			>Alternative text<input
				bind:value={alt}
				maxlength="250"
				placeholder="Deskripsi singkat gambar"
			/></label
		>{#if localPreview}<img
				src={localPreview}
				alt="Preview sebelum upload"
				class="s-image-preview"
			/>{/if}
		<div class="s-actions">
			<button class="s-button primary" type="submit" disabled={!file || busy}
				><Upload size={16} />{busy ? 'Mengupload…' : replace ? 'Ganti gambar' : 'Upload'}</button
			>{#if replace}<button type="button" class="s-button" onclick={() => (replace = null)}
					>Batal replace</button
				>{/if}
		</div>
	</form>
</section>
{#if assets.length === 0}<div class="s-panel s-empty">
		<Image size={32} />
		<h2>Belum ada media</h2>
		<p>Upload foto produk atau artwork pertamamu.</p>
	</div>{:else}<div class="s-media-grid">
		{#each assets as asset (asset.id)}<article class="s-panel s-media-card">
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- server-generated immutable same-origin media URL -->
				<a href={asset.url} target="_blank" rel="noopener" aria-label={`Preview ${asset.name}`}
					><img src={asset.url} alt={asset.alt || asset.name} loading="lazy" /></a
				>
				<p>{asset.name}</p>
				<small
					>{asset.mime.replace('image/', '').toUpperCase()} · {(asset.size / 1024).toFixed(1)} KB</small
				>
				<div class="s-actions">
					<button
						type="button"
						class="s-button"
						aria-label={`Salin URL ${asset.name}`}
						title="Copy URL"
						onclick={async () => {
							try {
								await navigator.clipboard.writeText(new URL(asset.url, location.origin).href);
								message = 'URL gambar disalin.';
								isError = false;
							} catch {
								message = 'Browser tidak mengizinkan clipboard. Buka preview lalu salin URL.';
								isError = true;
							}
						}}><Copy size={15} /></button
					><button
						type="button"
						class="s-button"
						title="Replace"
						aria-label={`Ganti ${asset.name}`}
						onclick={() => {
							replace = asset.id;
							alt = asset.alt;
							fileInput.focus();
							fileInput.scrollIntoView({ block: 'center' });
						}}><RefreshCw size={15} /></button
					><Confirm
						description="Hapus gambar ini? Media yang masih digunakan produk atau konten tidak dapat dihapus."
						onconfirm={async () => {
							await mutate(`media/${asset.id}`, 'DELETE');
							message = 'Media dihapus.';
							isError = false;
						}}
					/>
				</div>
			</article>{/each}
	</div>
	<p class="s-muted" style="font-size:.72rem;margin-top:16px">
		Menampilkan maksimal 200 gambar terbaru. Gunakan pencarian untuk menemukan file lain.
	</p>{/if}
