'use client';

import { Dumbbell, Home, Utensils, Target } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const links = [
    {
      href: '/dashboard',
      label: '홈',
      icon: Home,
    },
    {
      href: '/workout',
      label: '운동',
      icon: Dumbbell,
    },
    {
      href: '/diet',
      label: '식단',
      icon: Utensils,
    },
    {
      href: '/goals',
      label: '목표',
      icon: Target,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden">
      <nav className="flex justify-around items-center h-16">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full space-y-1',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary transition-colors'
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
