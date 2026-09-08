import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getMovieDetails } from '../lib/tmdb';
import { ListItem, ListItemWithMovie, ListType, MovieList } from '../types';

/**
 * Fetches cooperative lists plus solo lists belonging to the current user.
 * Solo lists of other users are excluded.
 */
export async function getLists(userKey: string): Promise<MovieList[]> {
  if (!userKey) {
    throw new Error('userKey is required to fetch lists.');
  }

  try {
    const { data, error } = await supabase
      .from('lists')
      .select('id, name, type, owner_key, created_at')
      .or(`type.eq.cooperative,owner_key.eq.${userKey}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to retrieve lists: ${error.message}`);
    }

    return (data as MovieList[]) || [];
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

    return data as MovieList;
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
 */
export async function getListItemsWithMovies(listId: string): Promise<ListItemWithMovie[]> {
  if (!listId) {
    throw new Error('listId is required to fetch list items.');
  }

  try {
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
 * Subscribes to real-time changes (INSERT and DELETE) in list_items for a specific list.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToList(
  listId: string,
  callback: (payload: any) => void
): () => void {
  if (!listId) {
    throw new Error('listId is required to subscribe to list changes.');
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
