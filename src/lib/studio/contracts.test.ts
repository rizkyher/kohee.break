import { describe, it, expect } from 'vitest';
import {
	productSchema,
	checkoutSchema,
	sectionSchemas,
	settingsSchema,
	allowedTransition
} from './contracts';
import { hashPassword, verifyPassword } from '../server/password';

describe('studio trust boundaries', () => {
	it('rejects invalid money, slugs and quantities', () => {
		expect(productSchema.safeParse({ name: 'Coffee', slug: '../evil', price: -1 }).success).toBe(
			false
		);
		expect(
			checkoutSchema.safeParse({
				name: 'A',
				items: [{ id: 'x', qty: 21 }],
				key: crypto.randomUUID()
			}).success
		).toBe(false);
	});
	it('rejects unsafe content links and malformed business numbers', () => {
		expect(
			sectionSchemas.hero.safeParse({
				headline: 'Hello',
				subheadline: 'World',
				ctaLabel: 'Go',
				ctaUrl: 'javascript:alert(1)',
				featuredProduct: '',
				imageId: '',
				visible: true
			}).success
		).toBe(false);
		expect(settingsSchema.safeParse({ whatsappNumber: '0812345' }).success).toBe(false);
	});
	it('requires confirmation before preparation and prevents reopening completed orders', () => {
		expect(allowedTransition('pending', 'preparing')).toBe(false);
		expect(allowedTransition('pending', 'confirmed')).toBe(true);
		expect(allowedTransition('completed', 'pending')).toBe(false);
	});
	it('uses salted passwords and rejects mismatches', async () => {
		const first = await hashPassword('A long test password 123');
		const second = await hashPassword('A long test password 123');
		expect(first).not.toBe(second);
		expect(await verifyPassword('A long test password 123', first)).toBe(true);
		expect(await verifyPassword('wrong', first)).toBe(false);
		expect(await verifyPassword('anything', 'malformed')).toBe(false);
	});
});
