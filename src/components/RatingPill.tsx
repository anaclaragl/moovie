import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors, fonts } from '../constants/theme';
import { getProfileAvatar } from '../constants/profiles';

interface RatingPillProps {
  userKey: 'ana' | 'luisa' | string;
  score: number | null | undefined;
  review?: string | null;
  watched?: boolean;
}

export const RatingPill: React.FC<RatingPillProps> = ({
  userKey,
  score,
  review,
  watched = false,
}) => {
  const isAna = userKey.toLowerCase() === 'ana';
  const name = isAna ? 'Cowana' : 'Cowluisa';
  const initial = isAna ? 'A' : 'L';
  const avatarBg = isAna ? colors.anaSoft : colors.luisaSoft;
  const accentColor = isAna ? colors.ana : colors.luisa;
  const avatarImg = getProfileAvatar(userKey);

  const hasScore = score !== null && score !== undefined;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {/* Circular colored avatar with photo */}
        <View style={[styles.avatar, { backgroundColor: avatarBg, borderColor: accentColor }]}>
          {avatarImg ? (
            <Image source={avatarImg} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarText, { color: accentColor }]}>{initial}</Text>
          )}
        </View>

        {/* Profile name */}
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{name}</Text>
          {watched && !hasScore && (
            <Text style={styles.watchedLabel}>Assistido (sem nota)</Text>
          )}
        </View>

        {/* Score pill or "ainda não viu" */}
        {hasScore ? (
          <View style={styles.scoreBadge}>
            <Star size={14} color={colors.gold} fill={colors.gold} />
            <Text style={styles.scoreText}>{score.toFixed(1)}</Text>
          </View>
        ) : (
          <View style={styles.unseenBadge}>
            <Text style={styles.unseenText}>ainda não viu</Text>
          </View>
        )}
      </View>

      {/* Optional review quote */}
      {review ? (
        <View style={styles.reviewBox}>
          <Text style={styles.reviewText}>"{review}"</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.bodyMedium,
    color: colors.textPrimary,
    fontSize: 14,
  },
  watchedLabel: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  scoreText: {
    fontFamily: fonts.bodySemibold,
    color: colors.gold,
    fontSize: 13,
  },
  unseenBadge: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unseenText: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 12,
  },
  reviewBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewText: {
    fontFamily: fonts.displayItalic,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
