import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TextInput,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, RefreshCw, Film, Search, X, User } from 'lucide-react-native';
import { colors, fonts } from '../../constants/theme';
import { useProfile } from '../../contexts/ProfileContext';
import { getPopularMovies, getTrendingMovies, getPosterUrl, searchMovies } from '../../lib/tmdb';
import { getProfileAvatar } from '../../constants/profiles';
import { getUnratedPopular } from '../../services/ratings';
import { Movie } from '../../types';
import { PosterCard } from '../../components/PosterCard';
import { StreakBadge } from '../../components/StreakBadge';
import { ProfileSwitchModal } from '../../components/ProfileSwitchModal';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { currentUser } = useProfile();

  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [unratedMovies, setUnratedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  // Profile switch modal state
  const [profileModalVisible, setProfileModalVisible] = useState<boolean>(false);

  const loadHomeData = useCallback(async () => {
    if (!currentUser?.key) return;

    try {
      setError(null);
      const trendingData = await getTrendingMovies('week', 1).catch(() => getPopularMovies(1));
      const movies = trendingData.results || [];
      setPopularMovies(movies);

      // Check unrated among popular
      const movieIds = movies.map((m) => m.id);
      const unratedIds = await getUnratedPopular(currentUser.key, movieIds);
      const unratedSet = new Set(unratedIds);
      const filtered = movies.filter((m) => unratedSet.has(m.id));
      setUnratedMovies(filtered);
    } catch (err: any) {
      console.error('Failed to load home data:', err);
      setError(err.message || 'Erro ao carregar os filmes. Verifique sua conexão.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.key]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  // Debounced search effect
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
        console.error('Failed to search movies:', err);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const handleMoviePress = (movieId: number) => {
    router.push({
      pathname: '/movie/[id]',
      params: { id: movieId.toString() },
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Buscando os melhores filmes...</Text>
      </View>
    );
  }

  if (error && popularMovies.length === 0) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>Ops! Algo deu errado</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadHomeData}>
          <RefreshCw size={16} color={colors.bgBase} />
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  const isAna = currentUser?.key === 'ana';
  const greeting = isAna ? 'Olá, Cowana' : currentUser?.key === 'luisa' ? 'Oi, Cowluisa' : `Olá, ${currentUser?.display_name}`;
  const accentColor = isAna ? colors.ana : colors.luisa;
  const initial = isAna ? 'A' : 'L';

  // Search results grid dimensions
  const searchColWidth = Math.floor((windowWidth - 40 - 12) / 2);
  const searchColHeight = Math.floor(searchColWidth * 1.5);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.subGreeting}>O que vamos assistir hoje?</Text>
          </View>

          <View style={styles.headerRightRow}>
            {currentUser?.key && <StreakBadge userKey={currentUser.key} />}

            {/* Avatar / Profile switcher button */}
            <Pressable
              onPress={() => setProfileModalVisible(true)}
              style={[styles.profileButton, { borderColor: accentColor }]}
              accessibilityRole="button"
              accessibilityLabel="Trocar de perfil ou sair"
            >
              {currentUser?.key && getProfileAvatar(currentUser.key) ? (
                <Image
                  source={getProfileAvatar(currentUser.key)!}
                  style={styles.profileAvatarImg}
                  resizeMode="cover"
                />
              ) : (
                <Text style={[styles.profileInitial, { color: accentColor }]}>{initial}</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar filmes por título..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={clearSearch} style={styles.clearSearchBtn}>
                <X size={16} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Dynamic Content: Search Results OR Home Sections */}
        {searchQuery.trim().length > 0 ? (
          <View style={styles.searchResultsSection}>
            <View style={styles.searchResultsHeader}>
              <Text style={styles.searchResultsTitle}>
                {searching ? 'Buscando...' : `Resultados para "${searchQuery}"`}
              </Text>
              {!searching && (
                <Text style={styles.searchResultsCount}>
                  {searchResults.length} {searchResults.length === 1 ? 'filme' : 'filmes'}
                </Text>
              )}
            </View>

            {searching ? (
              <View style={styles.searchLoading}>
                <ActivityIndicator size="small" color={colors.gold} />
              </View>
            ) : searchResults.length === 0 ? (
              <View style={styles.searchEmpty}>
                <Film size={36} color={colors.textTertiary} style={{ marginBottom: 10 }} />
                <Text style={styles.searchEmptyText}>Nenhum filme encontrado para "{searchQuery}"</Text>
              </View>
            ) : (
              <View style={styles.searchGrid}>
                {searchResults.map((item) => (
                  <View key={item.id} style={{ width: searchColWidth }}>
                    <PosterCard
                      movie={item}
                      width={searchColWidth}
                      height={searchColHeight}
                      onPress={() => handleMoviePress(item.id)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Populares esta semana */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Populares esta semana</Text>
              </View>

              <FlatList
                horizontal
                data={popularMovies}
                keyExtractor={(item) => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalListContent}
                renderItem={({ item }) => (
                  <View style={styles.posterWrapper}>
                    <PosterCard
                      movie={item}
                      width={145}
                      height={215}
                      onPress={() => handleMoviePress(item.id)}
                    />
                  </View>
                )}
              />
            </View>

            {/* Vocês ainda não avaliaram */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Vocês ainda não avaliaram</Text>
                <Text style={styles.sectionSubtitle}>Filmes em alta aguardando sua nota</Text>
              </View>

              {unratedMovies.length === 0 ? (
                <View style={styles.emptyUnrated}>
                  <Text style={styles.emptyUnratedText}>
                    Parabéns! Você já avaliou todos os filmes populares recentes!
                  </Text>
                </View>
              ) : (
                <View style={styles.unratedList}>
                  {unratedMovies.map((movie) => {
                    const posterUrl = getPosterUrl(movie.poster_path, 'w200');
                    const year = movie.release_date ? movie.release_date.split('-')[0] : '';
                    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;

                    return (
                      <Pressable
                        key={movie.id}
                        onPress={() => handleMoviePress(movie.id)}
                        style={({ pressed }) => [
                          styles.unratedRow,
                          pressed && styles.unratedRowPressed,
                        ]}
                      >
                        {posterUrl ? (
                          <Image source={{ uri: posterUrl }} style={styles.unratedPoster} />
                        ) : (
                          <View style={styles.unratedFallback}>
                            <Film size={20} color={colors.textTertiary} />
                          </View>
                        )}

                        <View style={styles.unratedInfo}>
                          <Text style={styles.unratedTitle} numberOfLines={2}>
                            {movie.title}
                          </Text>

                          <View style={styles.unratedMeta}>
                            {year ? <Text style={styles.unratedYear}>{year}</Text> : null}
                            {rating && (
                              <View style={styles.unratedScoreBadge}>
                                <Star size={12} color={colors.gold} fill={colors.gold} />
                                <Text style={styles.unratedScoreText}>{rating}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Profile Switch & Logout Modal */}
      <ProfileSwitchModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 110, // Safe distance above custom tab bar
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.bgBase,
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
  errorTitle: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 20,
    marginBottom: 8,
  },
  errorMessage: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  subGreeting: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileAvatarImg: {
    width: '100%',
    height: '100%',
  },
  profileInitial: {
    fontFamily: fonts.displaySemibold,
    fontSize: 16,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
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
  clearSearchBtn: {
    padding: 4,
  },
  searchResultsSection: {
    paddingHorizontal: 20,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchResultsTitle: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 18,
  },
  searchResultsCount: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 13,
  },
  searchLoading: {
    padding: 32,
    alignItems: 'center',
  },
  searchEmpty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  searchEmptyText: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  searchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  horizontalListContent: {
    paddingHorizontal: 20,
    gap: 14,
  },
  posterWrapper: {
    marginRight: 2,
  },
  unratedList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  unratedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  unratedRowPressed: {
    opacity: 0.8,
    backgroundColor: colors.bgElevated,
  },
  unratedPoster: {
    width: 56,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.bgElevated,
  },
  unratedFallback: {
    width: 56,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unratedInfo: {
    flex: 1,
    marginLeft: 14,
  },
  unratedTitle: {
    fontFamily: fonts.bodySemibold,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
  },
  unratedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  unratedYear: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 13,
  },
  unratedScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unratedScoreText: {
    fontFamily: fonts.bodySemibold,
    color: colors.gold,
    fontSize: 12,
  },
  emptyUnrated: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyUnratedText: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
