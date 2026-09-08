import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Users, User, ChevronRight, X, Sparkles, RefreshCw, Trash2, Pencil } from 'lucide-react-native';
import { colors, fonts } from '../../constants/theme';
import { getProfileAvatar, sharedListAvatar } from '../../constants/profiles';
import { useProfile } from '../../contexts/ProfileContext';
import { createList, deleteList, getLists, updateListName } from '../../services/lists';
import { ListType, MovieList } from '../../types';

export default function ListsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useProfile();

  const [lists, setLists] = useState<MovieList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Create list modal state
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>('');
  const [newListType, setNewListType] = useState<ListType>('cooperative');
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete list state
  const [listToDelete, setListToDelete] = useState<MovieList | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Rename list state
  const [listToEdit, setListToEdit] = useState<MovieList | null>(null);
  const [editedName, setEditedName] = useState<string>('');
  const [editing, setEditing] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    if (!currentUser?.key) return;

    try {
      setError(null);
      const data = await getLists(currentUser.key);
      setLists(data);
    } catch (err: any) {
      console.error('Failed to load lists:', err);
      setError(err.message || 'Erro ao carregar as listas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.key]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLists();
  };

  const handleCreateList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) {
      setCreateError('Por favor, digite um nome para a lista.');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const ownerKey = newListType === 'solo' ? currentUser?.key : undefined;
      const created = await createList(trimmed, newListType, ownerKey);

      setModalVisible(false);
      setNewListName('');
      setNewListType('cooperative');

      // Add to list and navigate to it
      setLists((prev) => [created, ...prev]);
      router.push({
        pathname: '/list/[id]',
        params: { id: created.id, name: created.name },
      });
    } catch (err: any) {
      setCreateError(err.message || 'Não foi possível criar a lista.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEditList = (item: MovieList) => {
    setListToEdit(item);
    setEditedName(item.name);
    setEditError(null);
  };

  const handleConfirmEditList = async () => {
    const trimmed = editedName.trim();
    if (!trimmed) {
      setEditError('O nome da lista não pode ficar vazio.');
      return;
    }
    if (!listToEdit) return;

    try {
      setEditing(true);
      setEditError(null);
      const targetId = listToEdit.id;
      await updateListName(targetId, trimmed);
      setLists((prev) =>
        prev.map((l) => (l.id === targetId ? { ...l, name: trimmed } : l))
      );
      setListToEdit(null);
    } catch (err: any) {
      console.error('Failed to update list name:', err);
      setEditError(err.message || 'Erro ao renomear lista.');
    } finally {
      setEditing(false);
    }
  };

  const handleConfirmDeleteList = async () => {
    if (!listToDelete) return;

    try {
      setDeleting(true);
      const targetId = listToDelete.id;
      setLists((prev) => prev.filter((l) => l.id !== targetId));
      setListToDelete(null);
      await deleteList(targetId);
    } catch (err: any) {
      console.error('Failed to delete list:', err);
      loadLists();
    } finally {
      setDeleting(false);
    }
  };

  const handleListPress = (item: MovieList) => {
    router.push({
      pathname: '/list/[id]',
      params: { id: item.id, name: item.name },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Listas</Text>
          <Text style={styles.subtitle}>Organize seus filmes com a Luísa</Text>
        </View>

        <Pressable
          onPress={() => setModalVisible(true)}
          style={styles.addButton}
          accessibilityRole="button"
          accessibilityLabel="Criar nova lista"
        >
          <Plus size={22} color={colors.bgBase} strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Main Content */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Carregando suas listas...</Text>
        </View>
      ) : error && lists.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadLists}>
            <RefreshCw size={16} color={colors.bgBase} />
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
              colors={[colors.gold]}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Sparkles size={40} color={colors.gold} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Nenhuma lista criada ainda</Text>
              <Text style={styles.emptyDescription}>
                Crie listas cooperativas para planejar o que assistir juntas, ou listas solo para suas escolhas particulares!
              </Text>
              <Pressable
                onPress={() => setModalVisible(true)}
                style={styles.createFirstButton}
              >
                <Plus size={16} color={colors.bgBase} />
                <Text style={styles.createFirstButtonText}>Criar primeira lista</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const isCoop = item.type === 'cooperative';
            const ownerLabel = item.owner_key === 'ana' ? 'Cowana' : item.owner_key === 'luisa' ? 'Cowluisa' : item.owner_key;

            return (
              <Pressable
                onPress={() => handleListPress(item)}
                style={({ pressed }) => [styles.listItemCard, pressed && styles.cardPressed]}
              >
                <View style={[styles.typeIconBadge, isCoop ? styles.coopBadge : styles.soloBadge]}>
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
                    <User size={20} color={item.owner_key === 'ana' ? colors.ana : colors.luisa} />
                  )}
                </View>

                <View style={styles.cardDetails}>
                  <Text style={styles.listNameText} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.badgeRow}>
                    <Text style={styles.typeBadgeText}>
                      {isCoop ? 'Cooperativa (Ana & Luisa)' : `Solo (${ownerLabel})`}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleOpenEditList(item);
                  }}
                  style={styles.editListBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Renomear lista ${item.name}`}
                >
                  <Pencil size={15} color={colors.textSecondary} />
                </Pressable>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setListToDelete(item);
                  }}
                  style={styles.deleteListBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir lista ${item.name}`}
                >
                  <Trash2 size={16} color="#FF6B6B" />
                </Pressable>

                <ChevronRight size={18} color={colors.textTertiary} />
              </Pressable>
            );
          }}
        />
      )}

      {/* Modal: Create New List */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable style={styles.modalBackdropPressable} onPress={() => setModalVisible(false)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nova Lista</Text>
                <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <X size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome da lista</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: Terror pra ver juntas, Oscar 2026..."
                  placeholderTextColor={colors.textTertiary}
                  value={newListName}
                  onChangeText={setNewListName}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo de lista</Text>
                <View style={styles.typeSelector}>
                  <Pressable
                    onPress={() => setNewListType('cooperative')}
                    style={[
                      styles.typeOption,
                      newListType === 'cooperative' && styles.typeOptionSelected,
                    ]}
                  >
                    <Users
                      size={18}
                      color={newListType === 'cooperative' ? colors.gold : colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.typeOptionText,
                        newListType === 'cooperative' && styles.typeOptionTextSelected,
                      ]}
                    >
                      Cooperativa
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setNewListType('solo')}
                    style={[
                      styles.typeOption,
                      newListType === 'solo' && styles.typeOptionSelected,
                    ]}
                  >
                    <User
                      size={18}
                      color={newListType === 'solo' ? colors.gold : colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.typeOptionText,
                        newListType === 'solo' && styles.typeOptionTextSelected,
                      ]}
                    >
                      Solo
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.typeHelpText}>
                  {newListType === 'cooperative'
                    ? 'Vocês duas podem adicionar, remover filmes e acompanhar em tempo real.'
                    : 'Visível apenas no seu perfil.'}
                </Text>
              </View>

              {createError && <Text style={styles.createErrorText}>{createError}</Text>}

              <Pressable
                onPress={handleCreateList}
                disabled={creating}
                style={[styles.createSubmitButton, creating && styles.disabledButton]}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.bgBase} />
                ) : (
                  <Text style={styles.createSubmitButtonText}>Criar Lista</Text>
                )}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Renomear Lista */}
      <Modal
        visible={listToEdit !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setListToEdit(null)}
      >
        <Pressable style={styles.deleteModalBackdrop} onPress={() => setListToEdit(null)}>
          <Pressable style={styles.renameModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.renameModalIconCircle}>
              <Pencil size={22} color={colors.gold} />
            </View>

            <Text style={styles.deleteModalTitle}>Renomear lista</Text>

            <View style={styles.renameInputGroup}>
              <Text style={styles.inputLabel}>Novo nome da lista</Text>
              <TextInput
                style={styles.textInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Nome da lista..."
                placeholderTextColor={colors.textTertiary}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleConfirmEditList}
              />
            </View>

            {editError && <Text style={styles.createErrorText}>{editError}</Text>}

            <View style={styles.deleteModalActions}>
              <Pressable
                style={styles.cancelDeleteButton}
                onPress={() => setListToEdit(null)}
                disabled={editing}
              >
                <Text style={styles.cancelDeleteButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={styles.confirmSaveButton}
                onPress={handleConfirmEditList}
                disabled={editing}
              >
                {editing ? (
                  <ActivityIndicator size="small" color={colors.bgBase} />
                ) : (
                  <Text style={styles.confirmSaveButtonText}>Salvar</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal: Confirm Delete List */}
      <Modal
        visible={listToDelete !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setListToDelete(null)}
      >
        <Pressable style={styles.deleteModalBackdrop} onPress={() => setListToDelete(null)}>
          <Pressable style={styles.deleteModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.deleteModalIconCircle}>
              <Trash2 size={24} color="#FF6B6B" />
            </View>

            <Text style={styles.deleteModalTitle}>Excluir lista</Text>
            <Text style={styles.deleteModalMessage}>
              Tem certeza que deseja excluir a lista "{listToDelete?.name}"? Todos os filmes desta lista serão removidos.
            </Text>

            <View style={styles.deleteModalActions}>
              <Pressable
                style={styles.cancelDeleteButton}
                onPress={() => setListToDelete(null)}
                disabled={deleting}
              >
                <Text style={styles.cancelDeleteButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={styles.confirmDeleteButton}
                onPress={handleConfirmDeleteList}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Excluir</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110, // Avoid custom tab bar overlap
  },
  listItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginVertical: 6,
  },
  cardPressed: {
    backgroundColor: colors.bgElevated,
    opacity: 0.85,
  },
  typeIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  listAvatarImg: {
    width: '100%',
    height: '100%',
  },
  coopBadge: {
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  soloBadge: {
    backgroundColor: colors.bgElevated2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDetails: {
    flex: 1,
  },
  listNameText: {
    fontFamily: fonts.bodySemibold,
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadgeText: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 12,
  },
  centerBox: {
    flex: 1,
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
  errorText: {
    fontFamily: fonts.body,
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 18,
    marginBottom: 8,
  },
  emptyDescription: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gold,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createFirstButtonText: {
    fontFamily: fonts.bodySemibold,
    color: colors.bgBase,
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalBackdropPressable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 20,
  },
  closeBtn: {
    padding: 6,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bgElevated,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
  },
  typeOptionSelected: {
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
  },
  typeOptionText: {
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    fontSize: 14,
  },
  typeOptionTextSelected: {
    color: colors.gold,
    fontFamily: fonts.bodySemibold,
  },
  typeHelpText: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 6,
  },
  createErrorText: {
    fontFamily: fonts.body,
    color: '#ff6b6b',
    fontSize: 13,
    marginBottom: 12,
  },
  createSubmitButton: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  createSubmitButtonText: {
    fontFamily: fonts.bodySemibold,
    color: colors.bgBase,
    fontSize: 15,
  },
  editListBtn: {
    padding: 8,
    marginRight: 4,
    borderRadius: 8,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteListBtn: {
    padding: 8,
    marginRight: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  deleteModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bgSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    alignItems: 'center',
  },
  deleteModalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 19,
    marginBottom: 8,
  },
  deleteModalMessage: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelDeleteButton: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelDeleteButtonText: {
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    fontSize: 14,
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#D94343',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    fontFamily: fonts.bodySemibold,
    color: '#fff',
    fontSize: 14,
  },
  renameModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bgSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    alignItems: 'center',
  },
  renameModalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  renameInputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  confirmSaveButton: {
    flex: 1,
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmSaveButtonText: {
    fontFamily: fonts.bodySemibold,
    color: colors.bgBase,
    fontSize: 14,
  },
});
