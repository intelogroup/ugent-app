export interface StudyBuddy {
  id: string;
  name: string;
  averageScore: number;
  testsCompleted: number;
  totalCorrect: number;
  addedAt: number;
}

export interface LeaderboardRow {
  id: string;
  rank: number;
  name: string;
  avatarSrc: string;
  avatarAlt: string;
  averageScore: number;
  testsCompleted: number;
  totalCorrect: number;
  isCurrentUser: boolean;
}

export interface LocalLeaderboard {
  rows: LeaderboardRow[];
  currentUserRank: number | null;
  totalMembers: number;
  updatedAt: number;
}

export const STUDY_COHORT_KEY = 'ugent-study-cohort';
export const LEADERBOARD_CHANGE_EVENT = 'ugent-leaderboard-change';
