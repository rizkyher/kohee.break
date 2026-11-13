<script lang="ts">
	import { untrack } from 'svelte';
	import type { Settings } from '#lib/studio/contracts.ts';
	import { mutate, protectChanges } from '#lib/studio/client.ts';
	import Notice from './Notice.svelte';
	import Confirm from './Confirm.svelte';
	let {
		config,
		users
	}: { config: Settings; users: { id: string; name: string; email: string; role: string }[] } =
		$props();
	let model = $state(structuredClone(untrack(() => config))),
		baseline = $state(JSON.stringify(untrack(() => config))),
		busy = $state(false),
		message = $state(''),
		isError = $state(false);
	let newUser = $state({ email: '', name: '', password: '', role: 'editor' });
	const dirty = $derived(JSON.stringify(model) !== baseline),
		unload = protectChanges(() => dirty);
	async function save() {
		busy = true;
		try {
			await mutate('settings', 'PUT', model);
			baseline = JSON.stringify(model);
			message = 'Pengaturan disimpan dan langsung berlaku.';
			isError = false;
		} catch (e) {
			message = e instanceof Error ? e.message : 'Gagal menyimpan.';
			isError = true;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:window onbeforeunload={unload} /><Notice {message} error={isError} />
<div class="s-two">
	<div class="s-stack">
		<form
			class="s-stack"
			onsubmit={(e) => {
				e.preventDefault();
				save();
			}}
		>
			<section class="s-panel">
				<div class="s-panel-header"><h2>Store information</h2></div>
				<div class="s-panel-body s-fields two">
					<label>Nama brand<input bind:value={model.storeName} required maxlength="120" /></label
					><label
						>Instagram URL<input
							bind:value={model.instagram}
							placeholder="https://www.instagram.com/…"
						/></label
					><label class="s-field-wide"
						>Contact details<textarea bind:value={model.contact} maxlength="500" rows="3"
						></textarea></label
					><label class="s-field-wide"
						>Store information<textarea bind:value={model.storeInfo} maxlength="1000" rows="3"
						></textarea></label
					><label class="s-field-wide"
						>Global announcement<input bind:value={model.announcement} maxlength="500" /></label
					><label class="s-check s-field-wide"
						><input type="checkbox" bind:checked={model.open} />Toko menerima pesanan</label
					>
				</div>
			</section>
			<section class="s-panel">
				<div class="s-panel-header"><h2>WhatsApp ordering</h2></div>
				<div class="s-panel-body s-fields">
					<label
						>Business number<input
							bind:value={model.whatsappNumber}
							placeholder="6281234567890"
							maxlength="30"
						/><small>Format internasional, tanpa +. Kosongkan untuk menonaktifkan checkout.</small
						></label
					><label
						>Message introduction<textarea
							bind:value={model.messageTemplate}
							maxlength="500"
							rows="3"
							required></textarea><small
							>Pembuka pesan. Item, harga, total, nama dan catatan ditambahkan otomatis oleh server.</small
						></label
					><label
						>Pickup / delivery options<textarea
							value={model.fulfillmentOptions.join('\n')}
							oninput={(e) =>
								(model.fulfillmentOptions = e.currentTarget.value
									.split('\n')
									.map((v) => v.trim())
									.filter(Boolean))}
							rows="3"></textarea><small
							>Satu opsi per baris. Kosongkan jika tidak perlu ditanyakan.</small
						></label
					>
				</div>
			</section>
			<section class="s-panel">
				<div class="s-panel-header"><h2>Search & sharing</h2></div>
				<div class="s-panel-body s-fields">
					<label>SEO title<input bind:value={model.seoTitle} required maxlength="160" /></label
					><label
						>SEO description<textarea bind:value={model.seoDescription} maxlength="320" rows="3"
						></textarea></label
					>
				</div>
			</section>
			<div class="s-form-foot">
				<span class="s-muted">{dirty ? 'Perubahan belum disimpan.' : 'Pengaturan tersimpan.'}</span
				><button type="submit" class="s-button primary" disabled={busy}
					>{busy ? 'Menyimpan…' : 'Simpan pengaturan'}</button
				>
			</div>
		</form>
	</div>
	<aside class="s-stack" style="align-self:start">
		<section class="s-panel">
			<div class="s-panel-header"><h2>Team access</h2></div>
			<div class="s-panel-body s-fields">
				{#each users as user (user.id)}<div>
						<strong>{user.name}</strong>
						<p class="s-muted" style="font-size:.72rem">{user.email}</p>
						<span class="s-badge">{user.role}</span>
					</div>{/each}
			</div>
		</section>
		<section class="s-panel">
			<div class="s-panel-header"><h2>Tambah anggota tim</h2></div>
			<form
				class="s-panel-body s-fields"
				onsubmit={async (e) => {
					e.preventDefault();
					busy = true;
					try {
						await mutate('users', 'POST', newUser);
						newUser = { email: '', name: '', password: '', role: 'editor' };
						message = 'Akun tim dibuat.';
						isError = false;
					} catch (err) {
						message = err instanceof Error ? err.message : 'Gagal membuat akun.';
						isError = true;
					} finally {
						busy = false;
					}
				}}
			>
				<label>Nama<input bind:value={newUser.name} required maxlength="100" /></label><label
					>Email<input
						type="email"
						autocomplete="username"
						bind:value={newUser.email}
						required
						maxlength="254"
					/></label
				><label
					>Password awal<input
						type="password"
						autocomplete="new-password"
						bind:value={newUser.password}
						required
						minlength="12"
						maxlength="256"
					/></label
				><label
					>Role<select bind:value={newUser.role}
						><option value="editor">Editor · products, content, media</option><option value="admin"
							>Admin · semua akses</option
						></select
					></label
				><button type="submit" class="s-button" disabled={busy}>Buat akun</button>
			</form>
		</section>
		<section class="s-panel">
			<div class="s-panel-header"><h2>Data retention</h2></div>
			<div class="s-panel-body s-fields">
				<p class="s-muted">
					Nama, catatan pelanggan, catatan internal, dan pesan WhatsApp dianonimkan setelah 90 hari.
					Jumlah dan snapshot produk disimpan untuk laporan. Event analytics dihapus setelah 90
					hari.
				</p>
				<Confirm
					label="Jalankan retensi"
					description="Anonimkan data pelanggan yang lebih lama dari 90 hari dan hapus event lama? Tindakan ini tidak dapat dibatalkan."
					onconfirm={async () => {
						await mutate('maintenance', 'POST', {});
						message = 'Retensi data selesai.';
						isError = false;
					}}
				/><small class="s-muted"
					>Jalankan setiap hari melalui CLI atau scheduler deployment. Panduan tersedia di
					docs/studio.md.</small
				>
			</div>
		</section>
	</aside>
</div>
