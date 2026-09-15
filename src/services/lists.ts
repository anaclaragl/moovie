import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getMovieDetails } from '../lib/tmdb';
import { ListItem, ListItemWithMovie, ListType, MovieList, Rating } from '../types';

export const WATCHED_TOGETHER_LIST_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_WATCHED_TOGETHER_NAME = 'Assistidos por Nós';

/**
 * Ensures the fixed "both watched" list exists in Supabase.
 */
export async function ensureWatchedTogetherList(): Promise<MovieList> {
  try {
    const { data: existing, error: selectError } = await supabase
      .from('lists')
      .select('id, name, type, owner_key, created_at')
      .eq('id', WATCHED_TOGETHER_LIST_ID)
      .maybeSingle();

    if (selectError) {
      console.warn('Could not query fixed list:', selectError.message);
    }

    if (existing) {
      return {
        ...existing,
        is_fixed: true,
      } as MovieList;
    }

    // Try to insert the fixed list row
    const { data: created, error: insertError } = await supabase
      .from('lists')
      .upsert(
        {
          id: WATCHED_TOGETHER_LIST_ID,
          name: DEFAULT_WATCHED_TOGETHER_NAME,
          type: 'cooperative',
          owner_key: null,
        },
        { onConflict: 'id' }
      )
      .select('id, name, type, owner_key, created_at')
      .single();

    if (insertError) {
      console.warn('Could not insert fixed list in DB, using fallback object:', insertError.message);
      return {
        id: WATCHED_TOGETHER_LIST_ID,
        name: DEFAULT_WATCHED_TOGETHER_NAME,
        type: 'cooperative',
        owner_key: null,
        created_at: new Date().toISOString(),
        is_fixed: true,
      };
    }

    return {
      ...created,
      is_fixed: true,
    } as MovieList;
  } catch (error: any) {
    console.warn('Error in ensureWatchedTogetherList, using fallback:', error.message);
    return {
      id: WATCHED_TOGETHER_LIST_ID,
      name: DEFAULT_WATCHED_TOGETHER_NAME,
      type: 'cooperative',
      owner_key: null,
      created_at: new Date().toISOString(),
      is_fixed: true,
    };
  }
}

/**
 * Fetches cooperative lists plus solo lists belonging to the current user.
 * The fixed "both watched" list is always guaranteed at the top.
 */
export async function getLists(userKey: string): Promise<MovieList[]> {
  if (!userKey) {
    throw new Error('userKey is required to fetch lists.');
  }

  try {
    const [fixedList, { data, error }] = await Promise.all([
      ensureWatchedTogetherList(),
      supabase
        .from('lists')
        .select('id, name, type, owner_key, created_at')
        .or(`type.eq.cooperative,owner_key.eq.${userKey}`)
        .order('created_at', { ascending: false }),
    ]);

    if (error) {
      throw new Error(`Failed to retrieve lists: ${error.message}`);
    }

    const fetchedLists = ((data as MovieList[]) || []).filter(
      (l) => l.id !== WATCHED_TOGETHER_LIST_ID
    );

    return [fixedList, ...fetchedLists];
  } catch (error: any) {
    throw new Error(`Error in getLists: ${error.message}`);
  }
}

/**
 * Creates a new list (either solo or cooperative).
 */
export async function createList(
  name: string,
  type: ListType,
  ownerKey?: string
): Promise<MovieList> {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw new Error('A valid list name is required.');
  }

  if (type === 'solo' && !ownerKey) {
    throw new Error('ownerKey is required when creating a solo list.');
  }

  try {
    const payload = {
      name: trimmedName,
      type,
      owner_key: type === 'solo' ? ownerKey : null,
    };

    const { data, error } = await supabase
      .from('lists')
      .insert(payload)
      .select('id, name, type, owner_key, created_at')
      .single();

    if (error) {
      throw new Error(`Failed to create list: ${error.message}`);
    }

    return data as MovieList;
  } catch (error: any) {
    throw new Error(`Error in createList: ${error.message}`);
  }
}

/**
 * Updates a list's name.
 */
export async function updateListName(listId: string, newName: string): Promise<MovieList> {
  const trimmedName = newName?.trim();
  if (!listId || !trimmedName) {
    throw new Error('listId and a valid new list name are required.');
  }

  try {
    const { data, error } = await supabase
      .from('lists')
      .update({ name: trimmedName })
      .eq('id', listId)
      .select('id, name, type, owner_key, created_at')
      .single();

    if (error) {
      throw new Error(`Failed to update list name: ${error.message}`);
    }

    return {
      ...(data as MovieList),
      is_fixed: listId === WATCHED_TOGETHER_LIST_ID,
    };
  } catch (error: any) {
    throw new Error(`Error in updateListName: ${error.message}`);
  }
}

/**
 * Deletes a list by its ID.
 */
export async function deleteList(listId: string): Promise<void> {
  if (!listId) {
    throw new Error('listId is required to delete a list.');
  }

  if (listId === WATCHED_TOGETHER_LIST_ID) {
    throw new Error('A lista fixa não pode ser excluída.');
  }

  try {
    // Delete any dependent list items first to guarantee cleanup
    await supabase.from('list_items').delete().eq('list_id', listId);

    const { error } = await supabase.from('lists').delete().eq('id', listId);

    if (error) {
      throw new Error(`Failed to delete list: ${error.message}`);
    }
  } catch (error: any) {
    throw new Error(`Error in deleteList: ${error.message}`);
  }
}

/**
 * Adds a movie to a list.
 */
export async function addMovieToList(
  listId: string,
  tmdbId: number,
  addedBy: string
): Promise<ListItem> {
  if (!listId || !tmdbId || !addedBy) {
    throw new Error('listId, tmdbId, and addedBy are required to add a movie to a list.');
  }

  if (listId === WATCHED_TOGETHER_LIST_ID) {
    throw new Error('Filmes não podem ser adicionados manualmente a esta lista fixa.');
  }

  try {
    const { data, error } = await supabase
      .from('list_items')
      .insert({
        list_id: listId,
        tmdb_id: tmdbId,
        added_by: addedBy,
      })
      .select('id, list_id, tmdb_id, added_by, added_at')
      .single();

    if (error) {
      throw new Error(`Failed to add movie to list: ${error.message}`);
    }

    return data as ListItem;
  } catch (error: any) {
    throw new Error(`Error in addMovieToList: ${error.message}`);
  }
}

/**
 * Removes a movie from a list by list ID and TMDB ID.
 */
export async function removeMovieFromList(listId: string, tmdbId: number): Promise<void> {
  if (!listId || !tmdbId) {
    throw new Error('listId and tmdbId are required to remove a movie from a list.');
  }

  if (listId === WATCHED_TOGETHER_LIST_ID) {
    throw new Error('Filmes não podem ser removidos manualmente desta lista fixa.');
  }

  try {
    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('list_id', listId)
      .eq('tmdb_id', tmdbId);

    if (error) {
      throw new Error(`Failed to remove movie from list: ${error.message}`);
    }
  } catch (error: any) {
    throw new Error(`Error in removeMovieFromList: ${error.message}`);
  }
}

/**
 * Retrieves all items in a list enriched with TMDB movie details fetched in parallel.
 * If listId is the fixed "both watched" list, fetches movies where watched=true for both users.
 */
export async function getListItemsWithMovies(listId: string): Promise<ListItemWithMovie[]> {
  if (!listId) {
    throw new Error('listId is required to fetch list items.');
  }

  try {
    if (listId === WATCHED_TOGETHER_LIST_ID) {
      // Fetch all ratings where watched is true
      const { data, error } = await supabase
        .from('ratings')
        .select('id, tmdb_id, user_key, score, watched, updated_at')
        .eq('watched', true)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch watched ratings: ${error.message}`);
      }

      const ratings = (data as Rating[]) || [];

      // Group by tmdb_id and record user keys & latest timestamp
      const movieMap = new Map<number, { users: Set<string>; latestDate: string }>();
      for (const r of ratings) {
        if (!movieMap.has(r.tmdb_id)) {
          movieMap.set(r.tmdb_id, {
            users: new Set(),
            latestDate: r.updated_at || new Date().toISOString(),
          });
        }
        const entry = movieMap.get(r.tmdb_id)!;
        entry.users.add(r.user_key);
      }

      // Filter movies watched by both 'ana' and 'luisa' (or at least 2 distinct user profiles)
      const bothWatchedEntries = Array.from(movieMap.entries()).filter(
        ([_, val]) => val.users.has('ana') && val.users.has('luisa')
      );

      const enrichedItems: ListItemWithMovie[] = await Promise.all(
        bothWatchedEntries.map(async ([tmdbId, val]) => {
          try {
            const movie = await getMovieDetails(tmdbId);
            return {
              id: `both-${tmdbId}`,
              list_id: WATCHED_TOGETHER_LIST_ID,
              tmdb_id: tmdbId,
              added_by: 'cooperative',
              added_at: val.latestDate,
              movie,
            };
          } catch (tmdbErr) {
            console.warn(`Could not load movie details for TMDB ID ${tmdbId}:`, tmdbErr);
            return {
              id: `both-${tmdbId}`,
              list_id: WATCHED_TOGETHER_LIST_ID,
              tmdb_id: tmdbId,
              added_by: 'cooperative',
              added_at: val.latestDate,
              movie: null,
            };
          }
        })
      );

      return enrichedItems;
    }

    const { data, error } = await supabase
      .from('list_items')
      .select('id, list_id, tmdb_id, added_by, added_at')
      .eq('list_id', listId)
      .order('added_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch items for list: ${error.message}`);
    }

    const items = (data as ListItem[]) || [];

    const enrichedItems: ListItemWithMovie[] = await Promise.all(
      items.map(async (item) => {
        try {
          const movie = await getMovieDetails(item.tmdb_id);
          return {
            ...item,
            movie,
          };
        } catch (tmdbErr) {
          console.warn(`Could not load movie details for TMDB ID ${item.tmdb_id}:`, tmdbErr);
          return {
            ...item,
            movie: null,
          };
        }
      })
    );

    return enrichedItems;
  } catch (error: any) {
    throw new Error(`Error in getListItemsWithMovies: ${error.message}`);
  }
}

/**
 * Subscribes to real-time changes in list_items (or ratings for the fixed list).
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToList(
  listId: string,
  callback: (payload: any) => void
): () => void {
  if (!listId) {
    throw new Error('listId is required to subscribe to list changes.');
  }

  if (listId === WATCHED_TOGETHER_LIST_ID) {
    const channelName = `fixed_list_ratings:${listId}`;
    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ratings',
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  const channelName = `list_items:${listId}`;
  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'list_items',
        filter: `list_id=eq.${listId}`,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
