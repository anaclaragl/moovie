import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Film, RefreshCw, Plus, Trash2, Check } from 'lucide-react-native';
import { colors, fonts } from '../../constants/theme';
import { useProfile } from '../../contexts/ProfileContext';
import { getListItemsWithMovies, removeMovieFromList, subscribeToList } from '../../services/lists';
import { getWatchedMovieIds } from '../../services/ratings';
import { ListItemWithMovie } from '../../types';
import { PosterCard } from '../../components/PosterCard';
import { AddMoviesToListModal } from '../../components/AddMoviesToListModal';

export default function ListDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { currentUser } = useProfile();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const listId = params.id as string;
  const listName = (params.name as string) || 'Detalhes da Lista';

  const [items, setItems] = useState<ListItemWithMovie[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);

  // Movie to remove confirmation state
  const [movieToRemove, setMovieToRemove] = useState<ListItemWithMovie | null>(null);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  const loadItems = useCallback(async () => {
    if (!listId) return;

    try {
      setError(null);
      const data = await getListItemsWithMovies(listId);

      // Check which movies are watched/rated
      const tmdbIds = data.map((d) => d.tmdb_id);
      const watched = await getWatchedMovieIds(tmdbIds);

      // Sort: unwatched first, watched movies pushed to the end
      const sorted = [...data].sort((a, b) => {
        const aWatched = watched.has(a.tmdb_id);
        const bWatched = watched.has(b.tmdb_id);
        if (aWatched && !bWatched) return 1;  // a goes after b
        if (!aWatched && bWatched) return -1; // a goes before b
        return 0; // retain chronological order within same status
      });

      setItems(sorted);
      setWatchedIds(watched);
    } catch (err: any) {
      console.error('Failed to load list items:', err);
      setError(err.message || 'Erro ao carregar os filmes desta lista.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [listId]);

  useEffect(() => {
    loadItems();

    if (!listId) return;

    // Realtime subscription for list_items changes (INSERT, DELETE)
    const unsubscribe = subscribeToList(listId, (_payload) => {
      // Re-fetch enriched items on any changes
      loadItems();
    });

    return () => {
      unsubscribe();
    };
  }, [listId, loadItems]);

  const onRefresh = () => {
    setRefreshing(true);
    loadItems();
  };

  const handleMoviePress = (tmdbId: number) => {
    router.push({
      pathname: '/movie/[id]',
      params: { id: tmdbId.toString() },
    });
  };

  const handleConfirmRemove = async () => {
    if (!movieToRemove) return;
    try {
      setIsRemoving(true);
      const targetTmdbId = movieToRemove.tmdb_id;

      // Optimistic update: remove from local items immediately
      setItems((prev) => prev.filter((item) => item.tmdb_id !== targetTmdbId));
      setMovieToRemove(null);

      await removeMovieFromList(listId, targetTmdbId);
    } catch (err: any) {
      console.error('Failed to remove movie from list:', err);
      loadItems();
    } finally {
      setIsRemoving(false);
    }
  };

  // 2 columns calculation
  const horizontalPadding = 20;
  const columnGap = 14;
  const cardWidth = Math.floor((windowWidth - horizontalPadding * 2 - columnGap) / 2);
  const cardHeight = Math.floor(cardWidth * 1.5);

  const watchedCount = items.filter((i) => watchedIds.has(i.tmdb_id)).length;
  const subtitleText =
    items.length === 0
      ? '0 filmes'
      : watchedCount > 0
      ? `${items.length} ${items.length === 1 ? 'filme' : 'filmes'} • ${watchedCount} assistido${watchedCount === 1 ? '' : 's'}`
      : `${items.length} ${items.length === 1 ? 'filme' : 'filmes'} adicionados`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerTextContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {listName}
          </Text>
          <Text style={styles.subtitle}>{subtitleText}</Text>
        </View>

        {/* Button: Adicionar Filmes */}
        <Pressable
          onPress={() => setAddModalVisible(true)}
          style={styles.addMoviesBtn}
          accessibilityRole="button"
          accessibilityLabel="Adicionar filmes"
        >
          <Plus size={16} color={colors.bgBase} strokeWidth={2.5} />
          <Text style={styles.addMoviesBtnText}>Adicionar</Text>
        </Pressable>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Carregando filmes da lista...</Text>
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadItems}>
            <RefreshCw size={16} color={colors.bgBase} />
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
              colors={[colors.gold]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Film size={44} color={colors.textTertiary} style={{ marginBottom: 14 }} />
              <Text style={styles.emptyTitle}>Nenhum filme na lista</Text>
              <Text style={styles.emptyDescription}>
                Adicione filmes baseados nos seus favoritos ou pesquise qualquer título do TMDB!
              </Text>
              <Pressable
                onPress={() => setAddModalVisible(true)}
                style={styles.emptyAddBtn}
              >
                <Plus size={16} color={colors.bgBase} strokeWidth={2.5} />
                <Text style={styles.emptyAddBtnText}>Adicionar filmes</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const movie = item.movie || {
              id: item.tmdb_id,
              title: `Filme #${item.tmdb_id}`,
              poster_path: null,
            };
            const isWatched = watchedIds.has(item.tmdb_id);

            return (
              <View style={[styles.cardItemWrapper, { width: cardWidth }]}>
                <View style={[styles.cardRelative, isWatched && styles.cardWatchedDim]}>
                  <PosterCard
                    movie={movie}
                    width={cardWidth}
                    height={cardHeight}
                    onPress={() => handleMoviePress(item.tmdb_id)}
                  />

                  {/* Remove Button in top right corner */}
                  <Pressable
                    style={styles.deleteCardBtn}
                    onPress={() => setMovieToRemove(item)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${movie.title} da lista`}
                  >
                    <Trash2 size={12} color="#FF6B6B" />
                  </Pressable>

                  {/* Watched Badge */}
                  {isWatched && (
                    <View style={styles.watchedBadge}>
                      <Check size={11} color={colors.gold} strokeWidth={3} />
                      <Text style={styles.watchedBadgeText}>Assistido</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modal: Adicionar Filmes */}
      {currentUser && (
        <AddMoviesToListModal
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          listId={listId}
          listName={listName}
          existingMovieIds={new Set(items.map((i) => i.tmdb_id))}
          existingMovies={items.map((i) => ({
            tmdb_id: i.tmdb_id,
            title: i.movie?.title || '',
          }))}
          currentUserKey={currentUser.key}
          onMovieAdded={() => loadItems()}
        />
      )}

      {/* Modal: Confirmação de Remoção de Filme */}
      <Modal
        visible={movieToRemove !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setMovieToRemove(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMovieToRemove(null)}>
          <Pressable style={styles.removeModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.removeModalIconCircle}>
              <Trash2 size={24} color="#FF6B6B" />
            </View>

            <Text style={styles.removeModalTitle}>Remover filme</Text>
            <Text style={styles.removeModalMessage}>
              Deseja remover "{movieToRemove?.movie?.title || 'este filme'}" da lista "{listName}"?
            </Text>

            <View style={styles.removeModalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setMovieToRemove(null)}
                disabled={isRemoving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={styles.confirmRemoveButton}
                onPress={handleConfirmRemove}
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmRemoveButtonText}>Remover</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 20,
  },
  subtitle: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  columnWrapper: {
    gap: 14,
    marginBottom: 16,
  },
  cardItemWrapper: {
    alignItems: 'center',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    fontFamily: fonts.body,
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.gold,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontFamily: fonts.bodySemibold,
    color: colors.bgBase,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 18,
    marginBottom: 8,
  },
  emptyDescription: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addMoviesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addMoviesBtnText: {
    fontFamily: fonts.bodySemibold,
    color: colors.bgBase,
    fontSize: 13,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.gold,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyAddBtnText: {
    fontFamily: fonts.bodySemibold,
    color: colors.bgBase,
    fontSize: 14,
  },
  cardRelative: {
    position: 'relative',
  },
  cardWatchedDim: {
    opacity: 0.78,
  },
  deleteCardBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(11, 10, 15, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  watchedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(11, 10, 15, 0.85)',
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 5,
  },
  watchedBadgeText: {
    fontFamily: fonts.bodySemibold,
    color: colors.gold,
    fontSize: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  removeModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bgSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    alignItems: 'center',
  },
  removeModalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  removeModalTitle: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 19,
    marginBottom: 8,
  },
  removeModalMessage: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  removeModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    fontSize: 14,
  },
  confirmRemoveButton: {
    flex: 1,
    backgroundColor: '#D94343',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmRemoveButtonText: {
    fontFamily: fonts.bodySemibold,
    color: '#fff',
    fontSize: 14,
  },
});
