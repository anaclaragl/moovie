import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors, fonts } from '../constants/theme';

interface StarRatingInputProps {
  value: number; // 0 to 5
  onChange: (score: number) => void;
  size?: number;
  disabled?: boolean;
}

export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  size = 32,
  disabled = false,
}) => {
  const stars = [0, 1, 2, 3, 4];

  return (
    <View style={styles.wrapper}>
      <View style={styles.starsRow}>
        {stars.map((index) => {
          const halfValue = index + 0.5;
          const fullValue = index + 1.0;

          const isFull = value >= fullValue;
          const isHalf = value >= halfValue && !isFull;

          return (
            <View key={index} style={[styles.starContainer, { width: size, height: size }]}>
              {/* Background empty star */}
              <Star
                size={size}
                color={colors.border}
                fill={colors.bgElevated}
                strokeWidth={1.5}
              />

              {/* Full star fill */}
              {isFull && (
                <View style={StyleSheet.absoluteFill}>
                  <Star
                    size={size}
                    color={colors.gold}
                    fill={colors.gold}
                    strokeWidth={1.5}
                  />
                </View>
              )}

              {/* Half star fill via clipped container */}
              {isHalf && (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { width: size / 2, overflow: 'hidden' },
                  ]}
                >
                  <Star
                    size={size}
                    color={colors.gold}
                    fill={colors.gold}
                    strokeWidth={1.5}
                  />
                </View>
              )}

              {/* Touchable left half (for .5 increment) */}
              {!disabled && (
                <Pressable
                  style={[styles.hitArea, { width: size / 2, left: 0 }]}
                  onPress={() => onChange(value === halfValue ? 0 : halfValue)}
                  accessibilityRole="button"
                  accessibilityLabel={`Dar nota ${halfValue}`}
                />
              )}

              {/* Touchable right half (for 1.0 increment) */}
              {!disabled && (
                <Pressable
                  style={[styles.hitArea, { width: size / 2, left: size / 2 }]}
                  onPress={() => onChange(value === fullValue ? 0 : fullValue)}
                  accessibilityRole="button"
                  accessibilityLabel={`Dar nota ${fullValue}`}
                />
              )}
            </View>
          );
        })}
      </View>

      <Text style={styles.scoreDisplay}>
        {value > 0 ? `${value.toFixed(1)} / 5.0` : 'Toque nas estrelas para avaliar'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: 12,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hitArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 10,
  },
  scoreDisplay: {
    fontFamily: fonts.display,
    color: colors.gold,
    fontSize: 16,
    marginTop: 8,
  },
});
