<script lang="ts" module>
	// Red cut-out shapes traced from the brand's promo posters (big arcs with one soft lobe).
	const paths = {
		hill: {
			viewBox: '0 0 200 200',
			d: 'M0 200V112C0 74 28 50 62 52C84 53 96 66 108 66C122 66 132 38 162 38C186 38 200 58 200 82V200Z'
		},
		edge: {
			viewBox: '0 0 200 200',
			d: 'M200 18C160 18 132 40 124 70C92 70 64 96 64 132C64 170 94 200 134 200H200Z'
		},
		corner: {
			viewBox: '0 0 200 200',
			d: 'M0 24C58 24 100 64 100 116C122 122 138 142 138 166C138 180 134 192 128 200H0Z'
		},
		wave: {
			viewBox: '0 0 400 40',
			d: 'M0 40V20C40 20 54 4 100 4S160 32 210 32 270 8 320 8 380 18 400 18V40Z'
		}
	};
	export type ShapeName = keyof typeof paths;
</script>

<script lang="ts">
	let {
		name,
		class: className = '',
		stretch = false
	}: { name: ShapeName; class?: string; stretch?: boolean } = $props();
</script>

<svg
	class={className}
	viewBox={paths[name].viewBox}
	preserveAspectRatio={stretch ? 'none' : 'xMidYMid meet'}
	aria-hidden="true"
	focusable="false"
>
	<path d={paths[name].d} fill="currentColor" />
</svg>
