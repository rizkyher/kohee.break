import { defineEnvVars } from '@sveltejs/kit/env';
import { normalizeWhatsAppNumber } from '#lib/order.ts';

// All of these are public and inlined at build time, so the prerendered page carries them.
// Unset = feature hidden in the UI. Set but malformed = the build fails with a clear message.
export const variables = defineEnvVars({
	WHATSAPP_NUMBER: {
		public: true,
		static: true,
		description: 'Seller WhatsApp number, international digits only, e.g. 6281234567890',
		schema: (value) => {
			if (!value?.trim()) return undefined;
			const digits = normalizeWhatsAppNumber(value);
			if (!digits) {
				throw new Error('WHATSAPP_NUMBER must be international digits, e.g. 6281234567890');
			}
			return digits;
		}
	},
	INSTAGRAM_HANDLE: {
		public: true,
		static: true,
		description: 'Instagram username without @, e.g. koheebreak',
		schema: (value) => {
			const handle = value?.trim().replace(/^@/, '');
			if (!handle) return undefined;
			if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
				throw new Error('INSTAGRAM_HANDLE must be a plain Instagram username');
			}
			return handle;
		}
	},
	SITE_URL: {
		public: true,
		static: true,
		description:
			'Public origin, e.g. https://kohee.break.example. Needed for absolute Open Graph URLs.',
		schema: (value) => {
			if (!value?.trim()) return undefined;
			const url = URL.parse(value.trim());
			if (!url || !/^https?:$/.test(url.protocol))
				throw new Error('SITE_URL must be an http(s) URL');
			return url.origin;
		}
	},
	FULFILLMENT_OPTIONS: {
		public: true,
		static: true,
		description: 'Comma-separated pickup/delivery choices shown at checkout. Empty = not asked.',
		schema: (value) =>
			(value ?? '')
				.split(',')
				.map((option) => option.trim())
				.filter(Boolean)
	}
});
