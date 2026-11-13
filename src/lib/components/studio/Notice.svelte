<script lang="ts">
	import { Check, CircleAlert } from '@lucide/svelte';
	let { message = '', error = false }: { message?: string; error?: boolean } = $props();
</script>

{#if message}<div class="studio-notice" class:error role={error ? 'alert' : 'status'}>
		{#if error}<CircleAlert size={18} />{:else}<Check size={18} />{/if}<span>{message}</span>
	</div>{/if}
