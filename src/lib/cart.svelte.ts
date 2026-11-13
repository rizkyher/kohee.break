import {
	addLine,
	cartCount,
	cartTotal,
	parseStoredCart,
	priceLines,
	setQty,
	type CartLine
} from '#lib/order.ts';
import type { Product } from '#lib/products.ts';
import { track } from '#lib/tracking.ts';

const STORAGE_KEY = 'kohee-break:cart:v1';

class Cart {
	catalog = $state<Product[]>([]);
	configure(products: Product[]) {
		this.catalog = products;
	}
	lines = $state<CartLine[]>([]);
	/** Bumped on every add so the badge and mascot can replay their reaction. */
	bumps = $state(0);
	lastAdded = $state<string | undefined>();
	/** False when the browser blocks storage (private mode, in-app browsers). */
	persistent = $state(true);

	priced = $derived(priceLines(this.lines, this.catalog));
	count = $derived(cartCount(this.lines));
	total = $derived(cartTotal(this.priced));

	/** Called once on mount; never during SSR, so the prerendered HTML stays an empty cart. */
	load() {
		try {
			this.lines = parseStoredCart(
				localStorage.getItem(STORAGE_KEY),
				new Set(this.catalog.map((p) => p.id))
			);
		} catch {
			this.persistent = false;
		}
	}

	add(id: string, qty = 1) {
		const product = this.catalog.find((p) => p.id === id);
		if (!product?.available) return;
		const next = addLine(this.lines, id, qty);
		if (cartCount(next) === this.count) return;
		this.#save(next);
		track('add_to_cart', id);
		this.bumps += 1;
		this.lastAdded = product.name;
	}

	set(id: string, qty: number) {
		this.#save(setQty(this.lines, id, qty));
	}

	remove(id: string) {
		this.#save(setQty(this.lines, id, 0));
	}

	clear() {
		this.#save([]);
	}

	qtyOf(id: string) {
		return this.lines.find((line) => line.id === id)?.qty ?? 0;
	}

	#save(lines: CartLine[]) {
		this.lines = lines;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
			this.persistent = true;
		} catch {
			this.persistent = false;
		}
	}
}

export const cart = new Cart();

/** Which overlay is open. One at a time keeps focus handling simple. */
export const ui = $state<{ productId: string | null; cartOpen: boolean }>({
	productId: null,
	cartOpen: false
});
