import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { COLORS, SPACING, FONT_SIZES } from '../constants';

export default function FeedScreen() {
  const user = useAuthStore((state) => state.user);
  const personaMode = useAppStore((state) => state.personaMode);

  const isBeginner = personaMode === 'beginner' || user?.membershipType === 'GUEST' || user?.membershipType === 'TRIAL';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.getFeedPosts({ page: 1, limit: 20 }),
  });

  const renderBeginnerTip = () => (
    <View style={styles.tipCard}>
      <View style={styles.tipHeader}>
        <Ionicons name="bulb" size={24} color={COLORS.primary} />
        <Text style={styles.tipTitle}>💡 Tipp für Einsteiger</Text>
      </View>
      <Text style={styles.tipText}>
        Stelle Fragen im Community Feed! Unsere erfahrenen Mitglieder helfen dir gerne bei deinen ersten Schritten im Golfsport.
      </Text>
      <View style={styles.tipActions}>
        <View style={styles.tipAction}>
          <Ionicons name="people" size={16} color={COLORS.success} />
          <Text style={styles.tipActionText}>Freundliche Community</Text>
        </View>
        <View style={styles.tipAction}>
          <Ionicons name="chatbubbles" size={16} color={COLORS.success} />
          <Text style={styles.tipActionText}>Schnelle Antworten</Text>
        </View>
      </View>
    </View>
  );

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
        <Text style={styles.title}>Community Feed</Text>
      </View>
      <FlatList
        data={data?.posts || []}
        keyExtractor={(item) => item.id}
        onRefresh={refetch}
        refreshing={isLoading}
        ListHeaderComponent={isBeginner ? renderBeginnerTip : null}
        renderItem={({ item }) => (
          <View style={styles.post}>
            <View style={styles.postHeader}>
              <Text style={styles.author}>
                {item.author.firstName} {item.author.lastName}
              </Text>
              <Text style={styles.time}>
                {new Date(item.createdAt).toLocaleDateString('de-DE')}
              </Text>
            </View>
            <Text style={styles.content}>{item.content}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="heart-outline" size={20} color={COLORS.text.secondary} />
                <Text style={styles.actionText}>{item._count.likes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={20} color={COLORS.text.secondary} />
                <Text style={styles.actionText}>{item._count.comments}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  tipCard: {
    backgroundColor: '#eff6ff',
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  tipTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  tipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  tipActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  tipAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  tipActionText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  post: { backgroundColor: COLORS.surface, padding: SPACING.md, marginBottom: 1 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  author: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text.primary },
  time: { fontSize: FONT_SIZES.xs, color: COLORS.text.secondary },
  content: { fontSize: FONT_SIZES.md, color: COLORS.text.primary, marginBottom: SPACING.md },
  actions: { flexDirection: 'row', gap: SPACING.lg },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  actionText: { fontSize: FONT_SIZES.sm, color: COLORS.text.secondary },
});
