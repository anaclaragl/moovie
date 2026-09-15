import { supabase } from '../lib/supabase';

/**
 * Retorna o total de filmes assistidos pelo usuário.
 */
export async function getCurrentStreak(userKey: string): Promise<number> {
  if (!userKey) {
    throw new Error('userKey is required to calculate watched count.');
  }

  try {
    const { count, error } = await supabase
      .from('ratings')
      .select('*', { count: 'exact', head: true })
      .eq('user_key', userKey)
      .eq('watched', true);

    if (error) {
      throw new Error(`Failed to fetch watched movies count: ${error.message}`);
    }

    return count ?? 0;
  } catch (error: any) {
    throw new Error(`Error in getCurrentStreak: ${error.message}`);
  }
}
