'use client';

import { useCallback, useEffect, useState } from 'react';
import { AVATAR_CHANGE_EVENT } from '@/lib/avatar';
import { buildLocalLeaderboard } from './local';
import { LEADERBOARD_CHANGE_EVENT, type LocalLeaderboard } from './types';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useLocalLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LocalLeaderboard>({
    rows: [],
    currentUserRank: null,
    totalMembers: 0,
    updatedAt: Date.now(),
  });
  const [user, setUser] = useState<User | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    buildLocalLeaderboard(user).then(setLeaderboard);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const sync = () => refresh();
    window.addEventListener(LEADERBOARD_CHANGE_EVENT, sync);
    window.addEventListener(AVATAR_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(LEADERBOARD_CHANGE_EVENT, sync);
      window.removeEventListener(AVATAR_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [refresh]);

  return { leaderboard, refresh, user };
}
