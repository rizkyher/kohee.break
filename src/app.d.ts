/// <reference types="@cloudflare/workers-types" />
import type { AdminUser } from '#lib/studio/contracts.ts';
declare global {
	namespace App {
		interface Locals {
			user: AdminUser | null;
			sessionHash: string | null;
		}
	}
}
export {};
