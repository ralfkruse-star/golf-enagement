import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { COLORS, SPACING, FONT_SIZES, MEMBERSHIP_TYPES } from '../constants';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Abmelden', 'Möchten Sie sich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', onPress: () => logout(), style: 'destructive' },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.membership}>
          {MEMBERSHIP_TYPES[user?.membershipType || 'GUEST']} • {user?.membershipNumber}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mitgliedschaft</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Typ:</Text>
          <Text style={styles.value}>{MEMBERSHIP_TYPES[user?.membershipType || 'GUEST']}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{user?.membershipStatus}</Text>
        </View>
        {user?.handicap !== null && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Handicap:</Text>
            <Text style={styles.value}>{user?.handicap}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Abmelden</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingTop: SPACING.xxl, backgroundColor: COLORS.primary, alignItems: 'center' },
  name: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: '#fff', marginBottom: SPACING.xs },
  email: { fontSize: FONT_SIZES.sm, color: '#fff', opacity: 0.9, marginBottom: SPACING.xs },
  membership: { fontSize: FONT_SIZES.xs, color: '#fff', opacity: 0.8 },
  section: { padding: SPACING.lg, backgroundColor: COLORS.surface, marginTop: 1 },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text.primary, marginBottom: SPACING.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  label: { fontSize: FONT_SIZES.md, color: COLORS.text.secondary },
  value: { fontSize: FONT_SIZES.md, color: COLORS.text.primary, fontWeight: '500' },
  logoutButton: { margin: SPACING.lg, padding: SPACING.md, backgroundColor: COLORS.error, borderRadius: 8, alignItems: 'center' },
  logoutButtonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
});
