'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from '@/app/landing.module.css';

const MIN_VISIBLE_USERS = 50;

function formatCount(count: number) {
  if (count >= 1000) {
    const k = (count / 1000).toFixed(1).replace(/\.0$/, '');
    return `${k}K+`;
  }
  return `${count}+`;
}

export default function SocialProof() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user-count', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.count === 'number') setCount(data.count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null || count < MIN_VISIBLE_USERS) return null;

  return (
    <div className={styles.heroSocialProof} aria-label={`${count} students preparing`}>
      <div className={styles.userStack} aria-hidden="true">
        <Image src="/clea2-avatar-photo.png" alt="" width={40} height={40} />
        <Image src="/clea-avatar-photo.png" alt="" width={40} height={40} />
        <Image src="/images/landing/hero-med-student.webp" alt="" width={40} height={40} />
      </div>
      <div>
        <strong>{formatCount(count)}</strong>
        <span>students preparing</span>
      </div>
    </div>
  );
}
