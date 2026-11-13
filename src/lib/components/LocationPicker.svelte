<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { Map as LibreMap, Marker } from 'maplibre-gl';
	import MapWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	import { MapPin, LocateFixed, Search, X } from '@lucide/svelte';
	import type { AddressResult } from '#lib/studio/geocoding.ts';
	import type { Destination, ShippingQuote } from '#lib/studio/shipping.ts';
	import 'maplibre-gl/dist/maplibre-gl.css';
	let {
		onconfirm,
		initial = null,
		initialAddress = '',
		route = null
	}: {
		onconfirm: (v: Destination) => void;
		initial?: Destination['point'] | null;
		initialAddress?: string;
		route?: ShippingQuote | null;
	} = $props();
	let dialog: HTMLDialogElement,
		canvas: HTMLDivElement,
		map: LibreMap | undefined,
		marker: Marker | undefined;
	let address = $state(''),
		point = $state<Destination['point'] | null>(null),
		message = $state(''),
		ready = $state(false),
		busy = $state(false),
		gpsAccuracy = $state<number | null>(null);
	let gpsGeneration = 0;
	let search = $state(''),
		results = $state<AddressResult[]>([]),
		searching = $state(false),
		searchMessage = $state(''),
		opened = $state(false);
	$effect(() => {
		const query = search.trim();
		results = [];
		searchMessage = '';
		searching = false;
		if (!opened || query.length < 3) return;
		const controller = new AbortController();
		searching = true;
		const timer = setTimeout(async () => {
			try {
				const response = await fetch('/api/delivery/geocode', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ query }),
					signal: controller.signal
				});
				const data = (await response.json()) as { results?: AddressResult[]; message?: string };
				if (controller.signal.aborted) return;
				if (!response.ok)
					throw Error(data.message ?? 'Pencarian gagal. Coba lagi atau pilih titik di peta.');
				results = data.results ?? [];
				if (!results.length)
					searchMessage =
						'Lokasi tidak ditemukan di Bandung Raya. Coba nama lain atau pilih titik di peta.';
			} catch (e) {
				if (!controller.signal.aborted)
					searchMessage = e instanceof Error ? e.message : 'Pencarian gagal.';
			} finally {
				if (!controller.signal.aborted) searching = false;
			}
		}, 450);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});
	function select(p: Destination['point']) {
		gpsGeneration++;
		busy = false;
		gpsAccuracy = null;
		point = p;
		marker?.setLngLat([p.lng, p.lat]);
		map?.panTo([p.lng, p.lat]);
		if (map?.getLayer('delivery-route')) {
			map.removeLayer('delivery-route');
			map.removeSource('delivery-route');
		}
	}
	async function open() {
		gpsGeneration++;
		busy = false;
		gpsAccuracy = null;
		opened = true;
		search = '';
		address = initialAddress;
		point = null;
		dialog.showModal();
		await tick();
		message = '';
		ready = false;
		map?.remove();
		map = undefined;
		try {
			const response = await fetch('/api/delivery/config');
			if (!response.ok) throw Error('Konfigurasi peta tidak tersedia.');
			const config = (await response.json()) as {
				configured: boolean;
				tileJson: string;
				origin: Destination['point'] | null;
			};
			if (!config.configured) throw Error('Basemap PMTiles belum dikonfigurasi oleh toko.');
			let center = initial ?? config.origin;
			if (!center) {
				const response = await fetch(config.tileJson);
				if (!response.ok) throw Error('Basemap regional belum tersedia.');
				const meta = (await response.json()) as { bounds?: number[] };
				if (!meta.bounds || meta.bounds.length !== 4)
					throw Error('Batas basemap regional tidak tersedia.');
				center = {
					lng: (meta.bounds[0] + meta.bounds[2]) / 2,
					lat: (meta.bounds[1] + meta.bounds[3]) / 2
				};
			}
			const { Map, Marker, NavigationControl, setWorkerUrl } = await import('maplibre-gl');
			setWorkerUrl(MapWorker);
			map = new Map({
				container: canvas,
				center: [center.lng, center.lat],
				zoom: 14,
				attributionControl: { compact: false },
				style: {
					version: 8,
					sources: {
						basemap: {
							type: 'vector',
							url: config.tileJson,
							attribution:
								'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · <a href="https://protomaps.com">Protomaps</a>'
						}
					},
					layers: [
						{ id: 'background', type: 'background', paint: { 'background-color': '#F1EADA' } },
						{
							id: 'water',
							source: 'basemap',
							'source-layer': 'water',
							type: 'fill',
							paint: { 'fill-color': '#c5d7d2' }
						},
						{
							id: 'landuse',
							source: 'basemap',
							'source-layer': 'landuse',
							type: 'fill',
							paint: { 'fill-color': '#e3e4ce', 'fill-opacity': 0.7 }
						},
						{
							id: 'buildings',
							source: 'basemap',
							'source-layer': 'buildings',
							type: 'fill',
							minzoom: 13,
							paint: { 'fill-color': '#d4c6b9' }
						},
						{
							id: 'roads-casing',
							source: 'basemap',
							'source-layer': 'roads',
							type: 'line',
							paint: { 'line-color': '#c9b7a5', 'line-width': 5 }
						},
						{
							id: 'roads',
							source: 'basemap',
							'source-layer': 'roads',
							type: 'line',
							paint: { 'line-color': '#FDFFF1', 'line-width': 3 }
						}
					]
				}
			});
			map.addControl(new NavigationControl({ showCompass: false }));
			marker = new Marker({ color: '#880B11', draggable: true })
				.setLngLat([center.lng, center.lat])
				.addTo(map);
			marker
				.getElement()
				.setAttribute('aria-label', 'Pin tujuan pengiriman; geser untuk menyesuaikan');
			marker.on('dragend', () => {
				const p = marker!.getLngLat();
				select({ lat: p.lat, lng: p.lng });
			});
			map.on('click', (e) => select({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
			const origin = route?.origin ?? config.origin;
			if (origin)
				new Marker({ color: '#111111' })
					.setLngLat([origin.lng, origin.lat])
					.addTo(map)
					.getElement()
					.setAttribute('aria-label', 'Lokasi toko');
			map.on('load', () => {
				ready = true;
				if (route?.polyline) {
					try {
						const geometry = JSON.parse(route.polyline);
						if (geometry.type === 'LineString') {
							map!.addSource('delivery-route', {
								type: 'geojson',
								data: { type: 'Feature', properties: {}, geometry }
							});
							map!.addLayer({
								id: 'delivery-route',
								type: 'line',
								source: 'delivery-route',
								paint: { 'line-color': '#880B11', 'line-width': 5 }
							});
						}
					} catch {
						/* Historical Google polylines remain snapshots; never reinterpret as GeoJSON. */
					}
				}
			});
			map.on('error', () => {
				message = 'Sebagian data peta gagal dimuat. Periksa layanan tile atau coba lagi.';
				ready = false;
			});
			if (initial) point = { ...initial };
		} catch (e) {
			message = e instanceof Error ? e.message : 'Peta gagal dimuat.';
		}
	}
	function gps() {
		message = '';
		gpsAccuracy = null;
		if (!window.isSecureContext) {
			message =
				'Lokasi perangkat memerlukan koneksi HTTPS. Pilih titik di peta atau buka website melalui HTTPS.';
			return;
		}
		if (!navigator.geolocation) {
			message = 'GPS tidak tersedia.';
			return;
		}
		busy = true;
		const request = ++gpsGeneration;
		navigator.geolocation.getCurrentPosition(
			(p) => {
				if (request !== gpsGeneration || !opened) return;
				select({ lat: p.coords.latitude, lng: p.coords.longitude });
				gpsAccuracy = Number.isFinite(p.coords.accuracy) ? Math.ceil(p.coords.accuracy) : null;
			},
			(error) => {
				if (request !== gpsGeneration || !opened) return;
				busy = false;
				message =
					error.code === 1
						? 'Izin lokasi ditolak. Izinkan akses lokasi di pengaturan browser atau pilih titik di peta.'
						: error.code === 3
							? 'Lokasi GPS belum didapat. Pastikan GPS perangkat aktif, lalu coba lagi atau pilih titik di peta.'
							: 'Lokasi perangkat tidak tersedia. Aktifkan GPS atau pilih titik di peta.';
			},
			{ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
		);
	}
	onMount(() => () => {
		gpsGeneration++;
		map?.remove();
	});
</script>

<button type="button" class="btn" onclick={open}><MapPin size={18} />Pilih titik di peta</button>
<dialog
	bind:this={dialog}
	class="location-picker"
	aria-label="Pilih lokasi pengiriman"
	onclose={() => {
		gpsGeneration++;
		busy = false;
		gpsAccuracy = null;
		opened = false;
		search = '';
	}}
>
	<div class="picker-head">
		<h2 class="accent">Lokasi pengiriman</h2>
		<button type="button" aria-label="Tutup peta" onclick={() => dialog.close()}
			><X size={24} /></button
		>
	</div>
	<label
		>Cari jalan atau tempat
		<input
			type="search"
			bind:value={search}
			maxlength="160"
			autocomplete="off"
			placeholder="Contoh: Jalan Braga, Gedung Sate"
			aria-describedby="location-search-help"
			aria-controls="location-search-results"
		/>
	</label>
	<small id="location-search-help"
		>Cari lokasi di Bandung Raya, lalu pilih salah satu hasilnya.</small
	>
	{#if searching}<p role="status">Mencari lokasi…</p>{/if}
	{#if searchMessage}<p role="status">{searchMessage}</p>{/if}
	<ul
		id="location-search-results"
		class="search-results"
		aria-label="Hasil pencarian lokasi"
		aria-busy={searching}
	>
		{#each results as result (result.id)}
			<li>
				<button
					type="button"
					disabled={!ready}
					onclick={() => {
						select(result.point);
						address = result.label;
						search = '';
						searchMessage = '';
					}}><Search size={18} aria-hidden="true" /><span>{result.label}</span></button
				>
			</li>
		{/each}
	</ul>
	<label
		>Alamat lengkap<input
			bind:value={address}
			disabled={!opened}
			required
			minlength="5"
			maxlength="500"
			autocomplete="street-address"
			placeholder="Jalan, nomor rumah, kelurahan, kecamatan, kota"
		/></label
	>
	<p>
		Pilih hasil pencarian, ketuk peta, atau geser pin merah. Pin hitam menunjukkan toko. Lengkapi
		alamat dengan nomor rumah dan patokan sebelum mengonfirmasi.
	</p>
	<button type="button" class="btn" disabled={!ready || busy} onclick={gps}
		><LocateFixed size={18} />{busy ? 'Mengambil lokasi GPS…' : 'Gunakan Lokasi Saya'}</button
	>
	{#if gpsAccuracy !== null}<p role="status">
			Lokasi perangkat ditemukan (akurasi ±{gpsAccuracy} m). Periksa pin dan lengkapi alamat sebelum mengonfirmasi.
		</p>{/if}
	<div bind:this={canvas} class="map" aria-label="Peta pengiriman"></div>
	{#if point}<p aria-live="polite">Titik: {point.lat.toFixed(6)}, {point.lng.toFixed(6)}</p>{/if}
	{#if message}<p role="alert">{message}</p>{/if}
	<button
		type="button"
		class="btn btn-red"
		disabled={!ready || !point || address.trim().length < 5 || busy}
		onclick={() => {
			if (point) {
				onconfirm({ address: address.trim(), point, details: '', phone: '' });
				dialog.close();
			}
		}}>Konfirmasi Titik Pengiriman</button
	>
</dialog>

<style>
	.search-results {
		display: grid;
		gap: 0.4rem;
		max-height: 220px;
		overflow: auto;
		list-style: none;
		padding: 0;
		margin-block: 0.5rem;
	}
	.search-results button {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		width: 100%;
		min-height: 44px;
		border: 1px solid var(--color-ink);
		padding: 0.7rem;
		background: var(--color-ivory);
		text-align: left;
		cursor: pointer;
	}
	.search-results :global(svg) {
		flex-shrink: 0;
	}
	.location-picker {
		margin: auto;
		width: min(94vw, 700px);
		max-height: 90dvh;
		overflow: auto;
		background: var(--color-cream);
		border: 2px solid var(--color-ink);
		padding: 1rem;
	}
	.location-picker::backdrop {
		background: #1119;
	}
	.picker-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}
	.picker-head button {
		padding: 0.5rem;
		cursor: pointer;
	}
	.location-picker label {
		display: grid;
		gap: 0.5rem;
	}
	.location-picker input {
		padding: 0.8rem;
		border: 2px solid var(--color-ink);
		font-size: 1rem;
		background: var(--color-ivory);
	}
	.map {
		height: 350px;
		margin-block: 1rem;
	}
	.location-picker p {
		margin-block: 1rem;
	}
	.location-picker > .btn {
		margin-top: 1rem;
	}
</style>
