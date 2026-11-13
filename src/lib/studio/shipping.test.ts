import { it, expect } from 'vitest';
import { calculateShipping, defaultDelivery, deliverySchema } from './shipping';
it('prices free boundaries, excess/full distance, decimals and maximum range', () => {
	const c = { ...defaultDelivery, maxDistanceKm: 10 };
	expect(calculateShipping(c, 2000, 20000).fee).toBe(0);
	expect(calculateShipping(c, 0, 20000).fee).toBe(0);
	expect(calculateShipping(c, 2001, 20000).fee).toBe(3000);
	expect(calculateShipping(c, 4300, 20000).fee).toBe(9000);
	expect(calculateShipping({ ...c, model: 'full' }, 4300, 20000).fee).toBe(15000);
	expect(calculateShipping({ ...c, rounding: 'exact' }, 4300, 20000).fee).toBe(6900);
	expect(calculateShipping(c, 10001, 20000).eligible).toBe(false);
	expect(calculateShipping({ ...c, freeMinimum: 10000 }, 4000, 20000).fee).toBe(0);
});
it('allows any routed road distance when no maximum is configured', () => {
	const config = { ...defaultDelivery, maxDistanceKm: null };
	expect(deliverySchema.safeParse(config).success).toBe(true);
	expect(calculateShipping(config, 15000, 20000)).toMatchObject({ eligible: true, fee: 39000 });
	expect(calculateShipping(config, 250000, 20000)).toMatchObject({ eligible: true, fee: 744000 });
	expect(calculateShipping(config, 2000, 20000).fee).toBe(0);
	expect(calculateShipping({ ...config, maxDistanceKm: 10 }, 15000, 20000).eligible).toBe(false);
});
