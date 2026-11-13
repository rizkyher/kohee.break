import type { PriceInfo } from '#lib/order.ts';
/** Published catalog data is loaded server-side from D1. No module-level catalog state. */
export type Category = string;
export interface Product extends PriceInfo {
	slug: string;
	category: Category;
	kind: string;
	description: string;
	size: string;
	image: string;
	images: { url: string; alt: string }[];
	badge?: string;
}
