import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../constants/theme';
import { getProfileAvatar } from '../constants/profiles';
import { useProfile } from '../contexts/ProfileContext';

export default function IndexScreen() {
  const router = useRouter();
  const { currentUser, availableProfiles, isLoading, switchProfile } = useProfile();

  // Redirect automatically if a profile is already saved
  useEffect(() => {
    if (!isLoading && currentUser) {
      router.replace('/(tabs)/home');
    }
  }, [isLoading, currentUser, router]);

  const handleSelectProfile = async (key: string) => {
    try {
      await switchProfile(key);
      router.replace('/(tabs)/home');
    } catch (err) {
      console.error('Failed to select profile:', err);
    }
  };

  if (isLoading || currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  const profilesToRender =
    availableProfiles.length > 0
      ? availableProfiles
      : [
          { key: 'ana', display_name: 'Cowana', color_hex: '#4FC7C2' },
          { key: 'luisa', display_name: 'Cowluisa', color_hex: '#E4699A' },
        ];

  return (
    <View style={styles.container}>
      {/* Background dark warm glow */}
      <LinearGradient
        colors={['#251E18', '#141219', colors.bgBase, colors.bgBase]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        {/* Brand Logo */}
        <View style={styles.brandContainer}>
          <Text style={styles.logo}>Moovie</Text>
          <Text style={styles.tagline}>Quem está assistindo hoje?</Text>
        </View>

        {/* Profile Selection Cards */}
        <View style={styles.cardsRow}>
          {profilesToRender.map((profile) => {
            const isAna = profile.key === 'ana';
            const accentColor = profile.color_hex || (isAna ? colors.ana : colors.luisa);
            const softBg = isAna ? colors.anaSoft : colors.luisaSoft;
            const initial = profile.display_name ? profile.display_name[0].toUpperCase() : isAna ? 'A' : 'L';
            const avatarImg = getProfileAvatar(profile.key);

            return (
              <Pressable
                key={profile.key}
                onPress={() => handleSelectProfile(profile.key)}
                style={({ pressed }) => [
                  styles.card,
                  { borderColor: accentColor },
                  pressed && styles.cardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Entrar como ${profile.display_name}`}
              >
                <View style={[styles.avatarCircle, { backgroundColor: softBg, borderColor: accentColor }]}>
                  {avatarImg ? (
                    <Image source={avatarImg} style={styles.avatarImage} resizeMode="cover" />
                  ) : (
                    <Text style={[styles.avatarLetter, { color: accentColor }]}>{initial}</Text>
                  )}
                </View>

                <Text style={styles.profileName}>{profile.display_name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bgBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontFamily: fonts.displayItalic,
    color: colors.gold,
    fontSize: 54,
    letterSpacing: -1,
    textShadowColor: 'rgba(130, 167, 103, 0.35)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  tagline: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 8,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
    maxWidth: 380,
  },
  card: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontFamily: fonts.displaySemibold,
    fontSize: 32,
  },
  profileName: {
    fontFamily: fonts.bodySemibold,
    color: colors.textPrimary,
    fontSize: 16,
    textAlign: 'center',
  },
});
