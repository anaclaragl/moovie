import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Flame } from 'lucide-react-native';
import { colors, fonts } from '../constants/theme';
import { getCurrentStreak } from '../services/streak';

interface StreakBadgeProps {
  userKey: string;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ userKey }) => {
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

  return (
    <View style={styles.container}>
      <Flame size={16} color={colors.gold} fill={streak && streak > 0 ? colors.gold : 'transparent'} />
      {loading ? (
        <ActivityIndicator size="small" color={colors.gold} style={styles.loader} />
      ) : (
        <Text style={styles.text}>{streak ?? 0}</Text>
      )}
    </View>
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
