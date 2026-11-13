<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { ArrowUpRight, Eye, EyeOff } from '@lucide/svelte';
	import Mascot from '#lib/components/Mascot.svelte';
	import '#lib/studio/studio.css';
	import type { PageProps } from './$types';
	let { form }: PageProps = $props();
	let busy = $state(false),
		show = $state(false);
</script>

<svelte:head
	><title>Login · Kohee Studio</title><meta name="robots" content="noindex,nofollow" /></svelte:head
>
<main class="studio-login">
	<section class="login-art on-red">
		<div class="daruma"></div>
		<p class="s-eyebrow">KOHEE BREAK / THE WORKSPACE</p>
		<Mascot class="login-cat" />
		<h1>Good things.<br />Behind the scenes.</h1>
		<p>Satu tempat untuk merawat setiap detail Kohee Break.</p>
		<span class="login-katakana" lang="ja">コーヒーブレイク</span>
	</section>
	<section class="login-form">
		<a href={resolve('/')} class="login-back">Kembali ke website <ArrowUpRight size={17} /></a>
		<div>
			<p class="s-eyebrow">BRAND COMMAND CENTER</p>
			<h2>Welcome to<br /><span>Kohee Studio.</span></h2>
			<p class="s-muted">Masuk untuk mengelola menu, cerita, dan pesanan.</p>
			<form
				method="POST"
				use:enhance={() => {
					busy = true;
					return async ({ update }) => {
						await update();
						busy = false;
					};
				}}
			>
				<label
					>Email<input
						type="email"
						name="email"
						autocomplete="username"
						value="kohiibreak@gmail.com"
						required
						maxlength="254"
					/></label
				>
				<label
					>Password
					<div class="password-field">
						<input
							type={show ? 'text' : 'password'}
							name="password"
							autocomplete="current-password"
							required
							maxlength="256"
						/><button
							type="button"
							aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
							onclick={() => (show = !show)}
							>{#if show}<EyeOff size={18} />{:else}<Eye size={18} />{/if}</button
						>
					</div></label
				>
				{#if form?.message}<p class="s-error" role="alert">{form.message}</p>{/if}<button
					type="submit"
					class="s-button primary"
					disabled={busy}
					>{busy ? 'Memeriksa…' : 'Masuk ke Studio'}<ArrowUpRight size={17} /></button
				>
			</form>
			<p class="login-note">
				Akses khusus tim Kohee Break. Hubungi admin jika kamu membutuhkan akses.
			</p>
		</div>
		<p class="s-eyebrow login-bottom">BREAK TIME, KOHEE TIME</p>
	</section>
</main>
