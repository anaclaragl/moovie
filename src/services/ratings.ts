import { supabase } from '../lib/supabase';
import { getMovieDetails } from '../lib/tmdb';
import { Rating, RatingUpsertData, WatchedMovieItem } from '../types';

/**
 * Fetches ratings for a specific movie by TMDB ID (returns ratings for both users if available).
 */
export async function getRatingsForMovie(tmdbId: number): Promise<Rating[]> {
  if (!tmdbId) {
    throw new Error('tmdbId is required to fetch movie ratings.');
  }

  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('id, tmdb_id, user_key, score, watched, review, updated_at')
      .eq('tmdb_id', tmdbId);

    if (error) {
      throw new Error(`Failed to fetch ratings for movie: ${error.message}`);
    }

    return (data as Rating[]) || [];
  } catch (error: any) {
    throw new Error(`Error in getRatingsForMovie: ${error.message}`);
  }
}

/**
 * Inserts or updates a user's rating for a movie using the unique constraint on (tmdb_id, user_key).
 */
export async function upsertRating(
  tmdbId: number,
  userKey: string,
  data: RatingUpsertData
): Promise<Rating> {
  if (!tmdbId || !userKey) {
    throw new Error('tmdbId and userKey are required to upsert a rating.');
  }

  if (data.score !== undefined && data.score !== null && (data.score < 0 || data.score > 5)) {
    throw new Error('Rating score must be between 0 and 5.');
  }

  try {
    const updatePayload: Record<string, any> = {
      tmdb_id: tmdbId,
      user_key: userKey,
      updated_at: new Date().toISOString(),
    };

    if (data.score !== undefined) {
      updatePayload.score = data.score === 0 || data.score === null ? null : data.score;
    }
    if (data.watched !== undefined) {
      updatePayload.watched = data.watched;
    }
    if (data.review !== undefined) {
      updatePayload.review = data.review;
    }

    const { data: result, error } = await supabase
      .from('ratings')
      .upsert(updatePayload, { onConflict: 'tmdb_id,user_key' })
      .select('id, tmdb_id, user_key, score, watched, review, updated_at')
      .single();

    if (error) {
      throw new Error(`Failed to save rating: ${error.message}`);
    }

    return result as Rating;
  } catch (error: any) {
    throw new Error(`Error in upsertRating: ${error.message}`);
  }
}

/**
 * Toggles or sets a movie's watched status for the user.
 * If watched is false, it deletes the rating row from ratings table and cleans up watch_events.
 */
export async function toggleWatched(
  tmdbId: number,
  userKey: string,
  watched: boolean
): Promise<Rating> {
  if (!tmdbId || !userKey) {
    throw new Error('tmdbId and userKey are required to update watched status.');
  }

  try {
    if (watched) {
      // 1. Upsert rating with watched = true
      const updatedRating = await upsertRating(tmdbId, userKey, { watched: true });

      // 2a. Record watch event for today
      const today = new Date().toISOString().split('T')[0];
      const { error: eventError } = await supabase.from('watch_events').insert({
        user_key: userKey,
        tmdb_id: tmdbId,
        watched_on: today,
      });

      if (eventError) {
        console.warn(`Warning: Failed to log watch event: ${eventError.message}`);
      }

      return updatedRating;
    } else {
      // 1. Unmarking watched: delete rating row completely from ratings table
      const { error: deleteRatingError } = await supabase
        .from('ratings')
        .delete()
        .eq('user_key', userKey)
        .eq('tmdb_id', tmdbId);

      if (deleteRatingError) {
        throw new Error(`Failed to delete rating: ${deleteRatingError.message}`);
      }

      // 2. Remove watch event(s) for this movie and user
      const { error: deleteError } = await supabase
        .from('watch_events')
        .delete()
        .eq('user_key', userKey)
        .eq('tmdb_id', tmdbId);

      if (deleteError) {
        console.warn(`Warning: Failed to delete watch event: ${deleteError.message}`);
      }

      return {
        tmdb_id: tmdbId,
        user_key: userKey,
        watched: false,
        score: undefined,
        review: null,
      };
    }
  } catch (error: any) {
    throw new Error(`Error in toggleWatched: ${error.message}`);
  }
}

/**
 * Marks a movie as watched by the user (upserts rating with watched = true)
 * and records a watch event with today's date.
 */
export async function markAsWatched(tmdbId: number, userKey: string): Promise<Rating> {
  return toggleWatched(tmdbId, userKey, true);
}

/**
 * Retrieves all movies watched by a user, enriched with TMDB movie details.
 */
export async function getUserWatchedMovies(userKey: string): Promise<WatchedMovieItem[]> {
  if (!userKey) {
    throw new Error('userKey is required to fetch watched movies.');
  }

  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('id, tmdb_id, user_key, score, watched, review, updated_at')
      .eq('user_key', userKey)
      .eq('watched', true)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch watched movies: ${error.message}`);
    }

    const ratings = (data as Rating[]) || [];

    const enrichedItems: WatchedMovieItem[] = await Promise.all(
      ratings.map(async (rating) => {
        try {
          const movie = await getMovieDetails(rating.tmdb_id);
          return {
            rating,
            movie,
          };
        } catch (tmdbErr) {
          console.warn(`Could not load movie details for TMDB ID ${rating.tmdb_id}:`, tmdbErr);
          return {
            rating,
            movie: null,
          };
        }
      })
    );

    return enrichedItems;
  } catch (error: any) {
    throw new Error(`Error in getUserWatchedMovies: ${error.message}`);
  }
}

/**
 * Given a list of TMDB IDs, returns which IDs have not yet been rated by the user.
 */
export async function getUnratedPopular(userKey: string, tmdbIds: number[]): Promise<number[]> {
  if (!userKey) {
    throw new Error('userKey is required to check unrated movies.');
  }

  if (!tmdbIds || tmdbIds.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('tmdb_id')
      .eq('user_key', userKey)
      .in('tmdb_id', tmdbIds);

    if (error) {
      throw new Error(`Failed to fetch user rated movies: ${error.message}`);
    }

    const ratedIds = new Set((data || []).map((row: { tmdb_id: number }) => row.tmdb_id));
    return tmdbIds.filter((id) => !ratedIds.has(id));
  } catch (error: any) {
    throw new Error(`Error in getUnratedPopular: ${error.message}`);
  }
}

/**
 * Given an array of TMDB IDs, returns a Set of IDs that have been watched or rated.
 */
export async function getWatchedMovieIds(tmdbIds: number[]): Promise<Set<number>> {
  if (!tmdbIds || tmdbIds.length === 0) {
    return new Set<number>();
  }

  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('tmdb_id, watched, score')
      .in('tmdb_id', tmdbIds);

    if (error) {
      console.warn('Failed to fetch watched ratings:', error.message);
      return new Set<number>();
    }

    const watchedSet = new Set<number>();
    (data || []).forEach((row: { tmdb_id: number; watched?: boolean; score?: number | null }) => {
      if (row.watched || (row.score !== null && row.score !== undefined)) {
        watchedSet.add(row.tmdb_id);
      }
    });

    return watchedSet;
  } catch (error: any) {
    console.warn(`Error in getWatchedMovieIds: ${error.message}`);
    return new Set<number>();
  }
}
