<script lang="ts">
	// The original Kohee Break cat, traced to vector from the brand logo. Colour follows `color`.
	let { class: className = '', label }: { class?: string; label?: string } = $props();
</script>

<svg
	class={className}
	viewBox="0 0 1719 2223"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	focusable="false"
>
	<use href="/mascot.svg#mascot" />
</svg>
