import { destinationSchema } from './shipping';
import { z } from 'zod';

export const slug = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Gunakan huruf kecil, angka, dan tanda hubung.');
const text = (max: number) => z.string().trim().max(max);
const money = z.number().int().min(0).max(100_000_000);
const mediaId = text(100);
export const safeLink = z
	.string()
	.trim()
	.max(500)
	.refine(
		(v) =>
			v === '' ||
			/^#[a-zA-Z][\w-]*$/.test(v) ||
			/^\/(?!\/)[\w/?.=&%#-]*$/.test(v) ||
			(() => {
				try {
					const u = new URL(v);
					return u.protocol === 'https:' && !u.username && !u.password;
				} catch {
					return false;
				}
			})(),
		'Gunakan URL HTTPS, path lokal, atau anchor.'
	);
export const productSchema = z
	.object({
		name: text(120).min(1),
		slug,
		category_id: text(100).nullable(),
		short_description: text(200),
		description: text(4000),
		price: money,
		comparison_price: money.nullable(),
		size: text(60).min(1),
		available: z.boolean(),
		stock: z.number().int().min(0).max(1_000_000).nullable(),
		featured: z.boolean(),
		display_order: z.number().int().min(0).max(10000),
		status: z.enum(['draft', 'published', 'archived']),
		seo_title: text(160),
		seo_description: text(320),
		image_ids: z.array(mediaId.min(1)).max(10)
	})
	.refine((p) => p.comparison_price === null || p.comparison_price > p.price, {
		path: ['comparison_price'],
		message: 'Harga pembanding harus lebih tinggi dari harga jual.'
	});
export const categorySchema = z.object({
	name: text(80).min(1),
	slug,
	display_order: z.number().int().min(0).max(10000)
});
export const sectionSchemas = {
	hero: z.object({
		headline: text(160).min(1),
		subheadline: text(600),
		ctaLabel: text(60).min(1),
		ctaUrl: safeLink,
		featuredProduct: text(100),
		imageId: mediaId,
		visible: z.boolean()
	}),
	marquee: z.object({ items: z.array(text(80).min(1)).min(1).max(20), visible: z.boolean() }),
	signature: z.object({
		productId: text(100),
		heading: text(120),
		imageId: mediaId,
		visible: z.boolean()
	}),
	story: z.object({
		heading: text(240).min(1),
		description: text(4000),
		imageId: mediaId,
		visible: z.boolean()
	}),
	banners: z.object({
		items: z
			.array(
				z.object({
					id: z.string().uuid(),
					title: text(160),
					imageId: mediaId,
					ctaLabel: text(60),
					ctaUrl: safeLink,
					active: z.boolean(),
					displayOrder: z.number().int().min(0).max(10000)
				})
			)
			.max(20),
		visible: z.boolean()
	}),
	footer: z.object({
		description: text(600),
		contact: text(500),
		instagram: safeLink,
		socialLinks: z.array(z.object({ label: text(40).min(1), url: safeLink })).max(8),
		visible: z.boolean()
	})
};
export type SectionKey = keyof typeof sectionSchemas;
export type Sections = { [K in SectionKey]: z.infer<(typeof sectionSchemas)[K]> };
export const sectionKeys = Object.keys(sectionSchemas) as SectionKey[];
export const settingsSchema = z.object({
	whatsappNumber: text(30).refine(
		(v) => v === '' || /^[1-9]\d{7,14}$/.test(v),
		'Gunakan nomor internasional tanpa tanda +.'
	),
	messageTemplate: text(500).min(1),
	instagram: safeLink,
	contact: text(500),
	storeName: text(120).min(1),
	storeInfo: text(1000),
	seoTitle: text(160).min(1),
	seoDescription: text(320),
	announcement: text(500),
	open: z.boolean(),
	fulfillmentOptions: z.array(text(100).min(1)).max(10)
});
export type Settings = z.infer<typeof settingsSchema>;
export const checkoutSchema = z
	.object({
		key: z.string().uuid(),
		delivery: destinationSchema.optional(),
		quoteId: z.string().uuid().optional(),
		name: text(60).min(1),
		note: text(300).default(''),
		fulfillment: text(100).default(''),
		items: z
			.array(z.object({ id: text(100).min(1), qty: z.number().int().min(1).max(20) }))
			.min(1)
			.max(30)
	})
	.refine((v) => new Set(v.items.map((i) => i.id)).size === v.items.length, {
		path: ['items'],
		message: 'Produk tidak boleh berulang.'
	});
export const orderStatuses = [
	'pending',
	'confirmed',
	'preparing',
	'completed',
	'cancelled'
] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export const statusLabels: Record<OrderStatus, string> = {
	pending: 'Pending Confirmation',
	confirmed: 'Confirmed',
	preparing: 'Preparing',
	completed: 'Completed',
	cancelled: 'Cancelled'
};
const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
	pending: ['confirmed', 'cancelled'],
	confirmed: ['preparing', 'completed', 'cancelled'],
	preparing: ['completed', 'cancelled'],
	completed: [],
	cancelled: []
};
export const allowedTransition = (from: OrderStatus, to: OrderStatus) =>
	from === to || transitions[from].includes(to);
export const orderUpdateSchema = z.object({
	status: z.enum(orderStatuses),
	internal_note: text(2000),
	previous: z.enum(orderStatuses),
	deliveryFee: z.number().int().min(0).max(100000000).optional(),
	version: z.number().int().min(0)
});
export const eventSchema = z.object({
	id: z.string().uuid(),
	type: z.enum(['page_view', 'product_view', 'add_to_cart']),
	productId: text(100).optional()
});
export const loginSchema = z.object({
	email: z
		.email()
		.max(254)
		.transform((v) => v.toLowerCase()),
	password: z.string().min(1).max(256)
});
export const profileSchema = z.object({
	name: text(100).min(1),
	currentPassword: z.string().max(256),
	newPassword: z.string().min(12).max(256)
});
export type ProductRecord = z.infer<typeof productSchema> & {
	id: string;
	category_name: string | null;
	category_slug: string | null;
	created_at: string;
	updated_at: string;
	images: MediaAsset[];
};
export interface MediaAsset {
	id: string;
	object_key: string | null;
	name: string;
	mime: string;
	size: number;
	url: string;
	alt: string;
	created_at: string;
}
export interface AdminUser {
	id: string;
	email: string;
	name: string;
	role: 'admin' | 'editor';
}
export interface OrderRecord {
	delivery_snapshot: string | null;
	version: number;
	id: string;
	customer_name: string;
	customer_note: string;
	fulfillment: string;
	total: number;
	status: OrderStatus;
	internal_note: string;
	created_at: string;
	confirmed_at: string | null;
	updated_at: string;
	whatsapp_number: string;
}
