<script lang="ts">
	import { AtSign, MessageCircle } from '@lucide/svelte';
	import Mascot from './Mascot.svelte';
	import { brand } from '#lib/brand.ts';
	import { ui } from '#lib/cart.svelte.ts';

	import { useStorefront } from '#lib/storefront.ts';
	const store = useStorefront();
	const footer = $derived(store().content.footer);
	const settings = $derived(store().settings);
	const whatsapp = $derived(
		settings.whatsappNumber ? `https://wa.me/${settings.whatsappNumber}` : undefined
	);
	const instagram = $derived(footer.instagram || settings.instagram);
	const year = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="cq mx-auto max-w-[90rem] px-4 md:px-8">
		<div class="top">
			<div class="brandmark">
				<Mascot class="h-16 w-auto text-mascot" />
				<div>
					<p class="display text-3xl">{settings.storeName}</p>
					<p class="accent mt-1 text-sm tracking-[0.14em] text-red">{footer.description}</p>
				</div>
			</div>

			<nav aria-label="Navigasi footer">
				<ul class="links">
					<li><a href="#top">Home</a></li>
					<li><a href="#menu">Menu</a></li>
					<li><a href="#story">Our Story</a></li>
					<li><button type="button" onclick={() => (ui.cartOpen = true)}>Keranjang</button></li>
				</ul>
			</nav>

			{#if whatsapp || instagram || footer.socialLinks.length}
				<ul class="contact" aria-label="Kontak">
					{#if whatsapp}
						<li>
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external wa.me link -->
							<a href={whatsapp} target="_blank" rel="noopener noreferrer">
								<MessageCircle size={18} strokeWidth={2.25} aria-hidden="true" />
								WhatsApp +{settings.whatsappNumber}
							</a>
						</li>
					{/if}
					{#if instagram}
						<li>
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external Instagram link -->
							<a href={instagram} target="_blank" rel="noopener noreferrer">
								<AtSign size={18} strokeWidth={2.25} aria-hidden="true" />
								Instagram @{instagram.split('/').filter(Boolean).at(-1)}
							</a>
						</li>
					{/if}
					{#each footer.socialLinks as link, i (i)}<li>
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- CMS social URL validated by safeLink on the server -->
							<a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>
						</li>{/each}
				</ul>
			{/if}
		</div>
		{#if footer.contact || settings.contact}<p style="margin-top:2rem;white-space:pre-line">
				{footer.contact || settings.contact}
			</p>{/if}

		{#if settings.storeInfo}<p style="margin-top:1rem;white-space:pre-line">
				{settings.storeInfo}
			</p>{/if}
		<p class="wordmark display" aria-hidden="true">{settings.storeName}</p>

		<div class="bottom">
			<p>© {year} {settings.storeName}</p>
			<p lang="ja">{brand.katakana}</p>
		</div>
	</div>
</footer>

<style>
	.footer {
		padding-block: 3.5rem 7rem;
		overflow: clip;
	}

	.top {
		display: grid;
		gap: 2.5rem;
	}

	.brandmark {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.links,
	.contact {
		display: grid;
		gap: 0.25rem;
	}

	.links a,
	.links button,
	.contact a {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 2.75rem;
		font-family: var(--font-accent);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		cursor: pointer;
	}

	.links a:hover,
	.links button:hover,
	.contact a:hover {
		color: var(--color-red);
	}

	.wordmark {
		margin-top: 3rem;
		font-size: calc(100cqi / 4.78); /* "KOHEE BREAK" is 4.73em wide in Anton */
		line-height: 0.8;
		color: var(--color-red);
		white-space: nowrap;
	}

	.bottom {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 2px solid var(--color-ink);
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	@media (min-width: 64rem) {
		.footer {
			padding-bottom: 2.5rem;
		}

		.top {
			grid-template-columns: 5fr 3fr 4fr;
			align-items: start;
		}
	}
</style>
