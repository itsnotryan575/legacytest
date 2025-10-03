import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { AuthService } from '@/services/AuthService';

export default function DeleteAccountSettings() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [isDeleting, setIsDeleting] = useState(false);

  const theme = {
    text: '#f0f0f0',
    background: isDark ? '#0B0909' : '#003C24',
    primary: isDark ? '#8C8C8C' : '#f0f0f0',
    secondary: isDark ? '#4A5568' : '#012d1c',
    accent: isDark ? '#44444C' : '#002818',
    cardBackground: isDark ? '#1A1A1A' : '#002818',
    border: isDark ? '#333333' : '#012d1c',
    danger: '#EF4444',
    isDark,
  };

  const handleDeleteAccount = () => {
    if (isDeleting) return;

    Alert.alert(
      'Delete Account',
      'This action is permanent and will remove your account, profile data, reminders, and stored files. You will not be able to recover this data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = () => {
    Alert.alert(
      'Final confirmation',
      'Are you absolutely sure you want to delete your account and all associated data?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, delete', style: 'destructive', onPress: performDelete },
      ]
    );
  };

  const performDelete = async () => {
    setIsDeleting(true);

    try {
      // Session-based: Edge Function reads the current JWT; no userId needed
      await AuthService.deleteAccount();

      Alert.alert('Account deleted', 'Your account has been permanently deleted.', [
        { text: 'OK', onPress: () => router.replace('/auth/sign-in') },
      ]);
    } catch (error: any) {
      console.error('Delete account error:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to delete account. Please try again in a moment.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Delete Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.warningCard, { backgroundColor: theme.cardBackground, borderColor: theme.danger }]}>
          <AlertTriangle size={48} color={theme.danger} />
          <Text style={[styles.warningTitle, { color: theme.danger }]}>Danger Zone</Text>
          <Text style={[styles.warningText, { color: theme.text }]}>
            Deleting your account is permanent and cannot be undone.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>What will be deleted</Text>

          {[
            'Your account and email identity',
            'All profiles and contacts you created',
            'All reminders and scheduled texts',
            'User-owned files (e.g., profile photos) stored by ARMi',
            'Any app-side analytics tied to your account',
          ].map((item) => (
            <View key={item} style={styles.deletionItem}>
              <View style={[styles.deletionDot, { backgroundColor: theme.danger }]} />
              <Text style={[styles.deletionText, { color: theme.primary }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Before you go</Text>
          <Text style={[styles.infoText, { color: theme.primary }]}>
            If you subscribed via the App Store or Google Play, cancel your subscription there to stop future charges.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.deleteButton,
            { backgroundColor: theme.danger },
            isDeleting && styles.buttonDisabled,
          ]}
          onPress={handleDeleteAccount}
          disabled={isDeleting}
          accessibilityLabel="Delete my account"
        >
          {isDeleting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Trash2 size={20} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>Delete My Account</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  headerSpacer: { width: 40 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  warningCard: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
  },
  warningTitle: { fontSize: 24, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  warningText: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  section: { borderRadius: 12, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  deletionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  deletionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  deletionText: { fontSize: 15, flex: 1 },
  infoText: { fontSize: 15, lineHeight: 22 },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  deleteButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  bottomSpacer: { height: 40 },
});