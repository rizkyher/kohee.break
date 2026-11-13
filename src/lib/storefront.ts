import { getContext } from 'svelte';
import type { Product } from '#lib/products.ts';
import type { Sections, Settings, SectionKey } from '#lib/studio/contracts.ts';
export interface Storefront {
	products: Product[];
	categories: { value: string; label: string }[];
	content: Sections;
	order: SectionKey[];
	settings: Settings;
	media: Record<string, string>;
}
export const STOREFRONT = Symbol('kohee-storefront');
export function useStorefront() {
	return getContext<() => Storefront>(STOREFRONT);
}
