import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { COLORS, SPACING, FONT_SIZES } from '../constants';

export default function HomeScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);

  const { data: events } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => api.getEvents({ upcoming: true }),
  });

  const { data: feedData } = useQuery({
    queryKey: ['feed', 'home'],
    queryFn: () => api.getFeedPosts({ page: 1, limit: 3 }),
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hallo, {user?.firstName}! ⛳</Text>
        <Text style={styles.subtitle}>Willkommen zurück</Text>
      </View>

      {/* Upcoming Events */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nächste Events</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Events')}>
            <Text style={styles.link}>Alle anzeigen</Text>
          </TouchableOpacity>
        </View>
        {events?.slice(0, 3).map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.card}
            onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
          >
            <Text style={styles.cardTitle}>{event.title}</Text>
            <Text style={styles.cardSubtitle}>
              {new Date(event.startDate).toLocaleDateString('de-DE')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Feed Posts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Community Feed</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Feed')}>
            <Text style={styles.link}>Mehr sehen</Text>
          </TouchableOpacity>
        </View>
        {feedData?.posts.slice(0, 2).map((post) => (
          <View key={post.id} style={styles.card}>
            <Text style={styles.cardTitle}>{post.author.firstName} {post.author.lastName}</Text>
            <Text style={styles.cardText} numberOfLines={2}>{post.content}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingTop: SPACING.xxl },
  greeting: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', color: COLORS.text.primary },
  subtitle: { fontSize: FONT_SIZES.md, color: COLORS.text.secondary, marginTop: SPACING.xs },
  section: { padding: SPACING.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text.primary },
  link: { color: COLORS.primary, fontSize: FONT_SIZES.sm },
  card: { backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: 8, marginBottom: SPACING.sm },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text.primary },
  cardSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.text.secondary, marginTop: SPACING.xs },
  cardText: { fontSize: FONT_SIZES.sm, color: COLORS.text.primary, marginTop: SPACING.xs },
});
