/**
 * PersonaModal Component
 * Allows users to switch between Member and Beginner personas
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, PersonaType } from '../store/appStore';
import { COLORS, SPACING, FONT_SIZES, USER_PERSONAS } from '../constants';

export default function PersonaModal() {
  const { personaMode, isPersonaModalVisible, setPersonaMode, hidePersonaModal } = useAppStore();

  const handleSelectPersona = async (persona: PersonaType) => {
    await setPersonaMode(persona);
    hidePersonaModal();
  };

  return (
    <Modal
      visible={isPersonaModalVisible}
      animationType="slide"
      transparent
      onRequestClose={hidePersonaModal}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Wähle deinen Modus</Text>
            <TouchableOpacity onPress={hidePersonaModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.subtitle}>
              Passe die App an deine Bedürfnisse an
            </Text>

            {/* Member Persona */}
            <TouchableOpacity
              style={[
                styles.personaCard,
                personaMode === 'member' && styles.personaCardActive,
              ]}
              onPress={() => handleSelectPersona('member')}
            >
              <View style={styles.personaHeader}>
                <Ionicons
                  name="golf"
                  size={32}
                  color={personaMode === 'member' ? COLORS.primary : COLORS.text.secondary}
                />
                <View style={styles.personaTitleContainer}>
                  <Text style={styles.personaTitle}>{USER_PERSONAS.member.label}</Text>
                  {personaMode === 'member' && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </View>
              </View>
              <Text style={styles.personaDescription}>
                {USER_PERSONAS.member.description}
              </Text>
              <View style={styles.featuresList}>
                {USER_PERSONAS.member.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={COLORS.success}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            {/* Beginner Persona */}
            <TouchableOpacity
              style={[
                styles.personaCard,
                personaMode === 'beginner' && styles.personaCardActive,
              ]}
              onPress={() => handleSelectPersona('beginner')}
            >
              <View style={styles.personaHeader}>
                <Ionicons
                  name="school"
                  size={32}
                  color={personaMode === 'beginner' ? COLORS.primary : COLORS.text.secondary}
                />
                <View style={styles.personaTitleContainer}>
                  <Text style={styles.personaTitle}>{USER_PERSONAS.beginner.label}</Text>
                  {personaMode === 'beginner' && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </View>
              </View>
              <Text style={styles.personaDescription}>
                {USER_PERSONAS.beginner.description}
              </Text>
              <View style={styles.featuresList}>
                {USER_PERSONAS.beginner.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={COLORS.success}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    padding: SPACING.lg,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
  },
  personaCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  personaCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff',
  },
  personaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  personaTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  personaTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  personaDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  featuresList: {
    gap: SPACING.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  featureText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.primary,
  },
});
