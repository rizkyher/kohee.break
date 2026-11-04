// Pure cart + WhatsApp order logic. No Svelte, no browser APIs, so it can be unit tested.

// ponytail: per-item cap guards against fat-finger orders; bigger orders get arranged in the chat.
export const MAX_QTY = 20;

export interface CartLine {
	id: string;
	qty: number;
}

export interface PriceInfo {
	id: string;
	name: string;
	price: number;
	available: boolean;
}

export interface PricedLine<P extends PriceInfo = PriceInfo> {
	product: P;
	qty: number;
	subtotal: number;
}

export type OrderProblem = 'empty-cart' | 'missing-name' | 'unavailable-item' | 'missing-number';

const rupiah = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export function formatRupiah(amount: number): string {
	return `Rp${rupiah.format(amount)}`;
}

function clampQty(qty: number): number {
	return Math.min(MAX_QTY, Math.max(0, Math.floor(qty)));
}

export function setQty(lines: readonly CartLine[], id: string, qty: number): CartLine[] {
	const next = clampQty(qty);
	if (next === 0) return lines.filter((line) => line.id !== id);
	if (!lines.some((line) => line.id === id)) return [...lines, { id, qty: next }];
	return lines.map((line) => (line.id === id ? { id, qty: next } : line));
}

export function addLine(lines: readonly CartLine[], id: string, qty = 1): CartLine[] {
	const current = lines.find((line) => line.id === id)?.qty ?? 0;
	return setQty(lines, id, current + qty);
}

/** localStorage is user-editable, so treat it as untrusted input. */
export function parseStoredCart(raw: string | null, knownIds: ReadonlySet<string>): CartLine[] {
	if (!raw) return [];
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		return [];
	}
	if (!Array.isArray(data)) return [];

	let lines: CartLine[] = [];
	for (const item of data) {
		if (typeof item !== 'object' || item === null) continue;
		const { id, qty } = item as Record<string, unknown>;
		if (typeof id !== 'string' || !knownIds.has(id)) continue;
		if (typeof qty !== 'number' || !Number.isFinite(qty) || qty < 1) continue;
		lines = addLine(lines, id, qty);
	}
	return lines;
}

/** Prices always come from the catalog; the cart only stores ids and quantities. */
export function priceLines<P extends PriceInfo>(
	lines: readonly CartLine[],
	products: readonly P[]
): PricedLine<P>[] {
	return lines.flatMap((line) => {
		const product = products.find((p) => p.id === line.id);
		return product ? [{ product, qty: line.qty, subtotal: product.price * line.qty }] : [];
	});
}

export function cartTotal(lines: readonly PricedLine[]): number {
	return lines.reduce((sum, line) => sum + line.subtotal, 0);
}

export function cartCount(lines: readonly CartLine[]): number {
	return lines.reduce((sum, line) => sum + line.qty, 0);
}

/** Digits only, international format (country code first). Returns null when unusable. */
export function normalizeWhatsAppNumber(raw: string): string | null {
	const digits = raw.replace(/[\s()+.-]/g, '');
	return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function orderProblems(order: {
	lines: readonly PricedLine[];
	name: string;
	whatsappNumber: string | undefined;
}): OrderProblem[] {
	const problems: OrderProblem[] = [];
	if (order.lines.length === 0) problems.push('empty-cart');
	if (!order.name.trim()) problems.push('missing-name');
	if (order.lines.some((line) => !line.product.available)) problems.push('unavailable-item');
	if (!order.whatsappNumber) problems.push('missing-number');
	return problems;
}

export function buildOrderMessage(order: {
	lines: readonly PricedLine[];
	name: string;
	note?: string;
	fulfillment?: string;
}): string {
	const items = order.lines.map(
		(line, i) =>
			`${i + 1}. ${line.product.name} — ${line.qty} × ${formatRupiah(line.product.price)} = ${formatRupiah(line.subtotal)}`
	);
	const details = [`Nama: ${order.name.trim()}`];
	if (order.fulfillment) details.push(`Pengambilan: ${order.fulfillment}`);
	const note = order.note?.trim();
	if (note) details.push(`Catatan: ${note}`);

	return [
		'Halo Kohee Break! Aku mau pesan:',
		'',
		...items,
		'',
		`Total: ${formatRupiah(cartTotal(order.lines))}`,
		'',
		...details,
		'',
		'Mohon konfirmasi pesanan dan ketersediaannya. Terima kasih!'
	].join('\n');
}

export function whatsappUrl(number: string, message: string): string {
	return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
