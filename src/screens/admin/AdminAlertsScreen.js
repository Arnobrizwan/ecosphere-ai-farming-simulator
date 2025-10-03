import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { auth } from '../../services/firebase.config';
import { AlertManagementService } from '../../services/admin/alertManagement.service';
import { COLORS } from '../../constants/colors';

const AdminAlertsScreen = ({ navigation }) => {
  const admin = auth.currentUser;
  const service = useMemo(() => (admin ? new AlertManagementService(admin.uid) : null), [admin?.uid]);

  const [notice, setNotice] = useState({
    type: 'banner',
    title: 'System Maintenance',
    message: 'We will undergo maintenance on Sunday at 9pm UTC.',
    severity: 'info',
    audience: 'all',
    schedule: 'immediate',
  });

  const [template, setTemplate] = useState({
    name: 'Weather Alert',
    message: 'Heavy rain expected in your area. Secure equipment now.',
    channels: 'push,email',
    audience: 'farmer',
  });

  const [noticeId, setNoticeId] = useState('');
  const [templateResult, setTemplateResult] = useState(null);

  const ensureService = () => {
    if (!service) {
      Alert.alert('Admin only', 'Administrator account required.');
      return false;
    }
    return true;
  };

  const handleCreateNotice = async () => {
    if (!ensureService()) return;
    try {
      const created = await service.createNotice(notice);
      setNoticeId(created.id);
      Alert.alert('Notice created', `Draft saved as ${created.id}.`);
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to create notice.');
    }
  };

  const handleSendNotice = async () => {
    if (!ensureService()) return;
    if (!noticeId.trim()) {
      Alert.alert('Missing ID', 'Create or enter a notice ID to send.');
      return;
    }
    try {
      await service.sendNotice(noticeId.trim());
      Alert.alert('Sent', 'Notice dispatched to target audience.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to send notice.');
    }
  };

  const handleRevokeNotice = async () => {
    if (!ensureService()) return;
    if (!noticeId.trim()) {
      Alert.alert('Missing ID', 'Enter a notice ID to revoke.');
      return;
    }
    try {
      await service.revokeNotice(noticeId.trim());
      Alert.alert('Revoked', 'Notice revoked and removed.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to revoke notice.');
    }
  };

  const handleCreateTemplate = async () => {
    if (!ensureService()) return;
    try {
      const created = await service.createAlertTemplate({
        ...template,
        channels: template.channels.split(',').map((c) => c.trim()).filter(Boolean),
      });
      setTemplateResult(created);
      Alert.alert('Template created', `Template ${created.name} saved.`);
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to create template.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin • Alerts & Notices</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Notice</Text>
          <TextInput
            style={styles.input}
            placeholder="Type (banner, modal, push)"
            value={notice.type}
            onChangeText={(value) => setNotice((prev) => ({ ...prev, type: value }))}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={notice.title}
            onChangeText={(value) => setNotice((prev) => ({ ...prev, title: value }))}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Message"
            value={notice.message}
            onChangeText={(value) => setNotice((prev) => ({ ...prev, message: value }))}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Severity (info/warn/critical)"
            value={notice.severity}
            onChangeText={(value) => setNotice((prev) => ({ ...prev, severity: value }))}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Audience (role/region/crop)"
            value={notice.audience}
            onChangeText={(value) => setNotice((prev) => ({ ...prev, audience: value }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Schedule (immediate/2025-10-01T12:00)"
            value={notice.schedule}
            onChangeText={(value) => setNotice((prev) => ({ ...prev, schedule: value }))}
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleCreateNotice}>
            <Text style={styles.primaryButtonText}>Save Draft</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send / Revoke Notice</Text>
          <TextInput
            style={styles.input}
            placeholder="Notice ID"
            value={noticeId}
            onChangeText={setNoticeId}
            autoCapitalize="none"
          />
          <View style={styles.inlineRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleSendNotice}>
              <Text style={styles.secondaryText}>Send Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerButton} onPress={handleRevokeNotice}>
              <Text style={styles.dangerText}>Revoke</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Template</Text>
          <TextInput
            style={styles.input}
            placeholder="Template name"
            value={template.name}
            onChangeText={(value) => setTemplate((prev) => ({ ...prev, name: value }))}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Message"
            value={template.message}
            onChangeText={(value) => setTemplate((prev) => ({ ...prev, message: value }))}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Channels (push,email,sms)"
            value={template.channels}
            onChangeText={(value) => setTemplate((prev) => ({ ...prev, channels: value }))}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Audience filter"
            value={template.audience}
            onChangeText={(value) => setTemplate((prev) => ({ ...prev, audience: value }))}
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={handleCreateTemplate}>
            <Text style={styles.secondaryText}>Save Template</Text>
          </TouchableOpacity>
          {templateResult && (
            <Text style={styles.infoText}>Template saved as {templateResult.id}.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF2' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  sectionTitle: { fontWeight: '700', color: '#7C2D12', marginBottom: 8 },
  input: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: COLORS.pureWhite, fontWeight: '700' },
  inlineRow: { flexDirection: 'row', gap: 12 },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: '#B45309', fontWeight: '700' },
  dangerButton: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerText: { color: '#B91C1C', fontWeight: '700' },
  infoText: { color: '#78350F', marginTop: 8 },
});

export default AdminAlertsScreen;
