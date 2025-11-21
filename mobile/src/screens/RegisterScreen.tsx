import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { COLORS, SPACING, FONT_SIZES } from '../constants';
import { MembershipType } from '../types';

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [membershipType, setMembershipType] = useState<MembershipType>('GUEST');
  const { register, isLoading, error, clearError } = useAuthStore();

  const handleRegister = async () => {
    if (!email || !password || !firstName || !lastName) {
      Alert.alert('Fehler', 'Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    try {
      clearError();
      await register({
        email: email.toLowerCase().trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        membershipType,
      });
    } catch (err) {
      Alert.alert('Registrierung fehlgeschlagen', error || 'Bitte versuchen Sie es erneut');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Registrierung</Text>
        <Text style={styles.subtitle}>Willkommen im Golfclub Siek</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Vorname *"
            value={firstName}
            onChangeText={setFirstName}
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Nachname *"
            value={lastName}
            onChangeText={setLastName}
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Email *"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Passwort *"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          <Text style={styles.label}>Mitgliedstyp:</Text>
          <View style={styles.typeButtons}>
            {['GUEST', 'TRIAL', 'FULL'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  membershipType === type && styles.typeButtonActive,
                ]}
                onPress={() => setMembershipType(type as MembershipType)}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    membershipType === type && styles.typeButtonTextActive,
                  ]}
                >
                  {type === 'GUEST' ? 'Gast' : type === 'TRIAL' ? 'Schnupper' : 'Vollmitglied'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Registrieren</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Text style={styles.linkText}>Bereits registriert? Zur Anmeldung</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xxl * 2,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  form: {
    gap: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    color: COLORS.text.secondary,
    fontSize: FONT_SIZES.sm,
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  linkButton: {
    padding: SPACING.sm,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
  },
});
