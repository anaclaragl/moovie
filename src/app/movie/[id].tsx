import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  ListPlus,
  Star,
  CheckCircle,
  Clock,
  Calendar,
  Film,
  RefreshCw,
} from 'lucide-react-native';
import { colors, fonts } from '../../constants/theme';
import { getProfileAvatar } from '../../constants/profiles';
import { useProfile } from '../../contexts/ProfileContext';
import { getMovieDetails, getMovieRecommendations, getPosterUrl } from '../../lib/tmdb';
import { getRatingsForMovie, toggleWatched } from '../../services/ratings';
import { Movie, MovieDetails, Rating } from '../../types';
import { RatingPill } from '../../components/RatingPill';
import { AddToListSheet } from '../../components/AddToListSheet';
import { ReviewSheet } from '../../components/ReviewSheet';
import { PosterCard } from '../../components/PosterCard';

export default function MovieDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const tmdbId = parseInt(params.id as string, 10);
  const { currentUser } = useProfile();

  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sheets state
  const [listSheetVisible, setListSheetVisible] = useState<boolean>(false);
  const [reviewSheetVisible, setReviewSheetVisible] = useState<boolean>(false);
  const [markingWatched, setMarkingWatched] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentUserRating = currentUser
    ? ratings.find((r) => r.user_key === currentUser.key)
    : null;
  const isWatchedByCurrentUser = !!currentUserRating?.watched;

  const loadData = useCallback(async () => {
    if (!tmdbId || isNaN(tmdbId)) {
      setError('ID de filme inválido.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch TMDB details, ratings, and recommendations in parallel
      const [movieData, ratingsData, recsData] = await Promise.all([
        getMovieDetails(tmdbId),
        getRatingsForMovie(tmdbId),
        getMovieRecommendations(tmdbId).catch(() => ({ results: [] as Movie[] })),
      ]);

      setMovie(movieData);
      setRatings(ratingsData);
      setRecommendations(recsData.results || []);
    } catch (err: any) {
      console.error('Failed to load movie details:', err);
      setError(err.message || 'Erro ao carregar detalhes do filme.');
    } finally {
      setLoading(false);
    }
  }, [tmdbId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleMarkWatched = async () => {
    if (!currentUser?.key || !tmdbId || markingWatched) return;

    const nextWatched = !isWatchedByCurrentUser;

    try {
      setMarkingWatched(true);
      const updatedRating = await toggleWatched(tmdbId, currentUser.key, nextWatched);

      // Update local ratings list
      setRatings((prev) => {
        const filtered = prev.filter((r) => r.user_key !== currentUser.key);
        if (nextWatched) {
          return [...filtered, updatedRating];
        }
        return filtered;
      });

      showToast(nextWatched ? 'Marcado como assistido!' : 'Desmarcado de assistidos!');
    } catch (err: any) {
      showToast('Erro ao atualizar status de assistido');
    } finally {
      setMarkingWatched(false);
    }
  };

  const handleReviewSuccess = (newRating: Rating) => {
    setRatings((prev) => {
      const filtered = prev.filter((r) => r.user_key !== newRating.user_key);
      return [...filtered, newRating];
    });
    showToast('Avaliação salva com sucesso!');
  };

  if (loading) {
    return (
      <View style={[styles.centerBox, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Carregando informações...</Text>
      </View>
    );
  }

  if (error || !movie) {
    return (
      <View style={[styles.centerBox, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>Filme não encontrado</Text>
        <Text style={styles.errorMessage}>{error || 'Não foi possível obter dados do TMDB.'}</Text>
        <Pressable style={styles.retryButton} onPress={loadData}>
          <RefreshCw size={16} color={colors.bgBase} />
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`
    : null;
  const posterUrl = getPosterUrl(movie.poster_path, 'w342');
  const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : '';
  const runtimeFormatted = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;
  const genresList = movie.genres?.map((g) => g.name).slice(0, 3).join(' • ');

  const anaRating = ratings.find((r) => r.user_key === 'ana');
  const luisaRating = ratings.find((r) => r.user_key === 'luisa');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Backdrop Header */}
        <View style={styles.backdropContainer}>
          {backdropUrl ? (
            <Image source={{ uri: backdropUrl }} style={styles.backdropImage} resizeMode="cover" />
          ) : (
            <View style={styles.backdropFallback} />
          )}

          {/* Dark gradient overlay */}
          <LinearGradient
            colors={['rgba(11, 10, 15, 0.2)', 'rgba(11, 10, 15, 0.7)', colors.bgBase]}
            locations={[0, 0.65, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Floating Back Button */}
          <Pressable
            onPress={() => router.back()}
            style={[styles.floatingBackButton, { top: insets.top + 10 }]}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Movie Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.posterAndMetaRow}>
            {/* Poster */}
            {posterUrl ? (
              <Image source={{ uri: posterUrl }} style={styles.posterImage} />
            ) : (
              <View style={styles.posterFallback}>
                <Film size={28} color={colors.textTertiary} />
              </View>
            )}

            {/* Title & Metadata */}
            <View style={styles.metaContainer}>
              <Text style={styles.movieTitle}>{movie.title}</Text>

              {movie.tagline ? (
                <Text style={styles.tagline}>"{movie.tagline}"</Text>
              ) : null}

              <View style={styles.tagsRow}>
                {releaseYear ? (
                  <View style={styles.metaBadge}>
                    <Calendar size={12} color={colors.textTertiary} />
                    <Text style={styles.metaBadgeText}>{releaseYear}</Text>
                  </View>
                ) : null}

                {runtimeFormatted ? (
                  <View style={styles.metaBadge}>
                    <Clock size={12} color={colors.textTertiary} />
                    <Text style={styles.metaBadgeText}>{runtimeFormatted}</Text>
                  </View>
                ) : null}
              </View>

              {genresList ? (
                <Text style={styles.genresText}>{genresList}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Sinopse Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Sinopse</Text>
          <Text style={styles.overviewText}>
            {movie.overview || 'Nenhuma sinopse disponível para este título.'}
          </Text>
        </View>

        {/* Avaliações Section (Same line divided by |) */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Avaliações</Text>

          <View style={styles.inlineRatingsCard}>
            {/* Cowana */}
            <View style={styles.inlineUserRating}>
              {getProfileAvatar('ana') ? (
                <Image
                  source={getProfileAvatar('ana')!}
                  style={[styles.inlineAvatar, { borderColor: colors.ana }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.inlineAvatarFallback, { backgroundColor: colors.anaSoft, borderColor: colors.ana }]}>
                  <Text style={[styles.inlineAvatarLetter, { color: colors.ana }]}>A</Text>
                </View>
              )}
              <Text style={styles.inlineUserName}>Cowana</Text>
              {anaRating?.score !== undefined && anaRating?.score !== null ? (
                <View style={styles.inlineScoreBadge}>
                  <Star size={13} color={colors.gold} fill={colors.gold} />
                  <Text style={styles.inlineScoreValue}>{anaRating.score.toFixed(1)}</Text>
                </View>
              ) : (
                <Text style={styles.inlineUnratedText}>
                  {anaRating?.watched ? 'assistiu' : 'não viu'}
                </Text>
              )}
            </View>

            {/* Divider: | */}
            <Text style={styles.inlinePipeDivider}>|</Text>

            {/* Cowluisa */}
            <View style={styles.inlineUserRating}>
              {getProfileAvatar('luisa') ? (
                <Image
                  source={getProfileAvatar('luisa')!}
                  style={[styles.inlineAvatar, { borderColor: colors.luisa }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.inlineAvatarFallback, { backgroundColor: colors.luisaSoft, borderColor: colors.luisa }]}>
                  <Text style={[styles.inlineAvatarLetter, { color: colors.luisa }]}>L</Text>
                </View>
              )}
              <Text style={styles.inlineUserName}>Cowluisa</Text>
              {luisaRating?.score !== undefined && luisaRating?.score !== null ? (
                <View style={styles.inlineScoreBadge}>
                  <Star size={13} color={colors.gold} fill={colors.gold} />
                  <Text style={styles.inlineScoreValue}>{luisaRating.score.toFixed(1)}</Text>
                </View>
              ) : (
                <Text style={styles.inlineUnratedText}>
                  {luisaRating?.watched ? 'assistiu' : 'não viu'}
                </Text>
              )}
            </View>
          </View>

          {/* Optional Reviews beneath the line */}
          {(anaRating?.review || luisaRating?.review) && (
            <View style={styles.reviewsWrapper}>
              {anaRating?.review ? (
                <View style={styles.reviewBubble}>
                  <Text style={[styles.reviewAuthor, { color: colors.ana }]}>Cowana:</Text>
                  <Text style={styles.reviewBody}>"{anaRating.review}"</Text>
                </View>
              ) : null}
              {luisaRating?.review ? (
                <View style={styles.reviewBubble}>
                  <Text style={[styles.reviewAuthor, { color: colors.luisa }]}>Cowluisa:</Text>
                  <Text style={styles.reviewBody}>"{luisaRating.review}"</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Recomendações Section */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Recomendações</Text>
            <Text style={styles.sectionSubheading}>
              Filmes similares que você pode curtir
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendationsListContent}
            >
              {recommendations.map((item) => (
                <View key={item.id} style={styles.recommendationCardWrapper}>
                  <PosterCard
                    movie={item}
                    width={130}
                    height={195}
                    onPress={() => {
                      router.push({
                        pathname: '/movie/[id]',
                        params: { id: item.id.toString() },
                      });
                    }}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Floating Toast Feedback */}
      {toastMessage && (
        <View style={[styles.toastContainer, { bottom: insets.bottom + 85 }]}>
          <CheckCircle size={16} color={colors.bgBase} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Fixed Bottom Toolbar (3 buttons) */}
      <View style={[styles.bottomToolbar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {/* Button 1: Lista */}
        <Pressable
          style={styles.toolbarButton}
          onPress={() => setListSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Adicionar à lista"
        >
          <ListPlus size={20} color={colors.textPrimary} />
          <Text style={styles.toolbarButtonText}>Lista</Text>
        </Pressable>

        {/* Button 2: Review */}
        <Pressable
          style={styles.toolbarButton}
          onPress={() => setReviewSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Escrever review"
        >
          <Star size={20} color={currentUserRating?.score ? colors.gold : colors.textPrimary} />
          <Text
            style={[
              styles.toolbarButtonText,
              Boolean(currentUserRating?.score) && { color: colors.gold },
            ]}
          >
            Review
          </Text>
        </Pressable>

        {/* Button 3: Assistido */}
        <Pressable
          style={[
            styles.toolbarButton,
            isWatchedByCurrentUser && styles.toolbarButtonWatched,
          ]}
          onPress={handleMarkWatched}
          disabled={markingWatched}
          accessibilityRole="button"
          accessibilityLabel="Marcar como assistido"
        >
          {markingWatched ? (
            <ActivityIndicator size="small" color={isWatchedByCurrentUser ? colors.bgBase : colors.gold} />
          ) : (
            <CheckCircle
              size={20}
              color={isWatchedByCurrentUser ? colors.bgBase : colors.gold}
            />
          )}
          <Text
            style={[
              styles.toolbarButtonText,
              isWatchedByCurrentUser && styles.toolbarButtonTextWatched,
            ]}
          >
            {isWatchedByCurrentUser ? 'Assistido' : 'Marcar visto'}
          </Text>
        </Pressable>
      </View>

      {/* Add To List Sheet */}
      {currentUser && (
        <AddToListSheet
          visible={listSheetVisible}
          onClose={() => setListSheetVisible(false)}
          tmdbId={tmdbId}
          movieTitle={movie.title}
          currentUserKey={currentUser.key}
          onSuccess={() => showToast('Adicionado à lista com sucesso!')}
        />
      )}

      {/* Review Sheet */}
      {currentUser && (
        <ReviewSheet
          visible={reviewSheetVisible}
          onClose={() => setReviewSheetVisible(false)}
          tmdbId={tmdbId}
          movieTitle={movie.title}
          currentUserKey={currentUser.key}
          initialScore={currentUserRating?.score}
          initialReview={currentUserRating?.review || ''}
          onSuccess={handleReviewSuccess}
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
  scrollView: {
    flex: 1,
  },
  centerBox: {
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
  backdropContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  backdropFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.bgElevated,
  },
  floatingBackButton: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(11, 10, 15, 0.75)',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  infoCard: {
    paddingHorizontal: 20,
    marginTop: -50,
  },
  posterAndMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  posterImage: {
    width: 100,
    height: 150,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  posterFallback: {
    width: 100,
    height: 150,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaContainer: {
    flex: 1,
    paddingBottom: 4,
  },
  movieTitle: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
  },
  tagline: {
    fontFamily: fonts.displayItalic,
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgSurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaBadgeText: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 12,
  },
  genresText: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionHeading: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 18,
    marginBottom: 10,
  },
  overviewText: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  inlineRatingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  inlineUserRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  inlineAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  inlineAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineAvatarLetter: {
    fontFamily: fonts.displaySemibold,
    fontSize: 14,
  },
  inlineUserName: {
    fontFamily: fonts.bodyMedium,
    color: colors.textPrimary,
    fontSize: 13,
  },
  inlineScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inlineScoreValue: {
    fontFamily: fonts.bodySemibold,
    color: colors.gold,
    fontSize: 12,
  },
  inlineUnratedText: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 11,
  },
  inlinePipeDivider: {
    color: colors.border,
    fontSize: 16,
    fontFamily: fonts.body,
    paddingHorizontal: 6,
  },
  reviewsWrapper: {
    marginTop: 10,
    gap: 6,
  },
  reviewBubble: {
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 6,
  },
  reviewAuthor: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
  },
  reviewBody: {
    fontFamily: fonts.displayItalic,
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99,
  },
  toastText: {
    fontFamily: fonts.bodySemibold,
    color: colors.bgBase,
    fontSize: 13,
  },
  bottomToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    paddingHorizontal: 20,
    gap: 12,
  },
  toolbarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
  },
  toolbarButtonWatched: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  toolbarButtonText: {
    fontFamily: fonts.bodyMedium,
    color: colors.textPrimary,
    fontSize: 13,
  },
  toolbarButtonTextWatched: {
    color: colors.bgBase,
    fontFamily: fonts.bodySemibold,
  },
  sectionSubheading: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 13,
    marginBottom: 14,
  },
  recommendationsListContent: {
    gap: 12,
  },
  recommendationCardWrapper: {
    marginRight: 4,
  },
});
