import type { RequestHandler } from './$types';
import { logout } from '#lib/server/auth.ts';
export const POST: RequestHandler = logout;
