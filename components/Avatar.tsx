'use client';

import Image from 'next/image';
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

// Matches SIZE_CLASS above (w-8=32, w-10=40, w-16=64) for next/image dimensions.
const SIZE_PX = { sm: 32, md: 40, lg: 64 } as const;

export default function Avatar({ user, size = 'md', className = '' }: AvatarProps) {
  const { resolved } = useAvatar(user);

  return (
    <div
      className={`${SIZE_CLASS[size]} rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 ${className}`}
    >
      {/* unoptimized: src is a dynamic remote URL or a data-URI initials fallback,
          and no remotePatterns are configured in next.config */}
      <Image
        src={resolved.src}
        alt={resolved.alt}
        width={SIZE_PX[size]}
        height={SIZE_PX[size]}
        unoptimized
        className="w-full h-full object-cover"
      />
    </div>
  );
}
