import type { Action } from 'svelte/action';

/**
 * Fades/clips a block in the first time it scrolls into view.
 * Content is only hidden when JS runs and the block starts below the fold,
 * so no-JS, reduced-motion and above-the-fold content render immediately.
 */
export const reveal: Action<HTMLElement, { clip?: boolean; delay?: number } | undefined> = (
	node,
	options
) => {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	if (node.getBoundingClientRect().top < innerHeight) return;

	node.classList.add('reveal-pending');
	if (options?.clip) node.classList.add('reveal-clip');
	if (options?.delay) node.style.setProperty('--delay', `${options.delay}ms`);

	const observer = new IntersectionObserver(
		([entry]) => {
			if (!entry.isIntersecting) return;
			node.classList.add('reveal-in');
			node.classList.remove('reveal-pending');
			observer.disconnect();
		},
		{ rootMargin: '0px 0px -12% 0px' }
	);
	observer.observe(node);

	return { destroy: () => observer.disconnect() };
};
