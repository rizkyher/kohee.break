<script lang="ts">
	import { untrack } from 'svelte';
	import { Save, Send, Plus } from '@lucide/svelte';
	import type { Sections, SectionKey, MediaAsset } from '#lib/studio/contracts.ts';
	import { defaultSections } from '#lib/studio/defaults.ts';
	import { mutate, protectChanges } from '#lib/studio/client.ts';
	import Notice from './Notice.svelte';
	import Confirm from './Confirm.svelte';
	import MediaPicker from './MediaPicker.svelte';
	let {
		section,
		assets,
		products
	}: {
		section: { id: SectionKey; draft: unknown; published: unknown; display_order: number };
		assets: MediaAsset[];
		products: { id: string; name: string }[];
	} = $props();
	const initial = () =>
		({
			...structuredClone(defaultSections),
			[section.id]: structuredClone(section.draft)
		}) as Sections;
	let content = $state(initial()),
		displayOrder = $state(untrack(() => section.display_order)),
		baseline = $state(JSON.stringify([initial(), untrack(() => section.display_order)])),
		busy = $state(false),
		message = $state(''),
		isError = $state(false);
	const dirty = $derived(JSON.stringify([content, displayOrder]) !== baseline);
	const unload = protectChanges(() => dirty);
	const current = $derived(content[section.id]);
	const selectedImage = $derived(
		'imageId' in current ? assets.find((a) => a.id === current.imageId) : undefined
	);
	async function save(action: 'save' | 'publish' | 'unpublish') {
		busy = true;
		message = '';
		try {
			await mutate(`content/${section.id}`, 'PUT', {
				data: content[section.id],
				action,
				displayOrder
			});
			baseline = JSON.stringify([content, displayOrder]);
			message =
				action === 'publish'
					? 'Konten diterbitkan. Storefront langsung membaca versi baru.'
					: action === 'unpublish'
						? 'Section disembunyikan dari storefront.'
						: 'Draft tersimpan. Versi publik belum berubah.';
			isError = false;
		} catch (e) {
			isError = true;
			message = e instanceof Error ? e.message : 'Gagal menyimpan.';
			throw e;
		} finally {
			busy = false;
		}
	}
	const clickSave = (action: 'save' | 'publish') => {
		void save(action).catch(() => {});
	};
</script>

<svelte:window onbeforeunload={unload} /><Notice {message} error={isError} />
<div class="s-two">
	<section class="s-panel">
		<div class="s-panel-header">
			<div>
				<h2>Section content</h2>
				<p>Perubahan disimpan sebagai draft sampai kamu memilih Publish.</p>
			</div>
			<span class="s-badge" class:published={!!section.published}
				>{section.published ? 'Published' : 'Unpublished'}</span
			>
		</div>
		<form
			class="s-panel-body s-fields"
			onsubmit={(e) => {
				e.preventDefault();
				clickSave('save');
			}}
		>
			{#if section.id === 'hero'}
				<label
					>Headline<textarea bind:value={content.hero.headline} maxlength="160" required rows="2"
					></textarea><small>Baris baru mempertahankan komposisi headline poster.</small></label
				><label
					>Subheadline<textarea bind:value={content.hero.subheadline} maxlength="600" rows="3"
					></textarea></label
				>
				<div class="s-fields two">
					<label
						>CTA label<input bind:value={content.hero.ctaLabel} maxlength="60" required /></label
					><label
						>CTA destination<input
							bind:value={content.hero.ctaUrl}
							placeholder="#menu atau https://…"
						/></label
					>
				</div>
				<label
					>Featured product<select bind:value={content.hero.featuredProduct}
						><option value="">Otomatis</option>{#each products as p (p.id)}<option value={p.id}
								>{p.name}</option
							>{/each}</select
					></label
				><MediaPicker
					{assets}
					value={content.hero.imageId}
					onselect={(id) => (content.hero.imageId = id)}
					label="Hero image override"
				/>
			{:else if section.id === 'marquee'}
				<label
					>Text items<textarea
						value={content.marquee.items.join('\n')}
						oninput={(e) => (content.marquee.items = e.currentTarget.value.split('\n'))}
						rows="7"></textarea><small
						>Satu item per baris; urutan mengikuti daftar ini. Maksimal 20 item.</small
					></label
				>
			{:else if section.id === 'signature'}
				<label
					>Selected featured product<select bind:value={content.signature.productId}
						><option value="">Otomatis</option>{#each products as p (p.id)}<option value={p.id}
								>{p.name}</option
							>{/each}</select
					></label
				><label
					>Supporting headline<input
						bind:value={content.signature.heading}
						maxlength="120"
					/></label
				><MediaPicker
					{assets}
					value={content.signature.imageId}
					onselect={(id) => (content.signature.imageId = id)}
					label="Background artwork"
				/>
			{:else if section.id === 'story'}
				<label
					>Heading<textarea bind:value={content.story.heading} maxlength="240" required rows="3"
					></textarea></label
				><label
					>Description<textarea bind:value={content.story.description} maxlength="4000" rows="8"
					></textarea></label
				><MediaPicker
					{assets}
					value={content.story.imageId}
					onselect={(id) => (content.story.imageId = id)}
					label="Story image"
				/>
			{:else if section.id === 'banners'}
				{#each content.banners.items as banner, i (banner.id)}<fieldset
						class="s-panel s-panel-body s-fields"
					>
						<legend>Banner {i + 1}</legend><label
							>Title<input bind:value={banner.title} maxlength="160" /></label
						><MediaPicker
							{assets}
							value={banner.imageId}
							onselect={(id) => (banner.imageId = id)}
						/>
						<div class="s-fields two">
							<label>CTA label<input bind:value={banner.ctaLabel} maxlength="60" /></label><label
								>CTA destination<input bind:value={banner.ctaUrl} /></label
							>
						</div>
						<label class="s-check"
							><input type="checkbox" bind:checked={banner.active} />Active</label
						><label
							>Display order<input
								type="number"
								bind:value={banner.displayOrder}
								min="0"
								max="10000"
							/></label
						><Confirm
							label="Lepas banner"
							description="Banner dihapus dari draft. Publish untuk menerapkan penghapusan ke website."
							onconfirm={async () => {
								content.banners.items = content.banners.items.filter((b) => b.id !== banner.id);
							}}
						/>
					</fieldset>{/each}<button
					type="button"
					class="s-button"
					disabled={content.banners.items.length >= 20}
					onclick={() =>
						(content.banners.items = [
							...content.banners.items,
							{
								id: crypto.randomUUID(),
								title: '',
								imageId: '',
								ctaLabel: '',
								ctaUrl: '#menu',
								active: true,
								displayOrder: content.banners.items.length
							}
						])}><Plus size={16} />Tambah banner</button
				>
			{:else if section.id === 'footer'}
				<label
					>Brand description<textarea
						bind:value={content.footer.description}
						maxlength="600"
						rows="4"></textarea></label
				><label
					>Contact information<textarea bind:value={content.footer.contact} maxlength="500" rows="3"
					></textarea></label
				><label
					>Instagram URL<input
						bind:value={content.footer.instagram}
						placeholder="https://www.instagram.com/…"
					/></label
				>
				{#each content.footer.socialLinks as link, i (i)}<div class="s-fields two">
						<label>Social label<input bind:value={link.label} maxlength="40" /></label><label
							>Social URL<input bind:value={link.url} /></label
						><button
							class="s-button"
							type="button"
							onclick={() =>
								(content.footer.socialLinks = content.footer.socialLinks.filter((_, n) => n !== i))}
							>Lepas tautan</button
						>
					</div>{/each}<button
					type="button"
					class="s-button"
					disabled={content.footer.socialLinks.length >= 8}
					onclick={() =>
						(content.footer.socialLinks = [...content.footer.socialLinks, { label: '', url: '' }])}
					><Plus size={16} />Tambah social link</button
				>
			{/if}
			<label class="s-check"
				><input type="checkbox" bind:checked={content[section.id].visible} />Section terlihat di
				website saat published</label
			><label
				>Section order<input
					type="number"
					bind:value={displayOrder}
					min="0"
					max="20"
					required
				/><small
					>Section ditampilkan sesuai urutan ini; header dan footer tetap pada tempatnya.</small
				></label
			>
			<div class="s-form-foot">
				<span class="s-muted">{dirty ? 'Perubahan belum disimpan.' : 'Draft tersimpan.'}</span>
				<div class="s-actions">
					<button type="submit" class="s-button" disabled={busy}
						><Save size={16} />Save draft</button
					><button
						type="button"
						class="s-button primary"
						disabled={busy}
						onclick={() => clickSave('publish')}
						><Send size={16} />{busy ? 'Menyimpan…' : 'Publish'}</button
					>
				</div>
			</div>
		</form>
	</section>
	<aside class="s-stack" style="align-self:start">
		<section class="s-panel">
			<div class="s-panel-header">
				<h2>Live content preview</h2>
				<span class="s-badge">Draft</span>
			</div>
			<div class="s-preview">
				<p class="s-eyebrow">{section.id} / CONTENT PREVIEW</p>
				{#if !current.visible}<p>Section ini disembunyikan.</p>{:else}{#if selectedImage}<img
							src={selectedImage.url}
							alt={selectedImage.alt || selectedImage.name}
						/>{/if}{#if section.id === 'hero'}<h2>{content.hero.headline}</h2>
						<p>{content.hero.subheadline}</p>
						<p>
							<span class="s-button primary">{content.hero.ctaLabel}</span>
						</p>{:else if section.id === 'story'}<h2>{content.story.heading}</h2>
						<p>{content.story.description}</p>{:else if section.id === 'marquee'}<h2>
							{content.marquee.items.join(' · ')}
						</h2>{:else if section.id === 'signature'}<h2>
							{products.find((p) => p.id === content.signature.productId)?.name ??
								'Featured product'}
						</h2>
						<p>{content.signature.heading}</p>{:else if section.id === 'footer'}<h2>Kohee Break</h2>
						<p>{content.footer.description}</p>
						<p>
							{content.footer.contact}
						</p>{:else if section.id === 'banners'}{#each [...content.banners.items]
							.filter((b) => b.active)
							.sort((a, b) => a.displayOrder - b.displayOrder) as b (b.id)}<h2>{b.title}</h2>
							{@const image = assets.find((a) => a.id === b.imageId)}{#if image}<img
									src={image.url}
									alt={image.alt || b.title}
								/>{/if}
							<p>{b.ctaLabel}</p>{:else}<p>Belum ada banner aktif.</p>{/each}{/if}{/if}
			</div>
		</section>
		<p class="s-muted" style="font-size:.72rem">
			Preview menampilkan isi draft. Komposisi dan animasi lengkap dapat dilihat melalui View
			Website setelah Publish.
		</p>
		{#if section.published}<Confirm
				label="Unpublish"
				description="Sembunyikan section ini dari storefront? Draft tetap tersimpan."
				onconfirm={() => save('unpublish')}
			/>{/if}
	</aside>
</div>
