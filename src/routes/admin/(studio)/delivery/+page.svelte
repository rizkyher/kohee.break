<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import LocationPicker from '#lib/components/LocationPicker.svelte';
	import Notice from '#lib/components/studio/Notice.svelte';
	import { calculateShipping, type DeliverySettings } from '#lib/studio/shipping.ts';
	import { formatRupiah } from '#lib/order.ts';
	import { protectChanges } from '#lib/studio/client.ts';
	let { data } = $props();
	let model = $state<DeliverySettings>(structuredClone(untrack(() => data.config))),
		baseline = $state(JSON.stringify(untrack(() => data.config))),
		message = $state(''),
		isError = $state(false),
		busy = $state(false),
		km = $state(4.3),
		subtotal = $state(20000);
	const unload = protectChanges(() => JSON.stringify(model) !== baseline);
	const preview = $derived(
		calculateShipping(model, Math.max(0, km || 0) * 1000, Math.max(0, Math.floor(subtotal || 0)))
	);
	const labels = {
		freeRadiusKm: 'Radius gratis (km)',
		rate: 'Tarif per km (IDR)',
		baseFee: 'Ongkir dasar (IDR)',
		feeIncrement: 'Kelipatan pembulatan ongkir (IDR)',
		minFee: 'Ongkir minimum (IDR)'
	};
	async function save() {
		busy = true;
		try {
			const r = await fetch('/api/delivery/settings', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(model)
			});
			const result = (await r.json()) as { message?: string };
			if (!r.ok) throw Error(result.message);
			baseline = JSON.stringify(model);
			await invalidateAll();
			message = 'Aturan pengiriman disimpan. Quote lama harus diperbarui.';
			isError = false;
		} catch (e) {
			message = e instanceof Error ? e.message : 'Gagal menyimpan.';
			isError = true;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Delivery & Shipping · Kohee Studio</title></svelte:head><svelte:window
	onbeforeunload={unload}
/>
<div class="s-heading">
	<div>
		<p class="s-eyebrow">KOHEE STUDIO / DELIVERY</p>
		<h1>Delivery & shipping</h1>
		<p>Jarak jalan nyata, harga yang kamu tentukan. Versi aturan {data.version}.</p>
	</div>
</div>
<Notice {message} error={isError} />{#if !data.configured}<p
		class="s-panel s-panel-body"
		role="status"
	>
		PMTiles/OSRM belum dikonfigurasi. Isi URL tileset dan endpoint routing privat sebelum
		menggunakan peta/pengiriman.
	</p>{/if}
<div class="s-two">
	<form
		class="s-stack"
		onsubmit={(e) => {
			e.preventDefault();
			save();
		}}
	>
		<section class="s-panel">
			<div class="s-panel-header"><h2>Store origin</h2></div>
			<div class="s-panel-body s-fields">
				<label>Nama toko<input bind:value={model.originName} required maxlength="120" /></label
				><LocationPicker
					initialAddress={model.originAddress}
					initial={model.origin}
					onconfirm={(v) => {
						model.origin = v.point;
						model.originAddress = v.address;
					}}
				/><label
					>Alamat toko<textarea bind:value={model.originAddress} maxlength="500"></textarea></label
				>
				<div class="s-fields two">
					<label
						>Latitude<input
							type="number"
							step="any"
							min="-90"
							max="90"
							value={model.origin?.lat ?? ''}
							oninput={(e) =>
								(model.origin = {
									lat: Number(e.currentTarget.value),
									lng: model.origin?.lng ?? 0
								})}
						/></label
					><label
						>Longitude<input
							type="number"
							step="any"
							min="-180"
							max="180"
							value={model.origin?.lng ?? ''}
							oninput={(e) =>
								(model.origin = {
									lng: Number(e.currentTarget.value),
									lat: model.origin?.lat ?? 0
								})}
						/></label
					>
				</div>
				<small>Koordinat manual harus diperiksa melalui peta sebelum mengaktifkan pengiriman.</small
				>
			</div>
		</section>
		<section class="s-panel">
			<div class="s-panel-header"><h2>Pricing rules</h2></div>
			<div class="s-panel-body s-fields">
				<label class="s-check"
					><input type="checkbox" bind:checked={model.enabled} />Delivery aktif</label
				><label class="s-check"
					><input type="checkbox" bind:checked={model.freeEnabled} />Gratis di dalam radius gratis</label
				><label
					>Model harga<select bind:value={model.model}
						><option value="excess">A — tagih jarak di luar radius gratis</option><option
							value="full">B — tagih seluruh jarak saat di luar radius gratis</option
						></select
					></label
				><label
					>Pembulatan jarak<select bind:value={model.rounding}
						><option value="exact">Jarak tepat</option><option value="ceil"
							>Bulatkan ke atas 1 km</option
						><option value="ceil-tenth">Bulatkan ke atas 0,1 km</option></select
					></label
				>{#each Object.entries(labels) as [key, label] (key)}<label
						>{label}<input
							type="number"
							step={key.includes('Km') ? 'any' : '1'}
							min={key === 'feeIncrement' ? 1 : 0}
							value={model[key as keyof typeof labels]}
							oninput={(e) => (model[key as keyof typeof labels] = Number(e.currentTarget.value))}
							required
						/></label
					>{/each}<label
					>Jarak maksimum (km, opsional)<input
						type="number"
						min="0.001"
						max="1000"
						step="any"
						aria-describedby="delivery-distance-help"
						value={model.maxDistanceKm ?? ''}
						placeholder="Tanpa batas jarak"
						oninput={(e) =>
							(model.maxDistanceKm =
								e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
					/></label
				><small id="delivery-distance-help"
					>Kosongkan agar semua tujuan yang memiliki rute jalan dapat dikirim. Ongkir tetap dihitung
					dari jarak jalan.</small
				><label
					>Ongkir maksimum (opsional)<input
						type="number"
						min="0"
						value={model.maxFee ?? ''}
						oninput={(e) =>
							(model.maxFee = e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
					/></label
				><label
					>Gratis jika subtotal minimal (opsional)<input
						type="number"
						min="0"
						value={model.freeMinimum ?? ''}
						oninput={(e) =>
							(model.freeMinimum =
								e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
					/></label
				><label class="s-check"
					><input type="checkbox" bind:checked={model.manualFallback} />Izinkan konfirmasi manual
					jika routing gagal</label
				><small
					>Manual berarti ongkir dan total akhir belum diketahui. Sistem tidak menyatakan ongkir
					gratis.</small
				><button type="submit" class="s-button primary" disabled={busy}
					>{busy ? 'Menyimpan…' : 'Simpan aturan pengiriman'}</button
				>
			</div>
		</section>
	</form>
	<aside class="s-stack" style="align-self:start">
		<section class="s-panel">
			<div class="s-panel-header"><h2>Pricing simulator</h2></div>
			<div class="s-panel-body s-fields">
				<p class="s-muted">Simulasi berdasarkan jarak contoh, bukan quote rute nyata.</p>
				<label
					>Jarak jalan contoh (km)<input type="number" min="0" step="any" bind:value={km} /></label
				><label
					>Subtotal contoh (IDR)<input
						type="number"
						min="0"
						step="1"
						bind:value={subtotal}
					/></label
				>
				<p>Radius gratis: {model.freeEnabled ? model.freeRadiusKm : 0} km</p>
				<p>
					Batas jarak: {model.maxDistanceKm === null
						? 'Tanpa batas jarak'
						: `${model.maxDistanceKm} km`}
				</p>
				<p>Kelayakan: {preview.eligible ? 'Dalam jangkauan' : 'Di luar jangkauan'}</p>
				<p>Jarak ditagih: {preview.chargeableKm} km</p>
				<p>Biaya dasar: {formatRupiah(preview.baseFee)}</p>
				<p>Biaya jarak: {formatRupiah(preview.distanceFee)}</p>
				<strong
					>Ongkir: {preview.fee === null ? 'Tidak tersedia' : formatRupiah(preview.fee)}</strong
				>
			</div>
		</section>
	</aside>
</div>
