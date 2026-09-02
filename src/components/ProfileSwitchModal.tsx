import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Check, LogOut, User } from 'lucide-react-native';
import { colors, fonts } from '../constants/theme';
import { getProfileAvatar } from '../constants/profiles';
import { useProfile } from '../contexts/ProfileContext';

interface ProfileSwitchModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileSwitchModal: React.FC<ProfileSwitchModalProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter();
  const { currentUser, availableProfiles, switchProfile, logoutProfile } = useProfile();

  if (!visible) return null;

  const profilesToRender =
    availableProfiles.length > 0
      ? availableProfiles
      : [
          { key: 'ana', display_name: 'Cowana', color_hex: '#4FC7C2' },
          { key: 'luisa', display_name: 'Cowluisa', color_hex: '#E4699A' },
        ];

  const handleSelectProfile = async (key: string) => {
    if (key === currentUser?.key) {
      onClose();
      return;
    }
    try {
      await switchProfile(key);
      onClose();
    } catch (err) {
      console.error('Failed to switch profile:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutProfile();
      onClose();
      router.replace('/');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Trocar de Perfil</Text>
              <Text style={styles.subtitle}>Selecione quem está usando o app</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Profile options */}
          <View style={styles.profilesList}>
            {profilesToRender.map((profile) => {
              const isCurrent = currentUser?.key === profile.key;
              const isAna = profile.key === 'ana';
              const accentColor = profile.color_hex || (isAna ? colors.ana : colors.luisa);
              const softBg = isAna ? colors.anaSoft : colors.luisaSoft;
              const initial = profile.display_name ? profile.display_name[0].toUpperCase() : isAna ? 'A' : 'L';
              const avatarImg = getProfileAvatar(profile.key);

              return (
                <Pressable
                  key={profile.key}
                  onPress={() => handleSelectProfile(profile.key)}
                  style={[
                    styles.profileItem,
                    isCurrent && { borderColor: accentColor, backgroundColor: colors.bgElevated2 },
                  ]}
                >
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: softBg, borderColor: accentColor },
                    ]}
                  >
                    {avatarImg ? (
                      <Image source={avatarImg} style={styles.avatarImg} resizeMode="cover" />
                    ) : (
                      <Text style={[styles.avatarText, { color: accentColor }]}>{initial}</Text>
                    )}
                  </View>

                  <View style={styles.profileInfo}>
                    <Text style={styles.name}>{profile.display_name}</Text>
                    <Text style={styles.role}>
                      {isCurrent ? 'Perfil ativo agora' : 'Tocar para alternar'}
                    </Text>
                  </View>

                  {isCurrent && (
                    <View style={[styles.checkBadge, { backgroundColor: accentColor }]}>
                      <Check size={14} color={colors.bgBase} strokeWidth={3} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Log out option */}
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={18} color="#FF6B6B" />
            <Text style={styles.logoutText}>Sair da conta (tela de login)</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 20,
  },
  subtitle: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  profilesList: {
    gap: 12,
    marginBottom: 20,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontFamily: fonts.displaySemibold,
    fontSize: 18,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.bodySemibold,
    color: colors.textPrimary,
    fontSize: 16,
  },
  role: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    paddingBottom: 4,
  },
  logoutText: {
    fontFamily: fonts.bodyMedium,
    color: '#FF6B6B',
    fontSize: 14,
  },
});
