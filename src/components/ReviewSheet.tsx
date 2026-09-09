import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { colors, fonts } from '../constants/theme';
import { upsertRating } from '../services/ratings';
import { Rating } from '../types';
import { StarRatingInput } from './StarRatingInput';

interface ReviewSheetProps {
  visible: boolean;
  onClose: () => void;
  tmdbId: number;
  movieTitle: string;
  currentUserKey: string;
  initialScore?: number;
  initialReview?: string;
  onSuccess?: (rating: Rating) => void;
}

export const ReviewSheet: React.FC<ReviewSheetProps> = ({
  visible,
  onClose,
  tmdbId,
  movieTitle,
  currentUserKey,
  initialScore = 0,
  initialReview = '',
  onSuccess,
}) => {
  const [score, setScore] = useState<number>(initialScore);
  const [review, setReview] = useState<string>(initialReview);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setScore(initialScore);
      setReview(initialReview || '');
      setErrorMsg(null);
    }
  }, [visible, initialScore, initialReview]);

  const handleSave = async () => {
    if (!currentUserKey || !tmdbId) {
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const updated = await upsertRating(tmdbId, currentUserKey, {
        score: score > 0 ? score : null,
        review: review.trim() || null,
        watched: true,
      });

      onSuccess?.(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar avaliação.');
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropPressable} onPress={onClose}>
          <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Avaliar Filme</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {movieTitle}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Rating Stars Input */}
            <StarRatingInput value={score} onChange={setScore} size={36} />

            {/* Review text input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Sua opinião (opcional)</Text>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={4}
                placeholder="O que você achou do filme? Deixe sua resenha..."
                placeholderTextColor={colors.textTertiary}
                value={review}
                onChangeText={setReview}
                textAlignVertical="top"
              />
            </View>

            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            {/* Save button */}
            <View style={styles.footer}>
              <Pressable
                onPress={handleSave}
                disabled={submitting}
                style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.bgBase} />
                ) : (
                  <View style={styles.buttonContent}>
                    <Check size={18} color={colors.bgBase} strokeWidth={2.5} />
                    <Text style={styles.saveButtonText}>Salvar Avaliação</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdropPressable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingBottom: 28,
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
  inputContainer: {
    marginVertical: 12,
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
    borderRadius: 14,
    padding: 12,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
    minHeight: 100,
  },
  errorText: {
    fontFamily: fonts.body,
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  footer: {
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontFamily: fonts.bodySemibold,
    color: colors.bgBase,
    fontSize: 15,
  },
});
