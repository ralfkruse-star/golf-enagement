import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { COLORS, SPACING, FONT_SIZES } from '../constants';

export default function FeedScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.getFeedPosts({ page: 1, limit: 20 }),
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
        <Text style={styles.title}>Community Feed</Text>
      </View>
      <FlatList
        data={data?.posts || []}
        keyExtractor={(item) => item.id}
        onRefresh={refetch}
        refreshing={isLoading}
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
  post: { backgroundColor: COLORS.surface, padding: SPACING.md, marginBottom: 1 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  author: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text.primary },
  time: { fontSize: FONT_SIZES.xs, color: COLORS.text.secondary },
  content: { fontSize: FONT_SIZES.md, color: COLORS.text.primary, marginBottom: SPACING.md },
  actions: { flexDirection: 'row', gap: SPACING.lg },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  actionText: { fontSize: FONT_SIZES.sm, color: COLORS.text.secondary },
});
