<script lang="ts">
	import { untrack } from 'svelte';
	import type { AdminUser } from '#lib/studio/contracts.ts';
	import { mutate, protectChanges } from '#lib/studio/client.ts';
	import Notice from './Notice.svelte';
	let { user }: { user: AdminUser } = $props();
	let model = $state({ name: untrack(() => user.name), currentPassword: '', newPassword: '' }),
		busy = $state(false),
		message = $state(''),
		isError = $state(false);
	const unload = protectChanges(
		() => !!model.currentPassword || !!model.newPassword || model.name !== user.name
	);
</script>

<svelte:window onbeforeunload={unload} /><Notice {message} error={isError} />
<section class="s-panel" style="max-width:650px">
	<div class="s-panel-header">
		<div>
			<h2>Profile & security</h2>
			<p>{user.email} · {user.role}</p>
		</div>
	</div>
	<form
		class="s-panel-body s-fields"
		onsubmit={async (e) => {
			e.preventDefault();
			busy = true;
			try {
				await mutate('profile', 'PUT', model);
				model.currentPassword = '';
				model.newPassword = '';
				message = 'Profil dan password diperbarui. Session lain telah dicabut.';
				isError = false;
			} catch (err) {
				message = err instanceof Error ? err.message : 'Gagal menyimpan.';
				isError = true;
			} finally {
				busy = false;
			}
		}}
	>
		<label>Nama<input bind:value={model.name} required maxlength="100" /></label><label
			>Password saat ini<input
				type="password"
				bind:value={model.currentPassword}
				autocomplete="current-password"
				required
				maxlength="256"
			/></label
		><label
			>Password baru<input
				type="password"
				bind:value={model.newPassword}
				autocomplete="new-password"
				required
				minlength="12"
				maxlength="256"
			/><small>Minimal 12 karakter. Gunakan password unik dari password manager.</small></label
		><button type="submit" class="s-button primary" disabled={busy}
			>{busy ? 'Menyimpan…' : 'Update profile & password'}</button
		>
	</form>
</section>
