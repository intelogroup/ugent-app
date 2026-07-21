'use client';

import { useCallback, useEffect, useState } from 'react';

export interface AvatarUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}

export type AvatarPreference = { type: 'oauth' } | { type: 'preset'; id: string };

export const AVATAR_CHANGE_EVENT = 'avatar-preference-change';

const PREFERENCE_KEY_PREFIX = 'avatar-preference:';

export const AVATAR_PRESETS: { id: string; label: string; emoji: string; color: string }[] = [
  { id: 'brain', label: 'Brain', emoji: '🧠', color: '#2563EB' },
  { id: 'heart', label: 'Heart', emoji: '❤️', color: '#DC2626' },
  { id: 'lungs', label: 'Lungs', emoji: '🫁', color: '#0EA5E9' },
  { id: 'bone', label: 'Bone', emoji: '🦴', color: '#78716C' },
  { id: 'dna', label: 'DNA', emoji: '🧬', color: '#7C3AED' },
  { id: 'microscope', label: 'Microscope', emoji: '🔬', color: '#059669' },
  { id: 'pill', label: 'Pill', emoji: '💊', color: '#DB2777' },
  { id: 'stethoscope', label: 'Stethoscope', emoji: '🩺', color: '#2563EB' },
  { id: 'syringe', label: 'Syringe', emoji: '💉', color: '#0891B2' },
  { id: 'tooth', label: 'Tooth', emoji: '🦷', color: '#64748B' },
  { id: 'eye', label: 'Eye', emoji: '👁️', color: '#4338CA' },
  { id: 'kidney', label: 'Kidney', emoji: '🫘', color: '#B45309' },
];

export function presetSvgDataUri(preset: { emoji: string; color: string }): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="32" fill="${preset.color}"/>
    <text x="32" y="40" font-size="30" text-anchor="middle">${preset.emoji}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getAvatarDisplayName(user: AvatarUser | null | undefined): string {
  if (!user) return 'You';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || 'You';
}

function presetForId(id: string) {
  return AVATAR_PRESETS.find((preset) => preset.id === id) ?? AVATAR_PRESETS[0];
}

function defaultPresetFor(user: AvatarUser | null | undefined) {
  if (!user?.id) return AVATAR_PRESETS[0];
  let hash = 0;
  for (const char of user.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_PRESETS[hash % AVATAR_PRESETS.length];
}

export function resolveAvatar(
  user: AvatarUser | null | undefined,
  preference: AvatarPreference | null,
): { src: string; alt: string } {
  const alt = getAvatarDisplayName(user);

  if (preference?.type === 'oauth' && user?.profilePictureUrl) {
    return { src: user.profilePictureUrl, alt };
  }
  if (preference?.type === 'preset') {
    return { src: presetSvgDataUri(presetForId(preference.id)), alt };
  }
  if (user?.profilePictureUrl) {
    return { src: user.profilePictureUrl, alt };
  }
  return { src: presetSvgDataUri(defaultPresetFor(user)), alt };
}

export function loadAvatarPreference(userId: string | null | undefined): AvatarPreference | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = localStorage.getItem(PREFERENCE_KEY_PREFIX + userId);
    return raw ? (JSON.parse(raw) as AvatarPreference) : null;
  } catch {
    return null;
  }
}

export function saveAvatarPreference(userId: string | null | undefined, preference: AvatarPreference): void {
  if (typeof window === 'undefined' || !userId) return;
  localStorage.setItem(PREFERENCE_KEY_PREFIX + userId, JSON.stringify(preference));
  window.dispatchEvent(new CustomEvent(AVATAR_CHANGE_EVENT));
}

export function useAvatar(explicitUser?: AvatarUser | null) {
  // ponytail: WorkOS stripped, no auth user for now — pass explicitUser or
  // fall back to null (default preset avatar).
  const user = explicitUser ?? null;
  const userId = user?.id ?? null;

  const [preference, setPreferenceState] = useState<AvatarPreference | null>(() =>
    loadAvatarPreference(userId),
  );

  useEffect(() => {
    setPreferenceState(loadAvatarPreference(userId));
    if (typeof window === 'undefined') return;
    const sync = () => setPreferenceState(loadAvatarPreference(userId));
    window.addEventListener(AVATAR_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AVATAR_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [userId]);

  const setPreference = useCallback(
    (next: AvatarPreference) => {
      saveAvatarPreference(userId, next);
      setPreferenceState(next);
    },
    [userId],
  );

  return {
    user,
    preference,
    setPreference,
    hasOAuthPhoto: !!user?.profilePictureUrl,
    resolved: resolveAvatar(user, preference),
  };
}
