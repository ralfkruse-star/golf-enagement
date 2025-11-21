import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { COLORS, SPACING, FONT_SIZES, EVENT_TYPES } from '../constants';

export default function EventsScreen({ navigation }: any) {
  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.getEvents(),
  });

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
        <Text style={styles.title}>Events</Text>
      </View>
      <FlatList
        data={data || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.event}
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
  event: { backgroundColor: COLORS.surface, padding: SPACING.md, marginBottom: 1 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  eventTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text.primary, flex: 1 },
  badge: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: FONT_SIZES.xs, fontWeight: '600' },
  eventDate: { fontSize: FONT_SIZES.sm, color: COLORS.text.secondary, marginBottom: SPACING.xs },
  eventParticipants: { fontSize: FONT_SIZES.sm, color: COLORS.text.secondary },
});
