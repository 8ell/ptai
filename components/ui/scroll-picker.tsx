'use client';

import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { EmblaCarouselType } from 'embla-carousel';
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
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: false, // 무한 루프는 값 선택에 혼란을 줄 수 있어 끔
    dragFree: true, // 부드러운 스크롤
    containScroll: false,
  });

  // 초기값 위치로 이동 및 스크롤 종료 시 값 선택 로직
  React.useEffect(() => {
    if (!emblaApi) return;

    // 초기 인덱스 설정
    const initialIndex = items.indexOf(value);
    if (initialIndex > -1) {
      emblaApi.scrollTo(initialIndex, true);
    }

    const onSelect = (emblaApi: EmblaCarouselType) => {
      const selectedIndex = emblaApi.selectedScrollSnap();
      const selectedValue = items[selectedIndex];
      if (selectedValue !== undefined && selectedValue !== value) {
        onValueChange(selectedValue);
      }
    };
    
    // 스크롤이 멈췄을 때만 값을 확정 (성능 및 UX)
    emblaApi.on('settle', onSelect);

    return () => {
      emblaApi.off('settle', onSelect);
    };
  }, [emblaApi, items, value, onValueChange]);

  // 중앙 정렬을 위한 패딩 계산 (뷰포트 높이의 절반 - 아이템 높이의 절반)
  // 여기서는 CSS로 처리하거나 컴포넌트 구조로 해결
  
  return (
    <div className={cn("relative flex items-center justify-center h-64 overflow-hidden bg-background", className)}>
      {/* Fade Mask */}
      <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-b from-background via-transparent to-background" />

      {/* 선택 하이라이트 바 (중앙 고정) */}
      <div 
        className="absolute w-full border-y border-primary/20 bg-muted/20 pointer-events-none z-10"
        style={{ height: itemHeight, top: '50%', marginTop: -itemHeight / 2 }}
      />
      
      <div className="h-full w-full max-w-[200px] overflow-hidden" ref={emblaRef}>
        <div className="flex flex-col">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-center shrink-0 cursor-pointer select-none transition-opacity duration-200"
              style={{ height: itemHeight, opacity: item === value ? 1 : 0.4, transform: item === value ? 'scale(1.1)' : 'scale(1)' }}
              onClick={() => emblaApi?.scrollTo(index)}
            >
              <span className={cn("text-2xl font-semibold", item === value ? "text-primary" : "text-muted-foreground")}>
                {item}
              </span>
              {label && item === value && (
                <span className="ml-1 text-sm font-medium text-muted-foreground mt-1">
                  {label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
