import type { Destination } from './shipping';
// Geographic dataset bounds, not a store origin or delivery eligibility rule.
export const searchBounds = [107.25, -7.3, 108.05, -6.55] as const;
export interface AddressResult {
	id: string;
	label: string;
	point: Destination['point'];
}
