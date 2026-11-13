import type { Sections, Settings } from './contracts';
export const defaultSections: Sections = {
	hero: {
		headline: 'Break dulu.\nKopinya lanjut.',
		subheadline: 'Kadang, yang kamu butuhkan cuma jeda dan sebotol Kohee Break.',
		ctaLabel: 'Explore Our Menu',
		ctaUrl: '#menu',
		featuredProduct: 'kuro-aren',
		imageId: '',
		visible: true
	},
	marquee: { items: ['Break Time', 'Kohee Time', 'Sweet', 'Smooth', 'Tasty'], visible: true },
	signature: { productId: 'kuro-aren', heading: 'Your break moment', imageId: '', visible: true },
	story: {
		heading: 'Not every day needs fixing.\nSometimes, you just need a coffee break.',
		description:
			'Di sela tugas, meeting, dan jalanan yang padat, jeda kecil itu perlu. Kohee Break ada untuk momen itu: satu botol 250ml yang bisa kamu buka di mana pun kamu berhenti sebentar.\n\nJadi kalau hari ini terasa berat, berhenti dulu. Ambil sebotol. Lanjut lagi nanti.',
		imageId: '',
		visible: true
	},
	banners: { items: [], visible: true },
	footer: {
		description: 'Break Time, Kohee Time',
		contact: '',
		instagram: '',
		socialLinks: [],
		visible: true
	}
};
export const defaultSettings: Settings = {
	whatsappNumber: '',
	messageTemplate: 'Halo Kohee Break! Aku mau pesan:',
	instagram: '',
	contact: '',
	storeName: 'Kohee Break',
	storeInfo: '',
	seoTitle: 'Kohee Break | Break Time, Kohee Time',
	seoDescription:
		'Kopi botol 250ml dari Kohee Break: Kuro Aren, Amai Scotch, Kuro Latte, dan Chocori. Pilih favoritmu, lalu pesan langsung lewat WhatsApp.',
	announcement: '',
	open: true,
	fulfillmentOptions: []
};
