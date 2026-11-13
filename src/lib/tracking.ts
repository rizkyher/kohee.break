export function track(type: 'page_view' | 'product_view' | 'add_to_cart', productId?: string) {
	if (typeof window === 'undefined') return;
	void fetch('/api/events', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ id: crypto.randomUUID(), type, productId }),
		keepalive: true
	}).catch(() => {});
}
