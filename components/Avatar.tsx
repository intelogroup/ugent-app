'use client';

import { useAvatar } from '@/lib/avatar';
import type { AvatarUser } from '@/lib/avatar';

interface AvatarProps {
  user?: AvatarUser | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
} as const;

export default function Avatar({ user, size = 'md', className = '' }: AvatarProps) {
  const { resolved } = useAvatar(user);

  return (
    <div
      className={`${SIZE_CLASS[size]} rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 ${className}`}
    >
      <img
        src={resolved.src}
        alt={resolved.alt}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
