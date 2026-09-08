import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Check, Plus, Users, User, X } from 'lucide-react-native';
import { colors, fonts } from '../constants/theme';
import { getProfileAvatar, sharedListAvatar } from '../constants/profiles';
import { supabase } from '../lib/supabase';
import { addMovieToList, removeMovieFromList, getLists } from '../services/lists';
import { MovieList } from '../types';

interface AddToListSheetProps {
  visible: boolean;
  onClose: () => void;
  tmdbId: number;
  movieTitle: string;
  currentUserKey: string;
  onSuccess?: () => void;
}

export const AddToListSheet: React.FC<AddToListSheetProps> = ({
  visible,
  onClose,
  tmdbId,
  movieTitle,
  currentUserKey,
  onSuccess,
}) => {
  const [lists, setLists] = useState<MovieList[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [initialListIds, setInitialListIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible && currentUserKey) {
      loadLists();
    } else {
      setSelectedListIds(new Set());
      setInitialListIds(new Set());
      setErrorMsg(null);
    }
  }, [visible, currentUserKey]);

  async function loadLists() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const userLists = await getLists(currentUserKey);
      setLists(userLists);

      // Check which lists already contain this movie
      if (userLists.length > 0) {
        const listIds = userLists.map((l) => l.id);
        const { data: existingItems } = await supabase
          .from('list_items')
          .select('list_id')
          .eq('tmdb_id', tmdbId)
          .in('list_id', listIds);

        const alreadyInLists = new Set<string>((existingItems || []).map((i: any) => i.list_id));
        setSelectedListIds(new Set(alreadyInLists));
        setInitialListIds(new Set(alreadyInLists));
      }
    } catch (err: any) {
      setErrorMsg('Não foi possível carregar as listas.');
    } finally {
      setLoading(false);
    }
  }

  const toggleListSelection = (listId: string) => {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      // Lists to add movie to
      const toAdd = Array.from(selectedListIds).filter((id) => !initialListIds.has(id));
      // Lists to remove movie from
      const toRemove = Array.from(initialListIds).filter((id) => !selectedListIds.has(id));

      await Promise.all([
        ...toAdd.map((listId) => addMovieToList(listId, tmdbId, currentUserKey)),
        ...toRemove.map((listId) => removeMovieFromList(listId, tmdbId)),
      ]);

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao atualizar as listas.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {/* Top handle bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Adicionar a uma lista</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {movieTitle}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color={colors.gold} />
            </View>
          ) : errorMsg ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : lists.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>Você ainda não possui listas criadas.</Text>
            </View>
          ) : (
            <ScrollView style={styles.listScrollView} contentContainerStyle={{ paddingBottom: 16 }}>
              {lists.map((item) => {
                const isSelected = selectedListIds.has(item.id);
                const isCoop = item.type === 'cooperative';

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleListSelection(item.id)}
                    style={[styles.listItem, isSelected && styles.listItemSelected]}
                  >
                    <View style={styles.iconBadge}>
                      {isCoop ? (
                        <Image
                          source={sharedListAvatar}
                          style={styles.listAvatarImg}
                          resizeMode="cover"
                        />
                      ) : item.owner_key && getProfileAvatar(item.owner_key) ? (
                        <Image
                          source={getProfileAvatar(item.owner_key)!}
                          style={styles.listAvatarImg}
                          resizeMode="cover"
                        />
                      ) : (
                        <User size={18} color={item.owner_key === 'ana' ? colors.ana : colors.luisa} />
                      )}
                    </View>

                    <View style={styles.listInfo}>
                      <Text style={styles.listName}>{item.name}</Text>
                      <Text style={styles.listType}>
                        {isCoop ? 'Lista Cooperativa' : 'Sua lista solo'}
                      </Text>
                    </View>

                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Check size={14} color={colors.bgBase} strokeWidth={3} />}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Footer Action */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleConfirm}
              disabled={submitting || selectedListIds.size === 0}
              style={[
                styles.confirmButton,
                (submitting || selectedListIds.size === 0) && styles.confirmButtonDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.bgBase} />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {selectedListIds.size > 0
                    ? `Adicionar (${selectedListIds.size})`
                    : 'Selecione uma lista'}
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 18,
  },
  subtitle: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
  },
  centerBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: fonts.body,
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
  },
  listScrollView: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginVertical: 6,
  },
  listItemSelected: {
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgSurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  listAvatarImg: {
    width: '100%',
    height: '100%',
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontFamily: fonts.bodySemibold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  listType: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  confirmButton: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontFamily: fonts.bodySemibold,
    color: colors.bgBase,
    fontSize: 15,
  },
});
