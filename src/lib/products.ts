import type { Picture } from 'vite-imagetools';
import latte from '#lib/assets/bottle-latte.png?enhanced';
import chocori from '#lib/assets/bottle-chocori.png?enhanced';
import type { PriceInfo } from '#lib/order.ts';

export type Category = 'coffee' | 'non-coffee';

export interface Product extends PriceInfo {
	category: Category;
	/** Short English descriptor, as printed on the menu poster. */
	kind: string;
	description: string;
	size: string;
	image: Picture;
	/** Only set when the brand itself states it (Kuro Aren is "Our Signature" on the poster). */
	badge?: string;
}

export const categories: { value: Category | 'all'; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'coffee', label: 'Coffee' },
	{ value: 'non-coffee', label: 'Non Coffee' }
];

// Copy comes from the brand's own menu posters. All coffee variants share one bottle photo
// because the packaging is identical; see README "Asset needs".
export const products: Product[] = [
	{
		id: 'kuro-aren',
		name: 'Kuro Aren',
		category: 'coffee',
		kind: 'Brown sugar latte',
		description: 'Kopi yang kuat, susu yang dicampur, dan rasa manis yang mendalam dari gula aren.',
		price: 20000,
		size: '250ml',
		image: latte,
		available: true,
		badge: 'Signature'
	},
	{
		id: 'amai-scotch',
		name: 'Amai Scotch',
		category: 'coffee',
		kind: 'Butterscotch latte',
		description: 'Kopi yang lembut, susu yang halus, serta sentuhan rasa mentega.',
		price: 25000,
		size: '250ml',
		image: latte,
		available: true
	},
	{
		id: 'kuro-latte',
		name: 'Kuro Latte',
		category: 'coffee',
		kind: 'Cafe latte',
		description: 'Espresso yang pekat berpadu dengan susu yang lembut.',
		price: 18000,
		size: '250ml',
		image: latte,
		available: true
	},
	{
		id: 'chocori',
		name: 'Chocori',
		category: 'non-coffee',
		kind: 'Chocolate cheesecake drink',
		description: 'Cokelat dan keju dalam satu botol. Two flavour, one perfect taste.',
		price: 25000,
		size: '250ml',
		image: chocori,
		available: true
	}
];

export const signature = products.find((p) => p.badge === 'Signature') ?? products[0];

export function productById(id: string | null): Product | undefined {
	return products.find((p) => p.id === id);
}
