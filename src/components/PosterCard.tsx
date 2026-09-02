import React from 'react';
import { StyleSheet, Text, View, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Film } from 'lucide-react-native';
import { colors, fonts } from '../constants/theme';
import { getPosterUrl } from '../lib/tmdb';

interface PosterCardProps {
  movie: {
    id?: number;
    title: string;
    poster_path: string | null;
    release_date?: string;
  };
  width?: number;
  height?: number;
  onPress?: () => void;
}

export const PosterCard: React.FC<PosterCardProps> = ({
  movie,
  width = 140,
  height = 210,
  onPress,
}) => {
  const posterUrl = getPosterUrl(movie.poster_path, 'w342');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { width, height },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={movie.title}
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.fallback}>
          <Film color={colors.textTertiary} size={32} />
          <Text style={styles.fallbackText} numberOfLines={3}>
            {movie.title}
          </Text>
        </View>
      )}

      {/* Dark gradient overlay for legible title at footer */}
      <LinearGradient
        colors={['transparent', 'rgba(11, 10, 15, 0.45)', 'rgba(11, 10, 15, 0.95)']}
        locations={[0, 0.5, 1]}
        style={styles.gradientOverlay}
      >
        <Text style={styles.title} numberOfLines={2}>
          {movie.title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
    position: 'relative',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.bgSurface,
  },
  fallbackText: {
    marginTop: 8,
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
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
  title: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
