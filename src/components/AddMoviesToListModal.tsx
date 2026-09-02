import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Search, X, Plus, Check, Film, Star, Sparkles, Flame } from 'lucide-react-native';
import { colors, fonts } from '../constants/theme';
import { getPopularMovies, getMovieRecommendations, searchMovies, getPosterUrl } from '../lib/tmdb';
import { addMovieToList } from '../services/lists';
import { Movie } from '../types';

interface AddMoviesToListModalProps {
  visible: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
  existingMovieIds: Set<number>;
  existingMovies: { tmdb_id: number; title: string }[];
  currentUserKey: string;
  onMovieAdded?: (tmdbId: number) => void;
}

export const AddMoviesToListModal: React.FC<AddMoviesToListModalProps> = ({
  visible,
  onClose,
  listId,
  listName,
  existingMovieIds,
  existingMovies,
  currentUserKey,
  onMovieAdded,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  // Recommendations state
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const [recSourceTitle, setRecSourceTitle] = useState<string | null>(null);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);

  // Set of locally added movie IDs for immediate feedback
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [addingId, setAddingId] = useState<number | null>(null);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSearchResults([]);
      setAddedIds(new Set(existingMovieIds));
      loadRecommendations();
    }
  }, [visible, listId]);

  async function loadRecommendations() {
    try {
      setLoadingRecs(true);

      if (existingMovies && existingMovies.length > 0) {
        // Base recommendation on the latest movie added to the list
        const baseMovie = existingMovies[0];
        setRecSourceTitle(baseMovie.title);

        const recData = await getMovieRecommendations(baseMovie.tmdb_id, 1);
        setRecommendedMovies(recData.results || []);
      } else {
        // List is empty: recommend popular movies
        setRecSourceTitle(null);
        const popularData = await getPopularMovies(1);
        setRecommendedMovies(popularData.results || []);
      }
    } catch (err) {
      console.warn('Failed to load modal recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  }

  // Debounced search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const handler = setTimeout(async () => {
      try {
        const data = await searchMovies(trimmed, 1);
        setSearchResults(data.results || []);
      } catch (err) {
        console.error('Failed to search in modal:', err);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const handleAddMovie = async (movie: Movie) => {
    if (!listId || !currentUserKey || addedIds.has(movie.id) || addingId === movie.id) {
      return;
    }

    try {
      setAddingId(movie.id);
      await addMovieToList(listId, movie.id, currentUserKey);

      setAddedIds((prev) => {
        const next = new Set(prev);
        next.add(movie.id);
        return next;
      });

      onMovieAdded?.(movie.id);
    } catch (err) {
      console.error('Failed to add movie to list:', err);
    } finally {
      setAddingId(null);
    }
  };

  if (!visible) return null;

  const isSearchActive = searchQuery.trim().length > 0;
  const displayList = isSearchActive ? searchResults : recommendedMovies;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Adicionar Filmes</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Lista: {listName}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Search Bar in modal */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={18} color={colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Pesquisar filmes por título..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                  <X size={16} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Section Subheading */}
          <View style={styles.sectionHeader}>
            {isSearchActive ? (
              <Text style={styles.sectionTitle}>
                {searching ? 'Buscando filmes...' : `Resultados da pesquisa (${searchResults.length})`}
              </Text>
            ) : recSourceTitle ? (
              <View style={styles.recTitleRow}>
                <Sparkles size={16} color={colors.gold} />
                <Text style={styles.sectionTitle} numberOfLines={1}>
                  Recomendados com base em "{recSourceTitle}"
                </Text>
              </View>
            ) : (
              <View style={styles.recTitleRow}>
                <Flame size={16} color={colors.gold} />
                <Text style={styles.sectionTitle}>
                  Populares da semana (lista vazia)
                </Text>
              </View>
            )}
          </View>

          {/* Content List */}
          {(searching || loadingRecs) && displayList.length === 0 ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={styles.loadingText}>
                {searching ? 'Pesquisando filmes...' : 'Carregando recomendações...'}
              </Text>
            </View>
          ) : isSearchActive && !searching && searchResults.length === 0 ? (
            <View style={styles.centerBox}>
              <Film size={40} color={colors.textTertiary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>Nenhum filme encontrado para "{searchQuery}"</Text>
            </View>
          ) : (
            <FlatList
              data={displayList}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const posterUrl = getPosterUrl(item.poster_path, 'w200');
                const year = item.release_date ? item.release_date.split('-')[0] : '';
                const isAdded = addedIds.has(item.id);
                const isAddingThis = addingId === item.id;

                return (
                  <View style={styles.movieRow}>
                    {posterUrl ? (
                      <Image source={{ uri: posterUrl }} style={styles.poster} />
                    ) : (
                      <View style={styles.posterFallback}>
                        <Film size={20} color={colors.textTertiary} />
                      </View>
                    )}

                    <View style={styles.movieInfo}>
                      <Text style={styles.movieTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <View style={styles.metaRow}>
                        {year ? <Text style={styles.yearText}>{year}</Text> : null}
                        {item.vote_average ? (
                          <View style={styles.ratingBadge}>
                            <Star size={11} color={colors.gold} fill={colors.gold} />
                            <Text style={styles.ratingText}>{item.vote_average.toFixed(1)}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Add / Added Button */}
                    <Pressable
                      onPress={() => handleAddMovie(item)}
                      disabled={isAdded || isAddingThis}
                      style={[
                        styles.actionButton,
                        isAdded && styles.actionButtonAdded,
                        isAddingThis && styles.actionButtonLoading,
                      ]}
                    >
                      {isAddingThis ? (
                        <ActivityIndicator size="small" color={colors.bgBase} />
                      ) : isAdded ? (
                        <View style={styles.addedContent}>
                          <Check size={14} color={colors.gold} strokeWidth={3} />
                          <Text style={styles.addedText}>Na lista</Text>
                        </View>
                      ) : (
                        <View style={styles.addContent}>
                          <Plus size={15} color={colors.bgBase} strokeWidth={2.5} />
                          <Text style={styles.addText}>Adicionar</Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    height: '88%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 20,
  },
  subtitle: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    fontSize: 14,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  recTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemibold,
    color: colors.gold,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 10,
  },
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  poster: {
    width: 52,
    height: 76,
    borderRadius: 8,
    backgroundColor: colors.bgSurface,
  },
  posterFallback: {
    width: 52,
    height: 76,
    borderRadius: 8,
    backgroundColor: colors.bgSurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  movieTitle: {
    fontFamily: fonts.bodySemibold,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  yearText: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontFamily: fonts.bodySemibold,
    color: colors.gold,
    fontSize: 11,
  },
  actionButton: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonAdded: {
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  actionButtonLoading: {
    opacity: 0.7,
  },
  addContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addText: {
    fontFamily: fonts.bodySemibold,
    color: colors.bgBase,
    fontSize: 12,
  },
  addedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addedText: {
    fontFamily: fonts.bodySemibold,
    color: colors.gold,
    fontSize: 12,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  emptyText: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
