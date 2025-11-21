import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { COLORS, SPACING, FONT_SIZES, EVENT_TYPES } from '../constants';

export default function EventsScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);
  const personaMode = useAppStore((state) => state.personaMode);

  const isBeginner = personaMode === 'beginner' || user?.membershipType === 'GUEST' || user?.membershipType === 'TRIAL';

  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.getEvents(),
  });

  // Filter events for beginners
  const displayEvents = useMemo(() => {
    if (!data) return [];
    if (!isBeginner) return data;
    return data.filter((e) => e.type === 'TRAINING' || e.type === 'SOCIAL');
  }, [data, isBeginner]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isBeginner ? '📚 Empfohlene Events' : 'Events'}
        </Text>
        {isBeginner && (
          <Text style={styles.subtitle}>
            Trainings und soziale Events für Einsteiger
          </Text>
        )}
      </View>
      <FlatList
        data={displayEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.event,
              isBeginner && item.type === 'TRAINING' && styles.recommendedEvent,
            ]}
            onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
          >
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: EVENT_TYPES[item.type]?.color || COLORS.text.secondary },
                ]}
              >
                <Text style={styles.badgeText}>{EVENT_TYPES[item.type]?.label || item.type}</Text>
              </View>
            </View>
            <Text style={styles.eventDate}>
              {new Date(item.startDate).toLocaleDateString('de-DE', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
            <Text style={styles.eventParticipants}>
              {item.currentParticipants} / {item.maxParticipants} Teilnehmer
            </Text>
            {isBeginner && item.type === 'TRAINING' && (
              <View style={styles.beginnerHintRow}>
                <Ionicons name="star" size={14} color={COLORS.success} />
                <Text style={styles.beginnerHint}>Perfekt für Einsteiger!</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: SPACING.lg, paddingTop: SPACING.xxl, backgroundColor: COLORS.surface },
  title: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: COLORS.text.primary },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  event: { backgroundColor: COLORS.surface, padding: SPACING.md, marginBottom: 1 },
  recommendedEvent: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  eventTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text.primary, flex: 1 },
  badge: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: FONT_SIZES.xs, fontWeight: '600' },
  eventDate: { fontSize: FONT_SIZES.sm, color: COLORS.text.secondary, marginBottom: SPACING.xs },
  eventParticipants: { fontSize: FONT_SIZES.sm, color: COLORS.text.secondary },
  beginnerHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  beginnerHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: '500',
  },
});
