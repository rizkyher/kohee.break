import type { LayoutServerLoad } from './$types';
import { requireUser } from '#lib/server/auth.ts';
export const load: LayoutServerLoad = (event) => ({ user: requireUser(event) });
