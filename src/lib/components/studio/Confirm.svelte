<script lang="ts">
	let {
		label = 'Hapus',
		description,
		onconfirm
	}: { label?: string; description: string; onconfirm: () => Promise<void> } = $props();
	let dialog: HTMLDialogElement;
	let busy = $state(false),
		message = $state('');
	async function proceed() {
		busy = true;
		message = '';
		try {
			await onconfirm();
			dialog.close();
		} catch (e) {
			message = e instanceof Error ? e.message : 'Operasi gagal.';
		} finally {
			busy = false;
		}
	}
</script>

<button type="button" class="s-button danger" onclick={() => dialog.showModal()}>{label}</button>
<dialog bind:this={dialog} class="studio-confirm" aria-label="Konfirmasi tindakan">
	<h2>Konfirmasi {label.toLowerCase()}</h2>
	<p>{description}</p>
	{#if message}<p role="alert" class="s-error">{message}</p>{/if}
	<div class="s-actions">
		<button type="button" class="s-button" disabled={busy} onclick={() => dialog.close()}
			>Batal</button
		><button type="button" class="s-button primary" disabled={busy} onclick={proceed}
			>{busy ? 'Memproses…' : label}</button
		>
	</div>
</dialog>
