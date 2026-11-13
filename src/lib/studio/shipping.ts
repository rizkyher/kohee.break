import { z } from 'zod';
export const coordinates = z.object({
	lat: z.number().finite().min(-90).max(90),
	lng: z.number().finite().min(-180).max(180)
});
const money = z.number().int().min(0).max(100000000);
export const deliverySchema = z
	.object({
		originName: z.string().trim().min(1).max(120),
		originAddress: z.string().trim().max(500),
		origin: coordinates.nullable(),
		enabled: z.boolean(),
		freeEnabled: z.boolean(),
		freeRadiusKm: z.number().min(0).max(1000),
		rate: money,
		baseFee: money,
		maxDistanceKm: z.number().positive().max(1000).nullable(),
		rounding: z.enum(['exact', 'ceil', 'ceil-tenth']),
		feeIncrement: z.number().int().min(1).max(100000),
		minFee: money,
		maxFee: money.nullable(),
		freeMinimum: money.nullable(),
		model: z.enum(['excess', 'full']),
		manualFallback: z.boolean()
	})
	.refine((v) => !v.enabled || (!!v.origin && !!v.originAddress), {
		message: 'Alamat dan koordinat toko wajib diisi sebelum mengaktifkan delivery.'
	})
	.refine((v) => v.maxFee === null || v.maxFee >= v.minFee, {
		message: 'Batas maksimum ongkir harus >= minimum.'
	});
export type DeliverySettings = z.infer<typeof deliverySchema>;
export const defaultDelivery: DeliverySettings = {
	originName: 'Kohee Break',
	originAddress: '',
	origin: null,
	enabled: false,
	freeEnabled: true,
	freeRadiusKm: 2,
	rate: 3000,
	baseFee: 0,
	maxDistanceKm: null,
	rounding: 'ceil',
	feeIncrement: 100,
	minFee: 0,
	maxFee: null,
	freeMinimum: null,
	model: 'excess',
	manualFallback: false
};
export const destinationSchema = z.object({
	address: z.string().trim().min(5).max(500),
	point: coordinates,
	details: z.string().trim().max(300).default(''),
	phone: z
		.string()
		.trim()
		.max(30)
		.regex(/^[+0-9 ()-]*$/)
		.default('')
});
export type Destination = z.infer<typeof destinationSchema>;
export interface ShippingQuote {
	id: string;
	fee: number | null;
	distance: number | null;
	expires: number;
	status: 'quoted' | 'manual';
	polyline: string;
	address: string;
	destination: { lat: number; lng: number };
	origin: { lat: number; lng: number };
}
export function calculateShipping(config: DeliverySettings, meters: number, subtotal: number) {
	if (!Number.isFinite(meters) || meters < 0 || !Number.isSafeInteger(subtotal) || subtotal < 0)
		throw new Error('Jarak atau subtotal tidak valid.');
	const km = meters / 1000;
	if (config.maxDistanceKm !== null && km > config.maxDistanceKm)
		return { eligible: false, chargeableKm: 0, baseFee: 0, distanceFee: 0, fee: null };
	if (
		(config.freeEnabled && km <= config.freeRadiusKm) ||
		(config.freeMinimum !== null && subtotal >= config.freeMinimum)
	)
		return { eligible: true, chargeableKm: 0, baseFee: 0, distanceFee: 0, fee: 0 };
	let charge =
		config.model === 'excess'
			? Math.max(0, km - (config.freeEnabled ? config.freeRadiusKm : 0))
			: km;
	charge =
		config.rounding === 'ceil'
			? Math.ceil(charge)
			: config.rounding === 'ceil-tenth'
				? Math.ceil(charge * 10) / 10
				: charge;
	const distanceFee = Math.ceil((Math.round(charge * 1000) * config.rate) / 1000),
		raw = Math.max(config.minFee, config.baseFee + distanceFee);
	let fee = Math.ceil(raw / config.feeIncrement) * config.feeIncrement;
	if (config.maxFee !== null) fee = Math.min(fee, config.maxFee);
	return { eligible: true, chargeableKm: charge, baseFee: config.baseFee, distanceFee, fee };
}
