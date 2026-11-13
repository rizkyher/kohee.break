import type { PageServerLoad } from './$types';
import { database } from '#lib/server/db.ts';
import {
	listProducts,
	categories,
	publishedSections,
	settings,
	publishedMedia
} from '#lib/server/catalog.ts';
import type { Storefront } from '#lib/storefront.ts';
export const load: PageServerLoad = async () => {
	const db = database();
	const [catalog, cats, sections, config] = await Promise.all([
		listProducts(db, { published: true, all: true }),
		categories(db),
		publishedSections(db),
		settings(db)
	]);
	const store: Storefront = {
		products: catalog.items.map((p) => ({
			id: p.id,
			name: p.name,
			slug: p.slug,
			category: p.category_id ?? 'other',
			kind: p.short_description,
			description: p.description,
			price: p.price,
			size: p.size,
			available: p.available,
			image: p.images[0]?.url ?? '/products/bottle-latte.png',
			images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
			badge: p.featured ? 'Signature' : undefined
		})),
		categories: [
			{ value: 'all', label: 'All' },
			...cats
				.filter((c) => catalog.items.some((p) => p.category_id === c.id))
				.map((c) => ({ value: c.id, label: c.name }))
		],
		content: sections.content,
		order: sections.order,
		settings: config,
		media: await publishedMedia(db, sections.content)
	};
	return { store };
};
