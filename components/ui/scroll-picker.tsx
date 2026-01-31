'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ScrollPickerProps {
	items: (string | number)[];
	value: string | number;
	onValueChange: (value: string | number) => void;
	label?: string;
	className?: string;
	itemHeight?: number;
}

export function ScrollPicker({
	items,
	value,
	onValueChange,
	label,
	className,
	itemHeight = 48,
}: ScrollPickerProps) {
	const scrollRef = React.useRef<HTMLDivElement | null>(null);
	const isProgrammaticScrollRef = React.useRef(false);
	const scrollEndTimerRef = React.useRef<number | null>(null);

	const spacerHeight = 128 - itemHeight / 2;

	const scrollToIndex = React.useCallback(
		(index: number, behavior: ScrollBehavior) => {
			const el = scrollRef.current;
			if (!el) return;
			el.scrollTo({ top: index * itemHeight, behavior });
		},
		[itemHeight],
	);

	React.useEffect(() => {
		const index = items.indexOf(value);
		if (index < 0) return;

		const el = scrollRef.current;
		if (!el) return;

		const expectedTop = index * itemHeight;
		if (Math.abs(el.scrollTop - expectedTop) < 1) return;

		isProgrammaticScrollRef.current = true;
		scrollToIndex(index, 'auto');
		window.setTimeout(() => {
			isProgrammaticScrollRef.current = false;
		}, 0);
	}, [items, value, itemHeight, scrollToIndex]);

	const commitNearestValue = React.useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;

		const maxIndex = Math.max(0, items.length - 1);
		const rawIndex = Math.round(el.scrollTop / itemHeight);
		const index = Math.min(maxIndex, Math.max(0, rawIndex));
		const nextValue = items[index];

		if (nextValue !== undefined && nextValue !== value) {
			onValueChange(nextValue);
		}

		isProgrammaticScrollRef.current = true;
		scrollToIndex(index, 'smooth');
		window.setTimeout(() => {
			isProgrammaticScrollRef.current = false;
		}, 150);
	}, [items, itemHeight, onValueChange, scrollToIndex, value]);

	const onScroll = React.useCallback(() => {
		if (isProgrammaticScrollRef.current) return;

		if (scrollEndTimerRef.current) {
			window.clearTimeout(scrollEndTimerRef.current);
		}
		scrollEndTimerRef.current = window.setTimeout(() => {
			commitNearestValue();
		}, 120);
	}, [commitNearestValue]);

	React.useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		el.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			el.removeEventListener('scroll', onScroll);
		};
	}, [onScroll]);

	return (
		<div
			className={cn(
				'relative flex items-center justify-center h-64 overflow-hidden bg-background overscroll-contain',
				className,
			)}>
			{/* Fade Mask */}
			<div className='absolute inset-0 pointer-events-none z-20 bg-gradient-to-b from-background via-transparent to-background' />

			{/* 선택 하이라이트 바 */}
			<div
				className='absolute w-full border-y border-primary/20 bg-muted/20 pointer-events-none z-10'
				style={{ height: itemHeight, top: '50%', marginTop: -itemHeight / 2 }}
			/>

			<div
				ref={scrollRef}
				className='h-full w-full overflow-y-scroll overflow-x-hidden'
				style={{
					scrollSnapType: 'y mandatory',
					WebkitOverflowScrolling: 'touch',
					touchAction: 'pan-y',
				}}>
				<div style={{ height: spacerHeight }} />
				{items.map((item, index) => (
					<div
						key={index}
						className='flex items-center justify-center shrink-0 cursor-pointer select-none transition-opacity duration-200'
						style={{
							height: itemHeight,
							opacity: item === value ? 1 : 0.4,
							transform: item === value ? 'scale(1.1)' : 'scale(1)',
							scrollSnapAlign: 'center',
						}}
						onClick={() => scrollToIndex(index, 'smooth')}>
						<span
							className={cn(
								'text-2xl font-semibold',
								item === value
									? 'text-primary'
									: 'text-muted-foreground',
							)}>
							{item}
						</span>
						{label && item === value && (
							<span className='ml-1 text-sm font-medium text-muted-foreground mt-1'>
								{label}
							</span>
						)}
					</div>
				))}
				<div style={{ height: spacerHeight }} />
			</div>
		</div>
	);
}
