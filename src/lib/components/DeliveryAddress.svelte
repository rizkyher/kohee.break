<script lang="ts">
	import { onMount } from 'svelte';
	import LocationPicker from './LocationPicker.svelte';
	import { cart } from '#lib/cart.svelte.ts';
	import { formatRupiah } from '#lib/order.ts';
	import type { Destination, ShippingQuote } from '#lib/studio/shipping.ts';
	let {
		onchange
	}: {
		onchange: (value: {
			required: boolean;
			destination: Destination | null;
			quote: ShippingQuote | null;
		}) => void;
	} = $props();
	let enabled = $state<boolean | null>(null),
		destination = $state<Destination | null>(null),
		quote = $state<ShippingQuote | null>(null),
		busy = $state(false),
		message = $state(''),
		now = $state(Date.now());
	let generation = 0;
	onMount(() => {
		void fetch('/api/delivery/config')
			.then((r) => {
				if (!r.ok) throw Error('Konfigurasi tidak tersedia.');
				return r.json();
			})
			.then((c) => (enabled = (c as { enabled: boolean }).enabled))
			.catch(() => {
				message = 'Konfigurasi pengiriman gagal dimuat.';
				enabled = null;
			});
		const t = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(t);
	});
	$effect(() => {
		const items = cart.lines.map((i) => ({ ...i })),
			dest = destination
				? {
						address: destination.address,
						point: { ...destination.point },
						details: destination.details,
						phone: destination.phone
					}
				: null;
		const version = ++generation;
		quote = null;
		if (!enabled || !dest || !items.length) {
			busy = false;
			return;
		}
		busy = true;
		message = '';
		const t = setTimeout(async () => {
			try {
				const r = await fetch('/api/delivery/quote', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ destination: dest, items })
				});
				const d = (await r.json()) as ShippingQuote & { message?: string };
				if (version !== generation) return;
				if (!r.ok) throw Error(d.message ?? 'Ongkir tidak dapat dihitung.');
				quote = d;
			} catch (e) {
				if (version === generation) message = e instanceof Error ? e.message : 'Koneksi gagal.';
			} finally {
				if (version === generation) busy = false;
			}
		}, 400);
		return () => clearTimeout(t);
	});
	const valid = $derived(quote && quote.expires > now ? quote : null);
	$effect(() => onchange({ required: enabled !== false, destination, quote: valid }));
</script>

<fieldset class="delivery-address">
	<legend class="accent">Alamat pengiriman</legend>
	{#if enabled === null}
		{#if message}<p role="alert">{message} Muat ulang halaman untuk mencoba lagi.</p>{:else}<p
				role="status"
			>
				Memuat informasi pengiriman…
			</p>{/if}
	{:else if !enabled}
		<p role="status">
			Pengiriman belum tersedia. Pemilihan alamat dan perhitungan ongkir akan tersedia setelah toko
			mengaktifkan pengiriman.
		</p>
	{:else}
		<LocationPicker
			initialAddress={destination?.address ?? ''}
			route={valid}
			onconfirm={(v) =>
				(destination = {
					...v,
					details: destination?.details ?? '',
					phone: destination?.phone ?? ''
				})}
			initial={destination?.point}
		/>{#if destination}<p>{destination.address}</p>
			<label
				>Alamat lengkap<input value={destination.address} readonly /><small
					>Ubah alamat melalui pemilih peta agar alamat dan pin tetap sesuai.</small
				></label
			><label
				>Detail alamat<input
					bind:value={destination.details}
					maxlength="300"
					placeholder="Nomor rumah, RT/RW, patokan"
				/></label
			><label
				>Telepon penerima (opsional)<input
					type="tel"
					bind:value={destination.phone}
					maxlength="30"
					autocomplete="tel"
				/></label
			>{/if}{#if busy}<p role="status">Menghitung rute jalan dan ongkir…</p>{:else if valid}<p>
				Jarak: {valid.distance === null
					? 'Menunggu konfirmasi'
					: `${(valid.distance / 1000).toFixed(2)} km`}<br />Ongkir:
				<strong
					>{valid.fee === null
						? 'Konfirmasi manual diperlukan'
						: valid.fee === 0
							? 'GRATIS ONGKIR'
							: formatRupiah(valid.fee)}</strong
				>
			</p>
			<p>
				Total {valid.fee === null ? 'sementara (belum termasuk ongkir)' : ''}: {formatRupiah(
					cart.total + (valid.fee ?? 0)
				)}
			</p>
			<small>Penawaran berlaku sampai {new Date(valid.expires).toLocaleTimeString('id-ID')}.</small
			>{:else if destination && !message}<button
				type="button"
				class="btn"
				onclick={() => (destination = { ...destination! })}>Hitung ulang ongkir</button
			>{/if}{#if message}<p role="alert">{message}</p>{/if}<small
			>Alamat, nomor penerima, dan koordinat dihapus setelah masa retensi pengiriman (30 hari).
			Titik dikirim ke layanan routing OSRM toko untuk menghitung jarak jalan.</small
		>
	{/if}
</fieldset>

<style>
	.delivery-address {
		display: grid;
		gap: 0.8rem;
		border: 2px solid var(--color-ink);
		padding: 1rem;
	}
	.delivery-address legend {
		padding-inline: 0.4rem;
	}
	.delivery-address label {
		display: grid;
		gap: 0.4rem;
	}
	.delivery-address input {
		padding: 0.7rem;
		border: 2px solid var(--color-ink);
		background: var(--color-ivory);
		font-size: 1rem;
	}
	.delivery-address small {
		font-size: 0.75rem;
		line-height: 1.5;
	}
</style>
