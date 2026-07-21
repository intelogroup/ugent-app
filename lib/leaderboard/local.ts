import { createClient } from '@/lib/supabase/client';
import {
  getAvatarDisplayName,
  loadAvatarPreference,
  resolveAvatar,
  type AvatarPreference,
  type AvatarUser,
} from '@/lib/avatar';
import { getQuizAttempts, type QuizAttempt } from '@/lib/quizAttempts';
import {
  LEADERBOARD_CHANGE_EVENT,
  type LeaderboardRow,
  type LocalLeaderboard,
  type StudyBuddy,
} from './types';

function computeStats(attempts: QuizAttempt[]) {
  const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
  const totalCorrect = attempts.reduce((sum, attempt) => sum + attempt.correct, 0);

  return {
    testsCompleted: attempts.length,
    totalCorrect,
    averageScore:
      totalQuestions > 0 ? parseFloat(((totalCorrect / totalQuestions) * 100).toFixed(1)) : 0,
  };
}

function toAvatarUser(id: string, name: string, profilePictureUrl?: string | null): AvatarUser {
  const parts = name.trim().split(/\s+/);
  return {
    id,
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || null,
    profilePictureUrl: profilePictureUrl ?? null,
  };
}

function resolveRowAvatar(
  id: string,
  name: string,
  preference: AvatarPreference | null,
  profilePictureUrl?: string | null,
): Pick<LeaderboardRow, 'avatarSrc' | 'avatarAlt'> {
  const user = toAvatarUser(id, name, profilePictureUrl);
  const resolved = resolveAvatar(user, preference);
  return { avatarSrc: resolved.src, avatarAlt: resolved.alt || name };
}

async function getCohortKey(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ? `ugent-study-cohort-${user.id}` : 'ugent-study-cohort';
}

export async function loadStudyCohort(): Promise<StudyBuddy[]> {
  if (typeof window === 'undefined') return [];
  try {
    const key = await getCohortKey();
    return JSON.parse(localStorage.getItem(key) || '[]') as StudyBuddy[];
  } catch {
    return [];
  }
}

export async function saveStudyCohort(cohort: StudyBuddy[]): Promise<void> {
  const key = await getCohortKey();
  localStorage.setItem(key, JSON.stringify(cohort));
  window.dispatchEvent(new CustomEvent(LEADERBOARD_CHANGE_EVENT));
}

export async function addStudyBuddy(input: {
  name: string;
  avatarPreference: AvatarPreference;
  averageScore?: number;
  testsCompleted?: number;
}): Promise<StudyBuddy> {
  const buddy: StudyBuddy = {
    id: `buddy-${Date.now()}`,
    name: input.name.trim(),
    avatarPreference: input.avatarPreference,
    averageScore: input.averageScore ?? 0,
    testsCompleted: input.testsCompleted ?? 0,
    totalCorrect: 0,
    addedAt: Date.now(),
  };

  const cohort = await loadStudyCohort();
  cohort.push(buddy);
  await saveStudyCohort(cohort);
  return buddy;
}

export async function removeStudyBuddy(id: string): Promise<void> {
  const cohort = await loadStudyCohort();
  await saveStudyCohort(cohort.filter((buddy) => buddy.id !== id));
}

export async function buildLocalLeaderboard(user: AvatarUser | null | undefined): Promise<LocalLeaderboard> {
  if (typeof window === 'undefined') {
    return {
      rows: [],
      currentUserRank: null,
      totalMembers: 0,
      updatedAt: Date.now(),
    };
  }

  const attempts = await getQuizAttempts();
  const stats = computeStats(attempts);
  const cohort = await loadStudyCohort();

  const rows: Omit<LeaderboardRow, 'rank'>[] = [];

  if (user?.id) {
    const name = getAvatarDisplayName(user);
    const preference = loadAvatarPreference(user.id);
    rows.push({
      id: user.id,
      name,
      ...resolveRowAvatar(user.id, name, preference, user.profilePictureUrl),
      averageScore: stats.averageScore,
      testsCompleted: stats.testsCompleted,
      totalCorrect: stats.totalCorrect,
      isCurrentUser: true,
    });
  }

  for (const buddy of cohort) {
    rows.push({
      id: buddy.id,
      name: buddy.name,
      ...resolveRowAvatar(buddy.id, buddy.name, buddy.avatarPreference),
      averageScore: buddy.averageScore,
      testsCompleted: buddy.testsCompleted,
      totalCorrect: buddy.totalCorrect,
      isCurrentUser: false,
    });
  }

  rows.sort((a, b) => {
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
    if (b.testsCompleted !== a.testsCompleted) return b.testsCompleted - a.testsCompleted;
    return a.name.localeCompare(b.name);
  });

  const rankedRows: LeaderboardRow[] = rows.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));

  const currentUser = rankedRows.find((row) => row.isCurrentUser);

  return {
    rows: rankedRows,
    currentUserRank: currentUser?.rank ?? null,
    totalMembers: rankedRows.length,
    updatedAt: Date.now(),
  };
}
