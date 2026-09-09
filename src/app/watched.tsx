import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, X, Film, Star, MessageSquareQuote, RefreshCw, Flame } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../constants/theme';
import { useProfile } from '../contexts/ProfileContext';
import { getUserWatchedMovies } from '../services/ratings';
import { getCurrentStreak } from '../services/streak';
import { WatchedMovieItem } from '../types';
import { getPosterUrl } from '../lib/tmdb';

export default function WatchedMoviesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { currentUser } = useProfile();

  const [items, setItems] = useState<WatchedMovieItem[]>([]);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!currentUser?.key) return;

    try {
      setError(null);
      const [watchedData, streak] = await Promise.all([
        getUserWatchedMovies(currentUser.key),
        getCurrentStreak(currentUser.key).catch(() => 0),
      ]);
      setItems(watchedData);
      setStreakCount(streak);
    } catch (err: any) {
      console.error('Failed to load watched movies:', err);
      setError(err.message || 'Erro ao carregar filmes assistidos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.key]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const title = item.movie?.title?.toLowerCase() || '';
      const originalTitle = item.movie?.original_title?.toLowerCase() || '';
      const genres = item.movie?.genres?.map((g) => g.name.toLowerCase()).join(' ') || '';
      const review = item.rating.review?.toLowerCase() || '';

      return (
        title.includes(query) ||
        originalTitle.includes(query) ||
        genres.includes(query) ||
        review.includes(query)
      );
    });
  }, [items, searchQuery]);

  const handleMoviePress = (tmdbId: number) => {
    router.push({
      pathname: '/movie/[id]',
      params: { id: tmdbId.toString() },
    });
  };

  // 2 columns calculation
  const horizontalPadding = 16;
  const columnGap = 12;
  const cardWidth = Math.floor((windowWidth - horizontalPadding * 2 - columnGap) / 2);
  const cardHeight = Math.floor(cardWidth * 1.5);

  const renderItem = ({ item }: { item: WatchedMovieItem }) => {
    const movie = item.movie;
    if (!movie) return null;

    const posterUrl = getPosterUrl(movie.poster_path, 'w342');
    const hasScore = item.rating.score !== undefined && item.rating.score !== null;
    const hasReview = !!item.rating.review;
    const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : '';

    return (
      <Pressable
        onPress={() => handleMoviePress(movie.id)}
        style={({ pressed }) => [
          styles.card,
          { width: cardWidth, height: cardHeight },
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${movie.title}${hasScore ? `, Nota ${item.rating.score}` : ''}`}
      >
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.fallbackPoster}>
            <Film size={28} color={colors.textTertiary} />
            <Text style={styles.fallbackTitle} numberOfLines={2}>
              {movie.title}
            </Text>
          </View>
        )}

        {/* Top badge row: Score & Review Indicator */}
        <View style={styles.topBadgesRow}>
          {hasScore ? (
            <View style={styles.scoreBadge}>
              <Star size={11} color={colors.gold} fill={colors.gold} />
              <Text style={styles.scoreText}>{item.rating.score!.toFixed(1)}</Text>
            </View>
          ) : (
            <View style={styles.watchedBadge}>
              <Text style={styles.watchedBadgeText}>Assistido</Text>
            </View>
          )}

          {hasReview && (
            <View style={styles.reviewBadge}>
              <MessageSquareQuote size={12} color={colors.textPrimary} />
            </View>
          )}
        </View>

        {/* Bottom gradient with title and year */}
        <LinearGradient
          colors={['transparent', 'rgba(11, 10, 15, 0.5)', 'rgba(11, 10, 15, 0.95)']}
          locations={[0, 0.45, 1]}
          style={styles.gradientOverlay}
        >
          <Text style={styles.movieTitle} numberOfLines={2}>
            {movie.title}
          </Text>
          {releaseYear ? <Text style={styles.movieYear}>{releaseYear}</Text> : null}
        </LinearGradient>
      </Pressable>
    );
  };

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
          <ArrowLeft size={20} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Filmes Assistidos</Text>
          <Text style={styles.headerSubtitle}>
            {items.length} {items.length === 1 ? 'filme registrado' : 'filmes registrados'}
          </Text>
        </View>

        {/* Streak Pill */}
        <View style={styles.streakPill}>
          <Flame size={15} color={colors.gold} fill={streakCount > 0 ? colors.gold : 'transparent'} />
          <Text style={styles.streakText}>{streakCount}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={17} color={colors.textTertiary} style={{ marginLeft: 4 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por título ou gênero..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
            >
              <X size={15} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Main Content */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Carregando filmes assistidos...</Text>
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadData}>
            <RefreshCw size={16} color={colors.bgBase} />
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.rating.id || `${item.rating.tmdb_id}`}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
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
              <Film size={44} color={colors.textTertiary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'Nenhum filme encontrado' : 'Nenhum filme assistido ainda'}
              </Text>
              <Text style={styles.emptyDescription}>
                {searchQuery
                  ? `Não encontramos resultados para "${searchQuery}". Tente buscar por outro termo.`
                  : 'Marque filmes como assistidos ou dê uma nota para acompanhar seu histórico aqui!'}
              </Text>
            </View>
          }
        />
      )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgSurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 19,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  streakText: {
    fontFamily: fonts.bodySemibold,
    color: colors.gold,
    fontSize: 13,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgSurface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 14,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
    position: 'relative',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  fallbackPoster: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.bgSurface,
  },
  fallbackTitle: {
    marginTop: 8,
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
  },
  topBadgesRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(22, 20, 28, 0.9)',
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreText: {
    fontFamily: fonts.bodySemibold,
    color: colors.gold,
    fontSize: 11,
  },
  watchedBadge: {
    backgroundColor: 'rgba(22, 20, 28, 0.85)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  watchedBadgeText: {
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    fontSize: 10,
  },
  reviewBadge: {
    backgroundColor: 'rgba(22, 20, 28, 0.9)',
    borderWidth: 1,
    borderColor: colors.border,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  movieTitle: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  movieYear: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
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
    fontSize: 17,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
