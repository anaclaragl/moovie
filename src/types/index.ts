export type ProfileKey = 'ana' | 'luisa';

export interface Profile {
  key: ProfileKey | string;
  display_name: string;
  color_hex: string;
}

export type ListType = 'solo' | 'cooperative';

export interface MovieList {
  id: string;
  name: string;
  type: ListType;
  owner_key: string | null;
  created_at: string;
}

export interface ListItem {
  id: string;
  list_id: string;
  tmdb_id: number;
  added_by: string;
  added_at: string;
}

export interface ListItemWithMovie extends ListItem {
  movie: MovieDetails | null;
}

export interface Rating {
  id?: string;
  tmdb_id: number;
  user_key: string;
  score?: number;
  watched: boolean;
  review?: string | null;
  updated_at?: string;
}

export interface RatingUpsertData {
  score?: number | null;
  watched?: boolean;
  review?: string | null;
}

export interface WatchedMovieItem {
  rating: Rating;
  movie: MovieDetails | null;
}

export interface WatchEvent {
  id?: string;
  user_key: string;
  tmdb_id: number;
  watched_on: string;
}

export interface MovieGenre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order?: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path?: string | null;
}

export interface MovieCredits {
  cast: CastMember[];
  crew: CrewMember[];
}

export interface Movie {
  id: number;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  popularity?: number;
  adult?: boolean;
  video?: boolean;
  original_language?: string;
}

export interface MovieDetails extends Movie {
  genres?: MovieGenre[];
  runtime?: number | null;
  tagline?: string | null;
  status?: string;
  budget?: number;
  revenue?: number;
  credits?: MovieCredits;
}

export interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}
