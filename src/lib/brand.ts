import { FULFILLMENT_OPTIONS, INSTAGRAM_HANDLE, SITE_URL, WHATSAPP_NUMBER } from '$app/env/public';

export const brand = {
	name: 'Kohee Break',
	tagline: 'Break Time, Kohee Time',
	katakana: 'コーヒーブレイク',
	whatsappNumber: WHATSAPP_NUMBER,
	whatsappChatUrl: WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}` : undefined,
	instagram: INSTAGRAM_HANDLE
		? { handle: INSTAGRAM_HANDLE, url: `https://www.instagram.com/${INSTAGRAM_HANDLE}/` }
		: undefined,
	fulfillmentOptions: FULFILLMENT_OPTIONS,
	siteUrl: SITE_URL
};
