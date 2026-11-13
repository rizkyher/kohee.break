<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Package,
		Check,
		ShoppingBag,
		Wallet,
		ArrowUpRight,
		ChartNoAxesCombined,
		Eye,
		MousePointerClick
	} from '@lucide/svelte';
	import type { analytics } from '#lib/server/orders.ts';
	import { formatRupiah } from '#lib/order.ts';
	import { dateTime } from '#lib/studio/client.ts';
	import { statusLabels } from '#lib/studio/contracts.ts';
	let {
		stats,
		overview = true,
		isAdmin = true
	}: {
		stats: Awaited<ReturnType<typeof analytics>>;
		overview?: boolean;
		isAdmin?: boolean;
	} = $props();
	const count = (type: string) => stats.events.find((e) => e.type === type)?.count ?? 0;
	const days = $derived(
		Array.from({ length: stats.days }, (_, i) => {
			const d = new Date(Date.now() - (stats.days - 1 - i) * 86400000).toISOString().slice(0, 10);
			return {
				day: d,
				count: stats.daily
					.filter((r) => r.day === d && r.type === 'checkout')
					.reduce((s, r) => s + r.count, 0)
			};
		})
	);
	const max = $derived(Math.max(1, ...days.map((d) => d.count)));
	const funnel = $derived([
		{ label: 'Page views', count: count('page_view') },
		{ label: 'Product views', count: count('product_view') },
		{ label: 'Add-to-cart events', count: count('add_to_cart') },
		{ label: 'Checkout initiations', count: stats.orders.checkouts },
		{ label: 'Confirmed orders', count: stats.orders.confirmed ?? 0 }
	]);
	const maxFunnel = $derived(Math.max(1, ...funnel.map((s) => s.count)));
</script>

{#if overview}<div class="s-welcome">
		<div class="daruma"></div>
		<div>
			<h2>A little care. A better break.</h2>
			<p>Rawat menu, cerita, dan setiap pesanan dari satu tempat.</p>
		</div>
		<a
			href={resolve('/admin/(studio)/[...path]', {
				path: '/admin/content'.replace(/^\/admin\/?/, '')
			})}
			class="s-button">Manage website <ArrowUpRight size={15} /></a
		>
	</div>{/if}
<div class="s-stack">
	<section class="s-grid" aria-label="Ringkasan statistik">
		<article class="s-panel s-metric">
			<Package size={20} />
			<p class="label">Total products</p>
			<strong>{stats.products.total ?? 0}</strong><small
				>{stats.products.active ?? 0} active · {stats.products.outOfStock ?? 0} out of stock</small
			>
		</article>
		<article class="s-panel s-metric">
			<ShoppingBag size={20} />
			<p class="label">Checkout initiations</p>
			<strong>{stats.orders.checkouts ?? 0}</strong><small
				>Intent tercatat · bukan pembelian sukses</small
			>
		</article>
		<article class="s-panel s-metric">
			<Check size={20} />
			<p class="label">Confirmed orders</p>
			<strong>{stats.orders.confirmed ?? 0}</strong><small>Dikonfirmasi manual oleh Admin</small>
		</article>
		<article class="s-panel s-metric highlight">
			<Wallet size={20} />
			<p class="label">Confirmed revenue</p>
			<strong style="font-size:clamp(1.35rem,2.3vw,2rem)"
				>{formatRupiah(stats.orders.revenue ?? 0)}</strong
			><small>Confirmed, preparing, completed</small>
		</article>
	</section>
	<div class="s-two">
		<section class="s-panel">
			<div class="s-panel-header">
				<div>
					<h2>Checkout activity</h2>
					<p>Checkout intent per hari · {stats.days} hari terakhir · tanggal UTC</p>
				</div>
				<ChartNoAxesCombined size={19} />
			</div>
			<div class="s-panel-body">
				{#if stats.orders.checkouts === 0}<div class="s-empty">
						<ChartNoAxesCombined size={30} />
						<h3>Belum ada checkout tercatat</h3>
						<p>Grafik muncul dari checkout yang dicatat melalui storefront.</p>
					</div>{:else}<div
						class="s-trend"
						role="img"
						aria-label="Jumlah checkout harian; data lengkap pada tabel di bawah."
					>
						{#each days as day, i (day.day)}<div title={`${day.day}: ${day.count} checkout`}>
								<span class="bar" style={`height:${Math.max(2, (day.count / max) * 100)}%`}
								></span>{#if i % Math.max(1, Math.floor(stats.days / 6)) === 0}<small
										>{day.day.slice(5)}</small
									>{:else}<small aria-hidden="true"> </small>{/if}
							</div>{/each}
					</div>
					<details style="margin-top:16px;font-size:.72rem">
						<summary>Data harian yang dapat dibaca</summary>
						<table class="s-table">
							<thead><tr><th>Tanggal UTC</th><th>Checkout intents</th></tr></thead><tbody
								>{#each days as day (day.day)}<tr><td>{day.day}</td><td>{day.count}</td></tr
									>{/each}</tbody
							>
						</table>
					</details>{/if}
			</div>
		</section>
		<section class="s-panel">
			<div class="s-panel-header">
				<div>
					<h2>Event funnel</h2>
					<p>Event count, bukan pengunjung unik.</p>
				</div>
				<MousePointerClick size={19} />
			</div>
			<div class="s-panel-body s-funnel">
				{#each funnel as step (step.label)}<div>
						<span>{step.label}</span>
						<div class="track">
							<div class="fill" style={`width:${(step.count / maxFunnel) * 100}%`}></div>
						</div>
						<strong>{step.count}</strong>
					</div>{/each}
				<p class="s-muted" style="font-size:.65rem;margin-top:12px">
					Tidak ada identitas pengunjung atau atribusi antar-event. WhatsApp click tidak berarti
					pesan terkirim. Pendapatan mengacu pada status pesanan saat ini dalam kohort checkout
					periode terpilih.
				</p>
			</div>
		</section>
	</div>
	<section class="s-panel">
		<div class="s-panel-header">
			<div>
				<h2>Popular products</h2>
				<p>Diurutkan berdasarkan add-to-cart, kemudian product views.</p>
			</div>
			<Eye size={19} />
		</div>
		{#if stats.popular.length}<div class="s-table-wrap">
				<table class="s-table">
					<thead><tr><th>Produk</th><th>Product views</th><th>Add-to-cart events</th></tr></thead
					><tbody
						>{#each stats.popular as product (product.id)}<tr
								><td
									><a
										href={resolve('/admin/(studio)/[...path]', {
											path: `/admin/products/${product.id}`.replace(/^\/admin\/?/, '')
										})}
										class="s-link">{product.name}</a
									></td
								><td>{product.views}</td><td>{product.selected}</td></tr
							>{/each}</tbody
					>
				</table>
			</div>{:else}<div class="s-empty">
				Belum ada interaksi produk tercatat pada periode ini.
			</div>{/if}
	</section>
	{#if overview && isAdmin}<div class="s-two">
			<section class="s-panel">
				<div class="s-panel-header">
					<h2>Recent checkout records</h2>
					<a
						href={resolve('/admin/(studio)/[...path]', {
							path: '/admin/orders'.replace(/^\/admin\/?/, '')
						})}
						class="s-link">View all</a
					>
				</div>
				{#if stats.recent.length}<div class="s-table-wrap">
						<table class="s-table">
							<thead><tr><th>Pelanggan</th><th>Total</th><th>Status</th></tr></thead><tbody
								>{#each stats.recent as order (order.id)}<tr
										><td
											><a
												class="s-link"
												href={resolve('/admin/(studio)/[...path]', {
													path: `/admin/orders/${order.id}`.replace(/^\/admin\/?/, '')
												})}>{order.customer_name}</a
											><small class="s-muted" style="display:block"
												>{dateTime(order.created_at)}</small
											></td
										><td>{formatRupiah(order.total)}</td><td
											><span class={`s-badge ${order.status}`}>{statusLabels[order.status]}</span
											></td
										></tr
									>{/each}</tbody
							>
						</table>
					</div>{:else}<div class="s-empty">
						Belum ada checkout. Pesanan pelanggan akan muncul di sini.
					</div>{/if}
			</section>
			<section class="s-panel">
				<div class="s-panel-header">
					<h2>Recent activity</h2>
					<a
						href={resolve('/admin/(studio)/[...path]', {
							path: '/admin/activity'.replace(/^\/admin\/?/, '')
						})}
						class="s-link">View log</a
					>
				</div>
				<ul class="s-panel-body s-activity">
					{#each stats.activity as log (log.id)}<li>
							<span class="s-dot"></span>
							<div>{log.action} · {log.entity}<small>{log.actor ?? 'System'}</small></div>
							<time>{dateTime(log.created_at)}</time>
						</li>{:else}<li>Belum ada aktivitas admin.</li>{/each}
				</ul>
			</section>
		</div>{/if}
</div>
