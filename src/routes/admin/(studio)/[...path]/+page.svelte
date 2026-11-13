<script lang="ts">
	import { resolve } from '$app/paths';

	import {
		Plus,
		Search,
		Package,
		ArrowUpRight,
		PanelsTopLeft,
		History,
		ShoppingBag,
		ArrowLeft
	} from '@lucide/svelte';
	import type { PageProps } from './$types';
	import ProductEditor from '#lib/components/studio/ProductEditor.svelte';
	import CategoryManager from '#lib/components/studio/CategoryManager.svelte';
	import ContentEditor from '#lib/components/studio/ContentEditor.svelte';
	import MediaManager from '#lib/components/studio/MediaManager.svelte';
	import OrderEditor from '#lib/components/studio/OrderEditor.svelte';
	import SettingsEditor from '#lib/components/studio/SettingsEditor.svelte';
	import ProfileEditor from '#lib/components/studio/ProfileEditor.svelte';
	import Dashboard from '#lib/components/studio/Dashboard.svelte';
	import Pagination from '#lib/components/studio/Pagination.svelte';
	import Confirm from '#lib/components/studio/Confirm.svelte';
	import { formatRupiah } from '#lib/order.ts';
	import { statusLabels, orderStatuses } from '#lib/studio/contracts.ts';
	import { mutate, dateTime } from '#lib/studio/client.ts';
	let { data }: PageProps = $props();
	const titles: Record<string, string> = {
		overview: 'A good day to make a break.',
		products: 'Products',
		categories: 'Categories',
		content: 'Website content',
		media: 'Media library',
		orders: 'Orders & checkout intents',
		analytics: 'Analytics',
		settings: 'Store settings',
		activity: 'Activity log',
		profile: 'My profile'
	};
	const descriptions: Record<string, string> = {
		overview: 'Your brand, at a glance. Statistik nyata dari aktivitas yang tercatat.',
		products: 'Kelola setiap botol, harga, dan ketersediaannya.',
		categories: 'Susun menu agar pelanggan mudah menemukan favoritnya.',
		content: 'Rawat cerita Kohee Break, satu section setiap kali.',
		media: 'Semua foto produk dan artwork, dalam satu tempat.',
		orders: 'Checkout intent menunggu konfirmasi manual melalui chat pelanggan.',
		analytics: 'Interaksi nyata. Pesanan terkonfirmasi. Tanpa angka perkiraan.',
		settings: 'Informasi toko, pemesanan, akses tim, dan retensi data.',
		activity: 'Jejak perubahan penting dan siapa yang melakukannya.',
		profile: 'Kelola identitas dan keamanan akun Studio.'
	};
	const title = $derived(
		data.area === 'products' && data.id
			? data.id === 'new'
				? 'New product'
				: (data.product?.name ?? 'Edit product')
			: data.area === 'content' && data.id
				? `${data.id.charAt(0).toUpperCase()}${data.id.slice(1)} editor`
				: data.area === 'orders' && data.id
					? `Order #${data.id.slice(0, 8)}`
					: titles[data.area]
	);
	const contentLabels: Record<string, string> = {
		hero: 'Hero',
		marquee: 'Marquee',
		signature: 'Signature showcase',
		story: 'Brand story',
		banners: 'Promotional banners',
		footer: 'Footer'
	};
</script>

<svelte:head><title>{title} · Kohee Studio</title></svelte:head>
<div class="s-heading">
	<div>
		<p class="s-eyebrow">KOHEE STUDIO / {data.area === 'overview' ? 'OVERVIEW' : data.area}</p>
		{#if data.id}<a
				class="s-link"
				style="display:inline-flex;gap:6px;align-items:center;font-size:.7rem;margin-bottom:12px"
				href={resolve('/admin/(studio)/[...path]', {
					path: `/admin/${data.area}`.replace(/^\/admin\/?/, '')
				})}><ArrowLeft size={14} />Kembali ke {data.area}</a
			>{/if}
		<h1>{title}</h1>
		<p>{descriptions[data.area]}</p>
	</div>
	{#if data.area === 'products' && !data.id}<a
			class="s-button primary"
			href={resolve('/admin/(studio)/[...path]', {
				path: '/admin/products/new'.replace(/^\/admin\/?/, '')
			})}><Plus size={17} />Add product</a
		>{:else if ['overview', 'analytics'].includes(data.area)}<form method="GET" class="s-period">
			<label
				>Periode<select
					name="days"
					value={String(data.stats?.days ?? 30)}
					onchange={(e) => e.currentTarget.form?.requestSubmit()}
					><option value="7">7 hari terakhir</option><option value="30">30 hari terakhir</option
					><option value="90">90 hari terakhir</option></select
				></label
			><noscript><button class="s-button" type="submit">Terapkan</button></noscript>
		</form>{/if}
</div>
{#if data.area === 'overview' || data.area === 'analytics'}
	{#if data.stats}<Dashboard
			stats={data.stats}
			overview={data.area === 'overview'}
			isAdmin={data.user.role === 'admin'}
		/>{/if}
{:else if data.area === 'products'}
	{#if data.id}{#key data.id}<ProductEditor
				product={data.product}
				categories={data.categoryList}
				assets={data.assets}
			/>{/key}
	{:else}<form class="s-toolbar" method="GET">
			<Search size={18} /><input
				type="search"
				name="q"
				value={data.filters.q ?? ''}
				placeholder="Cari produk…"
				aria-label="Cari produk"
			/><select name="status" value={data.filters.status ?? ''} aria-label="Filter status"
				><option value="">Semua status</option><option value="draft">Draft</option><option
					value="published">Published</option
				><option value="archived">Archived</option></select
			><select name="category" value={data.filters.category ?? ''} aria-label="Filter kategori"
				><option value="">Semua kategori</option>{#each data.categoryList as c (c.id)}<option
						value={c.id}>{c.name}</option
					>{/each}</select
			><select name="sort" value={data.filters.sort ?? 'order'} aria-label="Urutkan produk"
				><option value="order">Display order</option><option value="name">Nama A–Z</option><option
					value="price">Harga terendah</option
				><option value="newest">Terbaru</option></select
			><button class="s-button" type="submit">Terapkan</button>
		</form>
		{#if data.productList?.items.length}<section class="s-panel">
				<div class="s-table-wrap">
					<table class="s-table">
						<thead
							><tr
								><th>Product</th><th>Category</th><th>Price</th><th>Status</th><th>Availability</th
								><th>Actions</th></tr
							></thead
						><tbody
							>{#each data.productList.items as p (p.id)}<tr
									><td
										><a
											class="s-product-cell"
											href={resolve('/admin/(studio)/[...path]', {
												path: `/admin/products/${p.id}`.replace(/^\/admin\/?/, '')
											})}
											>{#if p.images[0]}<img src={p.images[0].url} alt="" />{/if}
											<div><strong>{p.name}</strong><small>{p.size} · {p.slug}</small></div></a
										></td
									><td>{p.category_name ?? '—'}</td><td>{formatRupiah(p.price)}</td><td
										><span class={`s-badge ${p.status}`}>{p.status}</span></td
									><td
										>{p.available ? 'Available' : 'Out of stock'}{#if p.stock !== null}<small
												class="s-muted"
												style="display:block">Stok: {p.stock}</small
											>{/if}</td
									><td
										><div class="s-actions">
											<a
												class="s-button"
												href={resolve('/admin/(studio)/[...path]', {
													path: `/admin/products/${p.id}`.replace(/^\/admin\/?/, '')
												})}>Edit <ArrowUpRight size={14} /></a
											><Confirm
												label="Arsipkan"
												description={`Arsipkan ${p.name}? Produk disembunyikan dari storefront.`}
												onconfirm={async () => {
													await mutate(`products/${p.id}`, 'DELETE');
												}}
											/>
										</div></td
									></tr
								>{/each}</tbody
						>
					</table>
				</div>
			</section>
			<Pagination
				total={data.productList.total}
				pageNumber={data.productList.page}
				limit={data.productList.limit}
			/>{:else}<div class="s-panel s-empty">
				<Package size={32} />
				<h2>Tidak ada produk ditemukan</h2>
				<p>Coba filter lain atau tambahkan produk baru.</p>
				<a
					href={resolve('/admin/(studio)/[...path]', {
						path: '/admin/products/new'.replace(/^\/admin\/?/, '')
					})}
					class="s-button primary"><Plus size={16} />Add product</a
				>
			</div>{/if}{/if}
{:else if data.area === 'categories'}<CategoryManager categories={data.categoryList} />
{:else if data.area === 'content'}
	{#if data.id}{#each data.content.filter((s) => s.id === data.id) as section (section.id)}{#key section.id}<ContentEditor
					{section}
					assets={data.assets}
					products={data.productChoices}
				/>{/key}{/each}
	{:else}<div class="s-section-list">
			{#each data.content as section (section.id)}<a
					href={resolve('/admin/(studio)/[...path]', {
						path: `/admin/content/${section.id}`.replace(/^\/admin\/?/, '')
					})}
					class="s-panel s-section-card"
					><PanelsTopLeft size={27} />
					<div>
						<h2>{contentLabels[section.id]}</h2>
						<p>Urutan {section.display_order} · Update {dateTime(section.updated_at)}</p>
						<span class="s-badge" class:published={!!section.published}
							>{section.published ? 'Published' : 'Unpublished'}</span
						>{#if JSON.stringify(section.draft) !== JSON.stringify(section.published)}<span
								class="s-badge draft"
								style="margin-left:6px">Draft changes</span
							>{/if}
					</div>
					<ArrowUpRight size={17} style="margin-left:auto" /></a
				>{/each}
		</div>{/if}
{:else if data.area === 'media'}<form class="s-toolbar" method="GET">
		<Search size={18} /><input
			type="search"
			name="q"
			value={data.filters.q ?? ''}
			placeholder="Cari nama file…"
			aria-label="Cari media"
		/><button type="submit" class="s-button">Cari media</button>
	</form>
	<MediaManager assets={data.assets} />
{:else if data.area === 'orders'}
	{#if data.order}{#key data.order.id}<OrderEditor order={data.order} />{/key}{:else}<form
			class="s-toolbar"
			method="GET"
		>
			<Search size={18} /><input
				type="search"
				name="q"
				value={data.filters.q ?? ''}
				placeholder="Cari nama atau ID checkout…"
				aria-label="Cari pesanan"
			/><select name="status" value={data.filters.status ?? ''} aria-label="Filter status pesanan"
				><option value="">Semua status</option>{#each orderStatuses as status (status)}<option
						value={status}>{statusLabels[status]}</option
					>{/each}</select
			><select name="sort" value={data.filters.sort ?? 'newest'} aria-label="Urutkan pesanan"
				><option value="newest">Terbaru</option><option value="oldest">Terlama</option><option
					value="total">Total tertinggi</option
				></select
			><button type="submit" class="s-button">Terapkan</button>
		</form>
		{#if data.orderList?.items.length}<section class="s-panel">
				<div class="s-table-wrap">
					<table class="s-table">
						<thead
							><tr
								><th>Checkout record</th><th>Customer</th><th>Total</th><th>Status</th><th
									>Created</th
								><th></th></tr
							></thead
						><tbody
							>{#each data.orderList.items as order (order.id)}<tr
									><td
										><a
											class="s-link s-code"
											href={resolve('/admin/(studio)/[...path]', {
												path: `/admin/orders/${order.id}`.replace(/^\/admin\/?/, '')
											})}>#{order.id.slice(0, 8)}</a
										></td
									><td>{order.customer_name}</td><td>{formatRupiah(order.total)}</td><td
										><span class={`s-badge ${order.status}`}>{statusLabels[order.status]}</span></td
									><td>{dateTime(order.created_at)}</td><td
										><a
											class="s-button"
											href={resolve('/admin/(studio)/[...path]', {
												path: `/admin/orders/${order.id}`.replace(/^\/admin\/?/, '')
											})}>Detail <ArrowUpRight size={14} /></a
										></td
									></tr
								>{/each}</tbody
						>
					</table>
				</div>
			</section>
			<Pagination
				total={data.orderList.total}
				pageNumber={data.orderList.page}
				limit={data.orderList.limit}
			/>{:else}<div class="s-panel s-empty">
				<ShoppingBag size={32} />
				<h2>Belum ada checkout sesuai filter</h2>
				<p>Checkout tercatat dari storefront akan muncul di sini sebagai Pending Confirmation.</p>
			</div>{/if}{/if}
{:else if data.area === 'settings'}{#if data.config}<SettingsEditor
			config={data.config}
			users={data.users}
		/>{/if}
{:else if data.area === 'activity'}<form class="s-toolbar" method="GET">
		<Search size={18} /><input
			name="q"
			type="search"
			placeholder="Cari tindakan: publish, update, login…"
			value={data.filters.q ?? ''}
			aria-label="Cari aktivitas"
		/><button type="submit" class="s-button">Cari aktivitas</button>
	</form>
	<section class="s-panel">
		<div class="s-table-wrap">
			<table class="s-table">
				<thead
					><tr><th>Waktu</th><th>Actor</th><th>Tindakan</th><th>Entitas</th><th>ID</th></tr></thead
				><tbody
					>{#each data.activity.slice(0, 50) as log (log.id)}<tr
							><td>{dateTime(log.created_at)}</td><td>{log.actor ?? 'System'}</td><td
								>{log.action}</td
							><td>{log.entity}</td><td class="s-code">{log.entity_id}</td></tr
						>{:else}<tr
							><td colspan="5" class="s-empty"
								><History size={28} />Belum ada aktivitas sesuai pencarian.</td
							></tr
						>{/each}</tbody
				>
			</table>
		</div>
	</section>
	<Pagination total={data.activityCount} pageNumber={data.activityPage} limit={50} />
{:else if data.area === 'profile'}<ProfileEditor user={data.user} />
{/if}
