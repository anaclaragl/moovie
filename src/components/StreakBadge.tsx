import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Flame } from 'lucide-react-native';
import { colors, fonts } from '../constants/theme';
import { getCurrentStreak } from '../services/streak';

interface StreakBadgeProps {
  userKey: string;
  onPress?: () => void;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ userKey, onPress }) => {
  const router = useRouter();
  const [streak, setStreak] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStreak() {
      if (!userKey) return;
      try {
        setLoading(true);
        const count = await getCurrentStreak(userKey);
        if (isMounted) {
          setStreak(count);
        }
      } catch (error) {
        console.warn('Failed to load streak for user:', userKey, error);
        if (isMounted) setStreak(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadStreak();

    return () => {
      isMounted = false;
    };
  }, [userKey]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({ pathname: '/watched' as any });
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Streak de ${streak ?? 0} dias. Toque para ver filmes assistidos.`}
    >
      <Flame size={16} color={colors.gold} fill={streak && streak > 0 ? colors.gold : 'transparent'} />
      {loading ? (
        <ActivityIndicator size="small" color={colors.gold} style={styles.loader} />
      ) : (
        <Text style={styles.text}>{streak ?? 0}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gold,
    gap: 4,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  loader: {
    width: 14,
    height: 14,
  },
  text: {
    fontFamily: fonts.bodySemibold,
    color: colors.gold,
    fontSize: 13,
  },
});
