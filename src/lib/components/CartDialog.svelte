<script lang="ts">
	import { MessageCircle, Plus, Trash, X } from '@lucide/svelte';
	import DeliveryAddress from './DeliveryAddress.svelte';
	import type { Destination, ShippingQuote } from '#lib/studio/shipping.ts';
	let delivery = $state<{
		required: boolean;
		destination: Destination | null;
		quote: ShippingQuote | null;
	}>({ required: true, destination: null, quote: null });
	import Mascot from './Mascot.svelte';
	import QtyStepper from './QtyStepper.svelte';
	import { cart, ui } from '#lib/cart.svelte.ts';
	import { formatRupiah, orderProblems } from '#lib/order.ts';
	import { useStorefront } from '#lib/storefront.ts';
	const store = useStorefront();
	const products = $derived(store().products);
	const settings = $derived(store().settings);
	let busy = $state(false),
		checkoutError = $state(''),
		checkoutKey = $state(crypto.randomUUID());
	let previousPayload = '';

	let dialog: HTMLDialogElement;
	let nameInput = $state<HTMLInputElement>();
	let name = $state('');
	let note = $state('');
	let fulfillment = $state('');
	let triedSubmit = $state(false);
	let sent = $state(false);

	const fulfillmentOptions = $derived(settings.fulfillmentOptions);
	const problems = $derived(
		orderProblems({ lines: cart.priced, name, whatsappNumber: settings.whatsappNumber })
	);
	const needsFulfillment = $derived(fulfillmentOptions.length > 0 && !fulfillment);
	const nameError = $derived(triedSubmit && problems.includes('missing-name'));

	$effect(() => {
		if (ui.cartOpen && !dialog.open) dialog.showModal();
		if (!ui.cartOpen && dialog.open) dialog.close();
	});

	// A changed cart means a new order; drop the "WhatsApp opened" notice.
	$effect(() => {
		void cart.lines;
		sent = false;
	});

	async function checkout(event: MouseEvent) {
		event.preventDefault();
		triedSubmit = true;
		checkoutError = '';
		if (problems.length || needsFulfillment || (delivery.required && !delivery.quote)) {
			if (problems.includes('missing-name')) nameInput?.focus();
			return;
		}
		if (!settings.open || busy) return;
		const payload = {
			name: name.trim(),
			note: note.trim(),
			fulfillment,
			items: cart.lines,
			delivery: delivery.destination ?? undefined,
			quoteId: delivery.quote?.id
		};
		const serialized = JSON.stringify(payload);
		if (previousPayload && serialized !== previousPayload) checkoutKey = crypto.randomUUID();
		previousPayload = serialized;
		busy = true;
		try {
			const response = await fetch('/api/checkout', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ...payload, key: checkoutKey })
			});
			const result = (await response.json()) as { message?: string; url: string };
			if (!response.ok) throw new Error(result.message ?? 'Checkout gagal dicatat.');
			sent = true;
			window.location.assign(result.url);
		} catch (e) {
			checkoutError =
				e instanceof Error
					? e.message
					: 'Koneksi bermasalah. Coba lagi; checkout yang sama tidak dicatat dua kali.';
		} finally {
			busy = false;
		}
	}
</script>

<dialog
	bind:this={dialog}
	class="sheet drawer"
	aria-labelledby="cart-title"
	onclose={() => (ui.cartOpen = false)}
	onclick={(e) => e.target === dialog && dialog.close()}
>
	<div class="top">
		<h2 id="cart-title" class="display text-4xl">
			Keranjang <span class="text-red">{cart.count > 0 ? `(${cart.count})` : ''}</span>
		</h2>
		<button type="button" class="icon" onclick={() => dialog.close()} aria-label="Tutup keranjang">
			<X size={22} strokeWidth={2.5} aria-hidden="true" />
		</button>
	</div>

	<div class="scroll">
		{#if !cart.persistent}
			<p class="notice">
				Browser ini tidak mengizinkan penyimpanan, jadi keranjang akan hilang kalau halaman ditutup.
			</p>
		{/if}

		{#if cart.priced.length === 0}
			<div class="empty">
				<Mascot class="h-24 w-auto text-mascot" />
				<p class="accent mt-4 text-xl">Keranjangmu masih kosong.</p>
				<p class="mt-1 text-muted">Pilih botol favoritmu langsung dari sini.</p>
			</div>
			<ul class="quick">
				{#each products as product (product.id)}
					<li>
						<div>
							<p class="accent">{product.name}</p>
							<p class="text-sm text-muted">{product.kind} · {formatRupiah(product.price)}</p>
						</div>
						<button
							type="button"
							class="btn btn-red btn-sm"
							disabled={!product.available}
							onclick={() => cart.add(product.id)}
							aria-label={product.available
								? `Tambah ${product.name}`
								: `${product.name} sedang habis`}
						>
							{#if product.available}<Plus size={16} strokeWidth={2.5} aria-hidden="true" /> Tambah{:else}Habis{/if}
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<ul class="lines">
				{#each cart.priced as line (line.product.id)}
					<li class:unavailable={!line.product.available}>
						<img src={line.product.image} alt="" class="thumb" sizes="4rem" />
						<div class="min-w-0">
							<p class="accent text-lg leading-tight">{line.product.name}</p>
							<p class="text-sm text-muted">
								{formatRupiah(line.product.price)} · {line.product.size}
							</p>
							{#if !line.product.available}
								<p class="mt-1 text-sm font-semibold text-red">
									Sedang habis, hapus dulu untuk lanjut pesan.
								</p>
							{/if}
							<div class="row">
								{#if line.product.available}
									<QtyStepper
										value={line.qty}
										label={line.product.name}
										onchange={(n) => cart.set(line.product.id, n)}
									/>
								{/if}
								<button
									type="button"
									class="remove"
									onclick={() => cart.remove(line.product.id)}
									aria-label={`Hapus ${line.product.name} dari keranjang`}
								>
									<Trash size={18} strokeWidth={2.25} aria-hidden="true" />
								</button>
							</div>
						</div>
						<p class="subtotal accent">{formatRupiah(line.subtotal)}</p>
					</li>
				{/each}
			</ul>

			<form class="form" onsubmit={(e) => e.preventDefault()} novalidate>
				<label class="field">
					<span class="label">Nama pemesan <span class="text-red">*</span></span>
					<input
						bind:this={nameInput}
						bind:value={name}
						type="text"
						name="name"
						autocomplete="name"
						maxlength="60"
						required
						placeholder="Nama kamu"
						aria-invalid={nameError}
						aria-describedby={nameError ? 'name-error' : undefined}
					/>
					{#if nameError}
						<span id="name-error" class="error"
							>Isi nama dulu, biar Kohee Break tahu pesanan ini punya siapa.</span
						>
					{/if}
				</label>

				{#if fulfillmentOptions.length > 0}
					<fieldset class="field">
						<legend class="label">Pengambilan <span class="text-red">*</span></legend>
						<div class="options">
							{#each fulfillmentOptions as option (option)}
								<label class="option">
									<input type="radio" name="fulfillment" value={option} bind:group={fulfillment} />
									<span>{option}</span>
								</label>
							{/each}
						</div>
						{#if triedSubmit && needsFulfillment}
							<span class="error">Pilih cara pengambilan dulu.</span>
						{/if}
					</fieldset>
				{/if}

				<DeliveryAddress onchange={(v) => (delivery = v)} />
				<label class="field">
					<span class="label">Catatan <span class="font-normal text-muted">(opsional)</span></span>
					<textarea
						bind:value={note}
						name="note"
						rows="3"
						maxlength="300"
						placeholder="Misal: kurangi manis, atau jam ambil"></textarea>
				</label>
			</form>
		{/if}
	</div>

	{#if cart.priced.length > 0}
		<div class="foot">
			<div class="total">
				<span class="accent">Total {delivery.quote?.status === 'manual' ? 'sementara' : ''}</span>
				<span class="display text-4xl">{formatRupiah(cart.total + (delivery.quote?.fee ?? 0))}</span
				>
			</div>

			{#if !settings.whatsappNumber}
				<p class="notice" role="alert">
					Pemesanan via WhatsApp belum aktif karena nomor penjual belum diatur. Cek lagi nanti, ya.
				</p>
				<button type="button" class="btn btn-red w-full" disabled>
					<MessageCircle size={18} strokeWidth={2.5} aria-hidden="true" /> Pesan via WhatsApp
				</button>
			{:else}
				{#if triedSubmit && problems.includes('unavailable-item')}
					<p class="error" role="alert">Ada menu yang sedang habis. Hapus dulu dari keranjang.</p>
				{/if}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- external wa.me link -->
				<button
					type="button"
					class="btn btn-red w-full"
					disabled={busy || !settings.open || (delivery.required && !delivery.quote)}
					onclick={checkout}
				>
					<MessageCircle size={18} strokeWidth={2.5} aria-hidden="true" />
					{busy
						? 'Menyiapkan pesanan…'
						: settings.open
							? 'Pesan via WhatsApp'
							: 'Toko sedang tutup'}
				</button>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{#if checkoutError}<p class="error" role="alert">{checkoutError}</p>{/if}
				{#if sent}
					<div class="sent" role="status">
						<p>
							WhatsApp sudah dibuka dengan pesan pesananmu. Pesanan diproses setelah Kohee Break
							membalas dan mengonfirmasi di chat.
						</p>
						<button type="button" class="clear" onclick={() => cart.clear()}>
							Sudah beres? Kosongkan keranjang
						</button>
					</div>
				{:else}
					<p class="fine">
						Nama dan catatan pesanan dicatat maksimal 90 hari untuk penanganan pesanan. Ringkasan
						item dan total disimpan untuk laporan. Tombol ini menyiapkan pesan WhatsApp; pesanan
						tetap memerlukan konfirmasi melalui chat.
					</p>
				{/if}
			{/if}
		</div>
	{/if}
</dialog>

<style>
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 1rem 1rem;
		border-bottom: 2px solid var(--color-ink);
	}

	.icon,
	.remove {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border: 2px solid var(--color-ink);
		cursor: pointer;
	}

	.icon:hover,
	.remove:hover {
		background: var(--color-ink);
		color: var(--color-ivory);
	}

	.scroll {
		flex: 1;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0 1rem 1.5rem;
	}

	.notice {
		margin-top: 1rem;
		padding: 0.85rem 1rem;
		border: 2px solid var(--color-ink);
		background: var(--color-ivory);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.empty {
		display: grid;
		justify-items: center;
		padding: 2rem 0 1.5rem;
		text-align: center;
	}

	.quick {
		border-top: 2px solid var(--color-ink);
	}

	.quick li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-block: 0.85rem;
		border-bottom: 2px solid var(--color-ink);
	}

	.lines li {
		display: grid;
		grid-template-columns: 4rem minmax(0, 1fr) auto;
		gap: 0.85rem;
		padding-block: 1.1rem;
		border-bottom: 2px solid var(--color-ink);
	}

	.lines li.unavailable .thumb {
		filter: grayscale(1);
		opacity: 0.6;
	}

	.thumb {
		width: 4rem;
		height: auto;
		align-self: start;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.subtotal {
		font-size: 1rem;
		white-space: nowrap;
	}

	.form {
		display: grid;
		gap: 1.1rem;
		margin-top: 1.5rem;
	}

	.field {
		display: grid;
		gap: 0.4rem;
	}

	.label {
		font-family: var(--font-accent);
		font-weight: 700;
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	input[type='text'],
	textarea {
		width: 100%;
		min-height: 3rem;
		padding: 0.75rem 0.9rem;
		border: 2px solid var(--color-ink);
		background: var(--color-ivory);
		font-size: 1rem;
	}

	input[type='text']::placeholder,
	textarea::placeholder {
		color: var(--color-muted);
	}

	input[type='text']:focus-visible,
	textarea:focus-visible {
		outline-offset: 0;
	}

	input[aria-invalid='true'] {
		border-color: var(--color-red);
		box-shadow: inset 0 0 0 1px var(--color-red);
	}

	textarea {
		resize: vertical;
	}

	.options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.option {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 2.75rem;
		padding: 0 1rem;
		border: 2px solid var(--color-ink);
		background: var(--color-ivory);
		cursor: pointer;
	}

	.option:has(input:checked) {
		background: var(--color-ink);
		color: var(--color-ivory);
	}

	.option input {
		accent-color: var(--color-red);
	}

	.error {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-red);
	}

	.foot {
		display: grid;
		gap: 0.75rem;
		padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
		border-top: 2px solid var(--color-ink);
		background: var(--color-cream);
	}

	.total {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.fine {
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--color-muted);
	}

	.sent {
		padding: 0.85rem 1rem;
		border: 2px solid var(--color-ink);
		background: var(--color-ivory);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.clear {
		margin-top: 0.5rem;
		min-height: 2.75rem;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 0.3em;
		cursor: pointer;
	}

	.clear:hover {
		color: var(--color-red);
	}

	@media (min-width: 48rem) {
		.top,
		.scroll,
		.foot {
			padding-inline: 1.5rem;
		}
	}
</style>
