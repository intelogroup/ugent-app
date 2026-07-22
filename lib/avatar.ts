export interface AvatarUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}

const AVATAR_COLORS = ['#2563EB', '#DC2626', '#0EA5E9', '#7C3AED', '#059669', '#DB2777', '#0891B2', '#B45309'];

export function getAvatarDisplayName(user: AvatarUser | null | undefined): string {
  if (!user) return 'You';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || 'You';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function colorFor(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initialsSvgDataUri(name: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="32" fill="${colorFor(name)}"/>
    <text x="32" y="41" font-size="24" font-family="sans-serif" fill="#fff" text-anchor="middle">${initials(name)}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function resolveAvatar(user: AvatarUser | null | undefined): { src: string; alt: string } {
  const alt = getAvatarDisplayName(user);
  if (user?.profilePictureUrl) return { src: user.profilePictureUrl, alt };
  return { src: initialsSvgDataUri(alt), alt };
}

export function useAvatar(explicitUser?: AvatarUser | null) {
  const user = explicitUser ?? null;
  return { user, resolved: resolveAvatar(user) };
}
