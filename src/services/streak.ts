import { supabase } from '../lib/supabase';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function parseDateToUtcMs(dateString: string): number {
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateString}`);
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return Date.UTC(year, month, day);
}

/**
 * Calculates the current consecutive days streak for a user.
 * Looks up distinct watched_on dates from watch_events, sorts them descending,
 * and counts consecutive days starting from today or yesterday.
 */
export async function getCurrentStreak(userKey: string): Promise<number> {
  if (!userKey) {
    throw new Error('userKey is required to calculate current streak.');
  }

  try {
    const { data, error } = await supabase
      .from('watch_events')
      .select('watched_on')
      .eq('user_key', userKey)
      .order('watched_on', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch watch events for streak: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return 0;
    }

    // Extract unique date strings
    const uniqueDates = Array.from(
      new Set(data.map((item: { watched_on: string }) => item.watched_on).filter(Boolean))
    ).sort((a, b) => b.localeCompare(a)); // Sort descending: latest first

    if (uniqueDates.length === 0) {
      return 0;
    }

    const now = new Date();
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    const mostRecentDateUtc = parseDateToUtcMs(uniqueDates[0]);
    const diffFromToday = Math.round((todayUtc - mostRecentDateUtc) / ONE_DAY_MS);

    // If the latest watch event is older than yesterday, the streak is broken
    if (diffFromToday > 1) {
      return 0;
    }

    let streak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDateUtc = parseDateToUtcMs(uniqueDates[i - 1]);
      const currDateUtc = parseDateToUtcMs(uniqueDates[i]);

      const daysDiff = Math.round((prevDateUtc - currDateUtc) / ONE_DAY_MS);

      if (daysDiff === 1) {
        streak += 1;
      } else if (daysDiff === 0) {
        // Same date (defensive check)
        continue;
      } else {
        // Gap found; streak stops
        break;
      }
    }

    return streak;
  } catch (error: any) {
    throw new Error(`Error in getCurrentStreak: ${error.message}`);
  }
}
