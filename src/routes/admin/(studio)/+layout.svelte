<script lang="ts">
	import { page, navigating } from '$app/state';
	import { resolve } from '$app/paths';
	import {
		LayoutDashboard,
		Package,
		Tags,
		PanelsTopLeft,
		Image,
		ShoppingBag,
		ChartNoAxesCombined,
		Settings,
		History,
		User,
		ExternalLink,
		PanelLeftClose,
		Menu,
		LogOut,
		X
	} from '@lucide/svelte';
	import Mascot from '#lib/components/Mascot.svelte';
	import type { LayoutProps } from './$types';
	import '#lib/studio/studio.css';
	import Skeleton from '#lib/components/studio/Skeleton.svelte';
	let { data, children }: LayoutProps = $props();
	let collapsed = $state(false),
		mobile = $state(false);
	const links = [
		{ path: '/admin/delivery', label: 'Delivery & Shipping', icon: ShoppingBag, admin: true },
		{ path: '/admin', label: 'Overview', icon: LayoutDashboard },
		{ path: '/admin/products', label: 'Products', icon: Package },
		{ path: '/admin/categories', label: 'Categories', icon: Tags },
		{ path: '/admin/content', label: 'Website Content', icon: PanelsTopLeft },
		{ path: '/admin/media', label: 'Media Library', icon: Image },
		{ path: '/admin/orders', label: 'Orders', icon: ShoppingBag, admin: true },
		{ path: '/admin/analytics', label: 'Analytics', icon: ChartNoAxesCombined, admin: true },
		{ path: '/admin/settings', label: 'Settings', icon: Settings, admin: true },
		{ path: '/admin/activity', label: 'Activity Log', icon: History, admin: true },
		{ path: '/admin/profile', label: 'My Profile', icon: User }
	];
	const active = $derived(
		links.find((l) =>
			l.path === '/admin' ? page.url.pathname === '/admin' : page.url.pathname.startsWith(l.path)
		)
	);
</script>

<svelte:head><meta name="robots" content="noindex,nofollow" /></svelte:head>
<div class="studio-shell" class:collapsed class:mobile-open={mobile}>
	{#if mobile}<button
			type="button"
			class="studio-scrim"
			aria-label="Tutup navigasi"
			onclick={() => (mobile = false)}
		></button>{/if}
	<aside class="studio-sidebar" aria-label="Navigasi Kohee Studio">
		<a
			href={resolve('/admin/(studio)/[...path]', { path: '/admin'.replace(/^\/admin\/?/, '') })}
			class="studio-logo"
			aria-label="Kohee Studio"
			><Mascot class="studio-mascot" /><span
				>KOHEE <b>STUDIO</b><small>BRAND COMMAND CENTER</small></span
			></a
		>
		<button
			class="s-button mobile-close"
			type="button"
			aria-label="Tutup navigasi"
			onclick={() => (mobile = false)}><X size={20} /></button
		>
		<p class="s-eyebrow sidebar-caption">WORKSPACE</p>
		<nav>
			{#each links.filter((l) => !l.admin || data.user.role === 'admin') as link (link.path)}<a
					href={resolve('/admin/(studio)/[...path]', {
						path: link.path.replace(/^\/admin\/?/, '')
					})}
					onclick={() => (mobile = false)}
					class:active={active?.path === link.path}
					aria-current={active?.path === link.path ? 'page' : undefined}
					title={collapsed ? link.label : undefined}
					><link.icon size={19} strokeWidth={1.8} /><span>{link.label}</span
					>{#if active?.path === link.path}<span class="nav-marker"></span>{/if}</a
				>{/each}
		</nav>
		<div class="sidebar-bottom">
			<a href={resolve('/')} target="_blank" rel="noopener" class="website-link"
				><ExternalLink size={18} /><span>View Website</span></a
			>
			<div class="studio-user">
				<span class="avatar">{data.user.name.slice(0, 1)}</span><span
					>{data.user.name}<small>{data.user.role === 'admin' ? 'Administrator' : 'Editor'}</small
					></span
				>
				<form
					method="POST"
					action={resolve('/admin/(studio)/[...path]', {
						path: '/admin/logout'.replace(/^\/admin\/?/, '')
					})}
				>
					<button type="submit" aria-label="Logout" title="Logout"><LogOut size={18} /></button>
				</form>
			</div>
		</div>
	</aside>
	<div class="studio-workspace">
		<header class="studio-topbar">
			<button
				type="button"
				class="s-button"
				aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
				onclick={() => {
					if (matchMedia('(max-width: 800px)').matches) mobile = !mobile;
					else collapsed = !collapsed;
				}}
				><Menu class="mobile-menu" size={19} /><PanelLeftClose
					class="desktop-menu"
					size={19}
				/></button
			>
			<p><span>Workspace</span><span class="breadcrumb">/</span>{active?.label ?? 'Studio'}</p>
			<a href={resolve('/')} target="_blank" rel="noopener" class="s-button top-website"
				>View website <ExternalLink size={14} /></a
			>
		</header>
		{#if navigating.to}<div
				class="studio-progress"
				role="progressbar"
				aria-label="Memuat halaman"
			></div>{/if}
		<main class="studio-main" id="studio-main" aria-busy={!!navigating.to}>
			{#if navigating.to}<Skeleton />{:else}{@render children()}{/if}
		</main>
		<footer class="studio-foot">
			<span>KOHEE STUDIO</span><span>Small breaks. Thoughtful work.</span>
		</footer>
	</div>
</div>
