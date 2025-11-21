import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { COLORS, SPACING, FONT_SIZES } from '../constants';

export default function EventDetailScreen({ route }: any) {
  const { eventId } = route.params;
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => api.getEvent(eventId),
  });

  const registerMutation = useMutation({
    mutationFn: () => api.registerForEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      Alert.alert('Erfolg', 'Anmeldung erfolgreich!');
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!event) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.date}>
          {new Date(event.startDate).toLocaleDateString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <Text style={styles.description}>{event.description}</Text>
        <View style={styles.info}>
          <Text style={styles.infoText}>
            Teilnehmer: {event.currentParticipants} / {event.maxParticipants}
          </Text>
          {event.location && <Text style={styles.infoText}>Ort: {event.location}</Text>}
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => registerMutation.mutate()}
          disabled={registerMutation.isPending}
        >
          <Text style={styles.buttonText}>
            {registerMutation.isPending ? 'Wird angemeldet...' : 'Jetzt anmelden'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SPACING.lg },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: SPACING.sm },
  date: { fontSize: FONT_SIZES.md, color: COLORS.text.secondary, marginBottom: SPACING.lg },
  description: { fontSize: FONT_SIZES.md, color: COLORS.text.primary, marginBottom: SPACING.lg },
  info: { gap: SPACING.xs, marginBottom: SPACING.xl },
  infoText: { fontSize: FONT_SIZES.sm, color: COLORS.text.secondary },
  button: { backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
});
