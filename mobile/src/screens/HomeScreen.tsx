import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { COLORS, SPACING, FONT_SIZES } from '../constants';
import PersonaModal from '../components/PersonaModal';

export default function HomeScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);
  const { personaMode, showPersonaModal } = useAppStore();

  const isBeginner = personaMode === 'beginner' || user?.membershipType === 'GUEST' || user?.membershipType === 'TRIAL';

  const { data: events } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => api.getEvents({ upcoming: true }),
  });

  const { data: feedData } = useQuery({
    queryKey: ['feed', 'home'],
    queryFn: () => api.getFeedPosts({ page: 1, limit: 3 }),
  });

  // Filter events for beginners - show only TRAINING and SOCIAL events
  const displayEvents = isBeginner
    ? events?.filter(e => e.type === 'TRAINING' || e.type === 'SOCIAL')
    : events;

  return (
    <ScrollView style={styles.container}>
      {/* Header with Persona Switcher */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {isBeginner ? '🌟 ' : '⛳ '}
            Hallo, {user?.firstName}!
          </Text>
          <Text style={styles.subtitle}>
            {isBeginner ? 'Willkommen beim Golf lernen' : 'Willkommen zurück'}
          </Text>
        </View>
        <TouchableOpacity style={styles.personaButton} onPress={showPersonaModal}>
          <Ionicons
            name={isBeginner ? 'school' : 'golf'}
            size={24}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Beginner Welcome Card */}
      {isBeginner && (
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>🎯 Deine ersten Schritte</Text>
          <Text style={styles.welcomeText}>
            Als Einsteiger zeigen wir dir die besten Trainings und Events für Anfänger.
          </Text>
          <View style={styles.tipsContainer}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.tipText}>Beginne mit einem Schnupperkurs</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.tipText}>Lerne andere Anfänger kennen</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.tipText}>Nutze den Feed für Fragen</Text>
            </View>
          </View>
        </View>
      )}

      {/* Events Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isBeginner ? '📚 Empfohlene Trainings' : 'Nächste Events'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Events')}>
            <Text style={styles.link}>Alle anzeigen</Text>
          </TouchableOpacity>
        </View>

        {displayEvents?.slice(0, 3).map((event) => (
          <TouchableOpacity
            key={event.id}
            style={[styles.card, isBeginner && event.type === 'TRAINING' && styles.recommendedCard]}
            onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{event.title}</Text>
              {isBeginner && event.type === 'TRAINING' && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Empfohlen</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardSubtitle}>
              {new Date(event.startDate).toLocaleDateString('de-DE')}
            </Text>
            {isBeginner && event.type === 'TRAINING' && (
              <Text style={styles.beginnerHint}>
                ✨ Perfekt für Einsteiger!
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Community Feed */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Community Feed</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Feed')}>
            <Text style={styles.link}>Mehr sehen</Text>
          </TouchableOpacity>
        </View>
        {feedData?.posts.slice(0, 2).map((post) => (
          <View key={post.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {post.author.firstName} {post.author.lastName}
            </Text>
            <Text style={styles.cardText} numberOfLines={2}>
              {post.content}
            </Text>
          </View>
        ))}
      </View>

      <PersonaModal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', color: COLORS.text.primary },
  subtitle: { fontSize: FONT_SIZES.md, color: COLORS.text.secondary, marginTop: SPACING.xs },
  personaButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  welcomeCard: {
    backgroundColor: '#eff6ff',
    margin: SPACING.lg,
    marginTop: 0,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  welcomeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  tipsContainer: { gap: SPACING.xs },
  tipItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  tipText: { fontSize: FONT_SIZES.sm, color: COLORS.text.primary },
  section: { padding: SPACING.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text.primary },
  link: { color: COLORS.primary, fontSize: FONT_SIZES.sm },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  recommendedCard: {
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text.primary },
  cardSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.text.secondary, marginTop: SPACING.xs },
  cardText: { fontSize: FONT_SIZES.sm, color: COLORS.text.primary, marginTop: SPACING.xs },
  recommendedBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 4,
  },
  recommendedText: {
    color: '#fff',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  beginnerHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
});
