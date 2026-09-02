import Constants from 'expo-constants';
import { Movie, MovieDetails, TMDBPaginatedResponse } from '../types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const tmdbToken =
  process.env.EXPO_PUBLIC_TMDB_TOKEN ||
  (Constants.expoConfig?.extra?.tmdbToken as string | undefined) ||
  '';

export type PosterSize = 'w200' | 'w342' | 'w500';

/**
 * Builds the complete poster image URL or returns null if path is not provided.
 */
export function getPosterUrl(
  path: string | null | undefined,
  size: PosterSize = 'w342'
): string | null {
  if (!path) {
    return null;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE_URL}/${size}${cleanPath}`;
}

/**
 * Helper function to perform authenticated requests to the TMDB v3 API.
 */
async function tmdbFetch<T>(endpoint: string, searchParams?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const token = tmdbToken.trim();
  if (!token) {
    throw new Error('TMDB token is missing. Please check your EXPO_PUBLIC_TMDB_TOKEN configuration.');
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`TMDB HTTP error ${response.status}: ${response.statusText || errorBody}`);
    }

    const data: T = await response.json();
    return data;
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Unknown TMDB network error';
    throw new Error(`TMDB request failed for endpoint "${endpoint}": ${message}`);
  }
}

/**
 * Fetches popular movies from TMDB.
 * GET /movie/popular
 */
export async function getPopularMovies(page = 1): Promise<TMDBPaginatedResponse<Movie>> {
  try {
    return await tmdbFetch<TMDBPaginatedResponse<Movie>>('/movie/popular', { page });
  } catch (error: any) {
    throw new Error(`Failed to get popular movies: ${error.message}`);
  }
}

/**
 * Fetches weekly or daily trending movies from TMDB.
 * Updates automatically on TMDB's servers every week/day.
 * GET /trending/movie/{time_window}
 */
export async function getTrendingMovies(
  timeWindow: 'day' | 'week' = 'week',
  page = 1
): Promise<TMDBPaginatedResponse<Movie>> {
  try {
    return await tmdbFetch<TMDBPaginatedResponse<Movie>>(`/trending/movie/${timeWindow}`, { page });
  } catch (error: any) {
    throw new Error(`Failed to get trending movies: ${error.message}`);
  }
}

/**
 * Fetches movie details by TMDB ID, appending credits (cast and crew).
 * GET /movie/{id}?append_to_response=credits
 */
export async function getMovieDetails(tmdbId: number): Promise<MovieDetails> {
  if (!tmdbId) {
    throw new Error('Valid tmdbId is required to fetch movie details.');
  }
  try {
    return await tmdbFetch<MovieDetails>(`/movie/${tmdbId}`, {
      append_to_response: 'credits',
    });
  } catch (error: any) {
    throw new Error(`Failed to get movie details for ID ${tmdbId}: ${error.message}`);
  }
}

/**
 * Searches for movies matching the query string.
 * GET /search/movie
 */
export async function searchMovies(query: string, page = 1): Promise<TMDBPaginatedResponse<Movie>> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    };
  }

  try {
    return await tmdbFetch<TMDBPaginatedResponse<Movie>>('/search/movie', {
      query: trimmedQuery,
      page,
    });
  } catch (error: any) {
    throw new Error(`Failed to search movies for query "${query}": ${error.message}`);
  }
}

/**
 * Fetches recommended movies for a movie by TMDB ID.
 * GET /movie/{id}/recommendations with fallback to GET /movie/{id}/similar
 */
export async function getMovieRecommendations(
  tmdbId: number,
  page = 1
): Promise<TMDBPaginatedResponse<Movie>> {
  if (!tmdbId) {
    throw new Error('Valid tmdbId is required to fetch recommendations.');
  }
  try {
    const res = await tmdbFetch<TMDBPaginatedResponse<Movie>>(`/movie/${tmdbId}/recommendations`, { page });
    if (res.results && res.results.length > 0) {
      return res;
    }
    // Fallback to similar if recommendations returned an empty list
    return await tmdbFetch<TMDBPaginatedResponse<Movie>>(`/movie/${tmdbId}/similar`, { page });
  } catch (error: any) {
    throw new Error(`Failed to get recommendations for ID ${tmdbId}: ${error.message}`);
  }
}
