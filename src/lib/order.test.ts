import { describe, expect, it } from 'vitest';
import {
	MAX_QTY,
	addLine,
	buildOrderMessage,
	formatRupiah,
	normalizeWhatsAppNumber,
	orderProblems,
	parseStoredCart,
	priceLines,
	setQty,
	whatsappUrl
} from './order.ts';

const menu = [
	{ id: 'kuro-aren', name: 'Kuro Aren', price: 20000, available: true },
	{ id: 'chocori', name: 'Chocori', price: 25000, available: true },
	{ id: 'amai-scotch', name: 'Amai Scotch', price: 25000, available: false }
];

describe('formatRupiah', () => {
	it('formats without a space, using dots for thousands', () => {
		expect(formatRupiah(20000)).toBe('Rp20.000');
		expect(formatRupiah(1250000)).toBe('Rp1.250.000');
	});
});

describe('cart lines', () => {
	it('adds a new line, then merges quantity for the same product', () => {
		const once = addLine([], 'kuro-aren', 1);
		const twice = addLine(once, 'kuro-aren', 2);
		expect(once).toEqual([{ id: 'kuro-aren', qty: 1 }]);
		expect(twice).toEqual([{ id: 'kuro-aren', qty: 3 }]);
	});

	it('never goes above MAX_QTY', () => {
		expect(addLine([{ id: 'chocori', qty: MAX_QTY - 1 }], 'chocori', 5)).toEqual([
			{ id: 'chocori', qty: MAX_QTY }
		]);
	});

	it('removes a line when quantity is set to zero', () => {
		expect(setQty([{ id: 'chocori', qty: 2 }], 'chocori', 0)).toEqual([]);
	});

	it('does not mutate the input array', () => {
		const lines = [{ id: 'chocori', qty: 1 }];
		addLine(lines, 'chocori', 1);
		expect(lines).toEqual([{ id: 'chocori', qty: 1 }]);
	});
});

describe('parseStoredCart', () => {
	const known = new Set(menu.map((p) => p.id));

	it('keeps valid lines and drops unknown ids, bad quantities and junk', () => {
		const raw = JSON.stringify([
			{ id: 'kuro-aren', qty: 2 },
			{ id: 'ghost', qty: 1 },
			{ id: 'chocori', qty: -3 },
			{ id: 'amai-scotch', qty: 999 },
			'nope'
		]);
		expect(parseStoredCart(raw, known)).toEqual([
			{ id: 'kuro-aren', qty: 2 },
			{ id: 'amai-scotch', qty: MAX_QTY }
		]);
	});

	it('returns an empty cart for missing or corrupt storage', () => {
		expect(parseStoredCart(null, known)).toEqual([]);
		expect(parseStoredCart('{not json', known)).toEqual([]);
		expect(parseStoredCart('{"id":"kuro-aren"}', known)).toEqual([]);
	});
});

describe('WhatsApp number', () => {
	it('accepts international digits and strips formatting', () => {
		expect(normalizeWhatsAppNumber('+62 812-3456-7890')).toBe('6281234567890');
	});

	it('rejects local format and garbage', () => {
		expect(normalizeWhatsAppNumber('081234567890')).toBeNull();
		expect(normalizeWhatsAppNumber('62abc')).toBeNull();
		expect(normalizeWhatsAppNumber('')).toBeNull();
	});
});

describe('order message', () => {
	const priced = priceLines(
		[
			{ id: 'kuro-aren', qty: 2 },
			{ id: 'chocori', qty: 1 }
		],
		menu
	);

	it('prices lines from the catalog, not from storage', () => {
		expect(priced.map((l) => l.subtotal)).toEqual([40000, 25000]);
	});

	it('matches the agreed WhatsApp format', () => {
		const message = buildOrderMessage({ lines: priced, name: '  Rizky ', note: 'Less sweet' });
		expect(message).toBe(
			[
				'Halo Kohee Break! Aku mau pesan:',
				'',
				'1. Kuro Aren — 2 × Rp20.000 = Rp40.000',
				'2. Chocori — 1 × Rp25.000 = Rp25.000',
				'',
				'Total: Rp65.000',
				'',
				'Nama: Rizky',
				'Catatan: Less sweet',
				'',
				'Mohon konfirmasi pesanan dan ketersediaannya. Terima kasih!'
			].join('\n')
		);
	});

	it('leaves out an empty note and adds fulfillment only when chosen', () => {
		const message = buildOrderMessage({
			lines: priced,
			name: 'Rizky',
			note: '   ',
			fulfillment: 'Ambil sendiri'
		});
		expect(message).not.toContain('Catatan');
		expect(message).toContain('Nama: Rizky\nPengambilan: Ambil sendiri');
	});

	it('encodes the message into a wa.me link', () => {
		expect(whatsappUrl('6281234567890', 'Halo & 1 × 2')).toBe(
			'https://wa.me/6281234567890?text=Halo%20%26%201%20%C3%97%202'
		);
	});
});

describe('orderProblems', () => {
	const ok = priceLines([{ id: 'kuro-aren', qty: 1 }], menu);

	it('is empty for a complete order', () => {
		expect(orderProblems({ lines: ok, name: 'Rizky', whatsappNumber: '6281234567890' })).toEqual(
			[]
		);
	});

	it('flags an empty cart, missing name, sold-out item and missing number', () => {
		const soldOut = priceLines([{ id: 'amai-scotch', qty: 1 }], menu);
		expect(orderProblems({ lines: [], name: 'Rizky', whatsappNumber: '62812345678' })).toEqual([
			'empty-cart'
		]);
		expect(orderProblems({ lines: ok, name: '  ', whatsappNumber: '62812345678' })).toEqual([
			'missing-name'
		]);
		expect(orderProblems({ lines: soldOut, name: 'A', whatsappNumber: undefined })).toEqual([
			'unavailable-item',
			'missing-number'
		]);
	});
});
