import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { auth } from '../../services/firebase.config';
import { ModerationService } from '../../services/admin/moderation.service';
import { COLORS } from '../../constants/colors';

const ModerationItem = ({ item, onDecision }) => (
  <View style={styles.queueItem}>
    <Text style={styles.itemTitle}>{item.type?.toUpperCase()} • {item.reason || 'Flagged content'}</Text>
    <Text style={styles.itemMeta}>Content ID: {item.contentId || item.id}</Text>
    <Text style={styles.itemPreview}>{item.preview || 'No preview available.'}</Text>
    <View style={styles.actionRow}>
      <TouchableOpacity style={styles.approveButton} onPress={() => onDecision(item, 'approve')}>
        <Text style={styles.approveText}>Approve</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.rejectButton} onPress={() => onDecision(item, 'reject')}>
        <Text style={styles.rejectText}>Reject</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const AdminModerationScreen = ({ navigation }) => {
  const admin = auth.currentUser;
  const service = useMemo(() => (admin ? new ModerationService(admin.uid) : null), [admin?.uid]);

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState({ action: '', reason: '', policyReference: '', warning: '' });

  const [banUserId, setBanUserId] = useState('');
  const [banDuration, setBanDuration] = useState('7');
  const [banReason, setBanReason] = useState('');

  const [rulePattern, setRulePattern] = useState('viagra|spam link');
  const [ruleAction, setRuleAction] = useState('reject');

  const reload = async () => {
    if (!service) return;
    setLoading(true);
    try {
      const items = await service.getModerationQueue();
      setQueue(items);
    } catch (error) {
      Alert.alert('Error', 'Unable to load moderation queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [service]);

  const handleDecision = async (item, defaultAction) => {
    if (!service) return;
    const action = defaultAction === 'approve' ? 'approve' : 'reject';

    const decision = {
      action,
      reason: selectedAction.reason || item.reason || 'Policy violation',
      policyReference: selectedAction.policyReference || 'COMMUNITY_GUIDELINES',
      warning: selectedAction.warning || '',
    };

    try {
      await service.reviewItem(item.id, decision);
      Alert.alert('Moderated', `Content ${action}ed.`);
      setSelectedAction({ action: '', reason: '', policyReference: '', warning: '' });
      reload();
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to record decision.');
    }
  };

  const handleBan = async () => {
    if (!service) return;
    const days = parseInt(banDuration, 10);
    if (!banUserId.trim() || Number.isNaN(days)) {
      Alert.alert('Missing data', 'Provide user ID and duration.');
      return;
    }
    try {
      await service.banUser(banUserId.trim(), { duration: days, reason: banReason || 'Policy violation' });
      Alert.alert('User banned', `User ${banUserId} banned for ${days} day(s).`);
      setBanUserId('');
      setBanDuration('7');
      setBanReason('');
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to ban user.');
    }
  };

  const handleAutoRule = async () => {
    if (!service) return;
    if (!rulePattern.trim()) {
      Alert.alert('Missing pattern', 'Provide a regex pattern.');
      return;
    }
    try {
      await service.setAutoModerationRule({ pattern: rulePattern.trim(), action: ruleAction });
      Alert.alert('Rule added', 'Auto-moderation rule saved.');
      setRulePattern('');
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to create rule.');
    }
  };

  if (!admin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Administrator credentials required.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin • Moderation Queue</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primaryGreen} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
          <Text style={styles.sectionTitle}>Pending Reviews</Text>
          {queue.length === 0 ? (
            <Text style={styles.infoText}>No pending items. Moderation queue is clean.</Text>
          ) : (
            queue.map((item) => (
              <ModerationItem key={item.id} item={item} onDecision={handleDecision} />
            ))
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Decision Defaults</Text>
            <TextInput
              style={styles.input}
              placeholder="Decision reason"
              value={selectedAction.reason}
              onChangeText={(value) => setSelectedAction((prev) => ({ ...prev, reason: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Policy reference"
              value={selectedAction.policyReference}
              onChangeText={(value) => setSelectedAction((prev) => ({ ...prev, policyReference: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Warning message (optional)"
              value={selectedAction.warning}
              onChangeText={(value) => setSelectedAction((prev) => ({ ...prev, warning: value }))}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ban User</Text>
            <TextInput
              style={styles.input}
              placeholder="User ID"
              value={banUserId}
              onChangeText={setBanUserId}
            />
            <TextInput
              style={styles.input}
              placeholder="Duration (days)"
              keyboardType="numeric"
              value={banDuration}
              onChangeText={setBanDuration}
            />
            <TextInput
              style={styles.input}
              placeholder="Reason"
              value={banReason}
              onChangeText={setBanReason}
            />
            <TouchableOpacity style={styles.dangerButton} onPress={handleBan}>
              <Text style={styles.dangerButtonText}>Ban User</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Auto-Moderation Rule</Text>
            <TextInput
              style={styles.input}
              placeholder="Pattern (regex)"
              value={rulePattern}
              onChangeText={setRulePattern}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Action (reject | review)"
              value={ruleAction}
              onChangeText={setRuleAction}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={handleAutoRule}>
              <Text style={styles.secondaryButtonText}>Add Rule</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF4F5' },
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
  section: { padding: 20 },
  sectionTitle: { fontWeight: '700', color: '#111827', marginBottom: 8 },
  infoText: { color: '#6B7280', paddingHorizontal: 20, paddingVertical: 10 },
  queueItem: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 12,
  },
  itemTitle: { fontWeight: '700', color: '#B91C1C' },
  itemMeta: { color: '#6B7280', marginTop: 4 },
  itemPreview: { color: '#374151', marginTop: 8 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  approveButton: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  approveText: { color: '#166534', fontWeight: '700' },
  rejectButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  rejectText: { color: '#991B1B', fontWeight: '700' },
  input: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#E0E7FF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#3730A3', fontWeight: '700' },
  dangerButton: {
    backgroundColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerButtonText: { color: '#7F1D1D', fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default AdminModerationScreen;
