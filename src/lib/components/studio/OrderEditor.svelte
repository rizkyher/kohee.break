<script lang="ts">
	import { untrack } from 'svelte';
	import LocationPicker from '#lib/components/LocationPicker.svelte';
	import type { ShippingQuote, Destination } from '#lib/studio/shipping.ts';
	import type { getOrder } from '#lib/server/orders.ts';
	import {
		orderStatuses,
		statusLabels,
		allowedTransition,
		type OrderStatus
	} from '#lib/studio/contracts.ts';
	import { formatRupiah } from '#lib/order.ts';
	import { mutate, dateTime, protectChanges } from '#lib/studio/client.ts';
	import Notice from './Notice.svelte';
	import Confirm from './Confirm.svelte';
	let { order }: { order: Awaited<ReturnType<typeof getOrder>> } = $props();
	let status = $state<OrderStatus>(untrack(() => order.status)),
		note = $state(untrack(() => order.internal_note)),
		baseline = $state(JSON.stringify(untrack(() => [order.status, order.internal_note]))),
		busy = $state(false),
		message = $state(''),
		isError = $state(false);
	let manualFee = $state<number | null>(null);
	const shipping = $derived(
		order.delivery_snapshot
			? (JSON.parse(order.delivery_snapshot) as ShippingQuote &
					Destination & { subtotal: number; total: number })
			: null
	);
	const dirty = $derived(JSON.stringify([status, note]) !== baseline),
		unload = protectChanges(() => dirty);
	async function save() {
		busy = true;
		try {
			await mutate(`orders/${order.id}`, 'PUT', {
				status,
				internal_note: note,
				previous: order.status,
				version: order.version,
				deliveryFee: manualFee ?? undefined
			});
			baseline = JSON.stringify([status, note]);
			message = 'Pesanan diperbarui.';
			isError = false;
		} catch (e) {
			message = e instanceof Error ? e.message : 'Gagal menyimpan.';
			isError = true;
			throw e;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:window onbeforeunload={unload} /><Notice {message} error={isError} />
{#if shipping}<section class="s-panel s-panel-body s-fields" style="margin-bottom:24px">
		<h2>Pengiriman</h2>
		{#if shipping.fee === null}<label
				>Ongkir yang disepakati (IDR)<input
					type="number"
					min="0"
					step="1"
					value={manualFee ?? ''}
					oninput={(e) =>
						(manualFee = e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
				/></label
			>{/if}
		<p>{shipping.address}</p>
		<p>{shipping.details} · {shipping.phone}</p>
		<p>
			Subtotal: {formatRupiah(shipping.subtotal)} · Jarak: {shipping.distance === null
				? 'Menunggu konfirmasi'
				: (shipping.distance / 1000).toFixed(2) + ' km'} · Ongkir: {shipping.fee === null
				? 'Belum dikonfirmasi'
				: formatRupiah(shipping.fee)}
		</p>
		<p>Total {shipping.fee === null ? 'sementara' : ''}: {formatRupiah(shipping.total)}</p>
		{#if shipping.point}
			<a
				href={`https://www.openstreetmap.org/?mlat=${shipping.point.lat}&mlon=${shipping.point.lng}#map=17/${shipping.point.lat}/${shipping.point.lng}`}
				target="_blank"
				rel="noopener noreferrer"
				class="s-link">Buka tujuan di OpenStreetMap</a
			><LocationPicker route={shipping} initial={shipping.point} onconfirm={() => {}} />
		{/if}
	</section>{/if}
<div class="s-two">
	<div class="s-stack">
		<section class="s-panel">
			<div class="s-panel-header">
				<div>
					<h2>Checkout snapshot</h2>
					<p>Harga dan nama produk ketika checkout dicatat.</p>
				</div>
				<span class={`s-badge ${order.status}`}>{statusLabels[order.status]}</span>
			</div>
			<div class="s-table-wrap">
				<table class="s-table">
					<thead><tr><th>Produk</th><th>Harga</th><th>Qty</th><th>Subtotal</th></tr></thead><tbody
						>{#each order.items as item (item.id)}<tr
								><td>{item.product_name}</td><td>{formatRupiah(item.price)}</td><td>{item.qty}</td
								><td>{formatRupiah(item.subtotal)}</td></tr
							>{/each}<tr
							><td colspan="3"><strong>Total</strong></td><td
								><strong>{formatRupiah(order.total)}</strong></td
							></tr
						></tbody
					>
				</table>
			</div>
		</section>
		<section class="s-panel">
			<div class="s-panel-header"><h2>Customer & checkout</h2></div>
			<dl class="s-panel-body s-fields two">
				<div>
					<dt class="s-muted">Nama</dt>
					<dd>{order.customer_name}</dd>
				</div>
				<div>
					<dt class="s-muted">Waktu checkout</dt>
					<dd>{dateTime(order.created_at)}</dd>
				</div>
				<div>
					<dt class="s-muted">Pengambilan</dt>
					<dd>{order.fulfillment || 'Tidak ditanyakan'}</dd>
				</div>
				<div>
					<dt class="s-muted">Catatan pelanggan</dt>
					<dd style="white-space:pre-line">{order.customer_note || 'Tidak ada catatan'}</dd>
				</div>
			</dl>
		</section>
		<section class="s-panel">
			<div class="s-panel-header"><h2>Status history</h2></div>
			<ul class="s-panel-body s-activity">
				{#each order.history as row (row.id)}<li>
						<span class="s-dot"></span>
						<div>{statusLabels[row.status]}<small>{row.actor ?? 'Checkout pelanggan'}</small></div>
						<time>{dateTime(row.created_at)}</time>
					</li>{/each}
			</ul>
		</section>
	</div>
	<aside class="s-stack" style="align-self:start">
		<section class="s-panel">
			<div class="s-panel-header"><h2>Manage order</h2></div>
			<div class="s-panel-body s-fields">
				<p class="s-muted">
					Checkout intent belum membuktikan pesan terkirim atau pembayaran berhasil. Konfirmasi
					hanya setelah komunikasi dengan pelanggan.
				</p>
				<label
					>Status<select bind:value={status}
						>{#each orderStatuses as option (option)}<option
								value={option}
								disabled={!allowedTransition(order.status, option)}>{statusLabels[option]}</option
							>{/each}</select
					></label
				><label
					>Internal notes<textarea
						bind:value={note}
						rows="6"
						maxlength="2000"
						placeholder="Hanya terlihat oleh Admin."></textarea></label
				>{#if status !== order.status}<Confirm
						label={status === 'cancelled'
							? 'Batalkan pesanan'
							: status === 'confirmed'
								? 'Konfirmasi pesanan'
								: 'Ubah status'}
						description={`Ubah status ke ${statusLabels[status]}? Pastikan detail dan ketersediaan sudah dikonfirmasi lewat chat.`}
						onconfirm={save}
					/>{:else}<button
						type="button"
						class="s-button primary"
						disabled={busy}
						onclick={() => {
							void save().catch(() => {});
						}}>{busy ? 'Menyimpan…' : 'Simpan catatan'}</button
					>{/if}<small class="s-muted"
					>{dirty ? 'Ada perubahan belum disimpan.' : 'Semua perubahan tersimpan.'}</small
				>
			</div>
		</section>
	</aside>
</div>
