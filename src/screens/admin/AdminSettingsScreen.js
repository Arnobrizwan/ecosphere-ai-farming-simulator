import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { auth } from '../../services/firebase.config';
import { SystemSettingsService } from '../../services/admin/systemSettings.service';
import { COLORS } from '../../constants/colors';

const AdminSettingsScreen = ({ navigation }) => {
  const admin = auth.currentUser;
  const service = useMemo(() => (admin ? new SystemSettingsService(admin.uid) : null), [admin?.uid]);

  const [category, setCategory] = useState('global');
  const [settingsText, setSettingsText] = useState(`{
  "featureFlags": {
    "aiEnabled": true
  }
}`);
  const [currentSettings, setCurrentSettings] = useState(null);
  const [featureFlagName, setFeatureFlagName] = useState('newDashboard');
  const [featureFlagEnabled, setFeatureFlagEnabled] = useState('true');
  const [rollbackVersion, setRollbackVersion] = useState('1');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadSettings = async () => {
    if (!service) return;
    setLoading(true);
    try {
      const data = await service.getSettings(category);
      setCurrentSettings(data);
      if (data?.settings) {
        setSettingsText(JSON.stringify(data.settings, null, 2));
      }
    } catch (error) {
      console.warn('Settings load failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [service, category]);

  const handleUpdate = async () => {
    if (!service) return;
    setProcessing(true);
    try {
      const parsed = JSON.parse(settingsText);
      await service.updateSettings({ category, settings: parsed });
      Alert.alert('Saved', 'Settings updated successfully.');
      loadSettings();
    } catch (error) {
      Alert.alert('Error', error.message || 'Invalid JSON payload.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFeatureFlag = async () => {
    if (!service || !featureFlagName.trim()) return;
    setProcessing(true);
    try {
      const enabled = featureFlagEnabled.toLowerCase() === 'true';
      await service.setFeatureFlag(featureFlagName.trim(), enabled);
      Alert.alert('Updated', `Feature flag ${featureFlagName} set to ${enabled}.`);
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to set feature flag.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRollback = async () => {
    if (!service) return;
    const version = parseInt(rollbackVersion, 10);
    if (Number.isNaN(version)) {
      Alert.alert('Invalid version', 'Enter a valid version number.');
      return;
    }
    setProcessing(true);
    try {
      await service.rollback(category, version);
      Alert.alert('Rolled back', `Restored version ${version}.`);
      loadSettings();
    } catch (error) {
      Alert.alert('Error', error.message || 'Rollback failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (!admin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Administrator account required.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin • System Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primaryGreen} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Category (e.g., global, featureFlags, analytics)"
              autoCapitalize="none"
            />
            {currentSettings ? (
              <Text style={styles.infoText}>Current version: {currentSettings.version}</Text>
            ) : (
              <Text style={styles.infoText}>No versions configured yet.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings JSON</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={settingsText}
              onChangeText={setSettingsText}
              multiline
              autoCorrect={false}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleUpdate} disabled={processing}>
              <Text style={styles.primaryButtonText}>Save Settings</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Feature Flags</Text>
            <TextInput
              style={styles.input}
              value={featureFlagName}
              onChangeText={setFeatureFlagName}
              placeholder="Flag name"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={featureFlagEnabled}
              onChangeText={setFeatureFlagEnabled}
              placeholder="true | false"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={handleFeatureFlag} disabled={processing}>
              <Text style={styles.secondaryButtonText}>Update Feature Flag</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rollback</Text>
            <TextInput
              style={styles.input}
              value={rollbackVersion}
              onChangeText={setRollbackVersion}
              placeholder="Version number"
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.dangerButton} onPress={handleRollback} disabled={processing}>
              <Text style={styles.dangerButtonText}>Rollback Category</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFF6FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.primaryGreen,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: COLORS.pureWhite, fontSize: 20 },
  headerTitle: { color: COLORS.pureWhite, fontSize: 20, fontWeight: '700' },
  section: { paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  input: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#111827',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: COLORS.pureWhite, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#0284C7', fontWeight: '700' },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerButtonText: { color: '#B91C1C', fontWeight: '700' },
  infoText: { color: '#475569' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
});

export default AdminSettingsScreen;
