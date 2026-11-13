import { invalidateAll, beforeNavigate } from '$app/navigation';
export async function mutate(path: string, method: string, data?: unknown) {
	const response = await fetch(`/api/admin/${path}`, {
		method,
		body: data instanceof FormData ? data : data === undefined ? undefined : JSON.stringify(data),
		headers:
			data instanceof FormData || data === undefined ? {} : { 'content-type': 'application/json' }
	});
	const result = (await response
		.json()
		.catch(() => ({ message: 'Respons server tidak dapat dibaca.' }))) as {
		message?: string;
		id?: string;
		url?: string;
		ok?: boolean;
	};
	if (!response.ok) throw new Error(result.message ?? 'Perubahan tidak dapat disimpan.');
	await invalidateAll();
	return result as { id?: string; url?: string; ok?: boolean };
}
export function protectChanges(dirty: () => boolean) {
	beforeNavigate(({ cancel }) => {
		if (dirty() && !confirm('Ada perubahan belum disimpan. Tinggalkan halaman?')) cancel();
	});
	return (event: BeforeUnloadEvent) => {
		if (dirty()) {
			event.preventDefault();
		}
	};
}
export const dateTime = (value: string) =>
	new Intl.DateTimeFormat('id-ID', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'Asia/Jakarta'
	}).format(new Date(value));
