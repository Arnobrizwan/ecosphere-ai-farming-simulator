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
import { AccessApprovalService } from '../../services/admin/accessApproval.service';
import { COLORS } from '../../constants/colors';

const AccessRequestCard = ({ request, onApprove, onDeny }) => (
  <View style={styles.requestCard}>
    <Text style={styles.requestTitle}>{request.requesterName || request.userId}</Text>
    <Text style={styles.requestMeta}>Dataset: {request.datasetId || 'N/A'} • Classification: {request.classification || 'unclassified'}</Text>
    <Text style={styles.requestPurpose}>{request.purpose || 'No description provided.'}</Text>
    <View style={styles.requestActions}>
      <TouchableOpacity style={styles.approveButton} onPress={() => onApprove(request)}>
        <Text style={styles.approveText}>Approve</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.denyButton} onPress={() => onDeny(request)}>
        <Text style={styles.denyText}>Deny</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const AdminAccessScreen = ({ navigation }) => {
  const admin = auth.currentUser;
  const service = useMemo(() => (admin ? new AccessApprovalService(admin.uid) : null), [admin?.uid]);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionsInput, setPermissionsInput] = useState('datasets.read');
  const [expiryInput, setExpiryInput] = useState('2025-12-31');
  const [renewable, setRenewable] = useState('true');
  const [denialReason, setDenialReason] = useState('Insufficient justification');
  const [revokeId, setRevokeId] = useState('');

  const loadRequests = async () => {
    if (!service) return;
    setLoading(true);
    try {
      const list = await service.getPendingRequests();
      setRequests(list);
    } catch (error) {
      Alert.alert('Error', 'Unable to load pending access requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [service]);

  const handleApprove = async (request) => {
    if (!service) return;
    try {
      const expiresAt = Date.parse(expiryInput);
      if (Number.isNaN(expiresAt)) {
        Alert.alert('Invalid expiry', 'Provide a valid expiry date (YYYY-MM-DD).');
        return;
      }
      await service.approveAccess(request.id, {
        permissions: permissionsInput.split(',').map((p) => p.trim()).filter(Boolean),
        expiresAt,
        renewable: renewable.toLowerCase() === 'true',
      });
      Alert.alert('Approved', `Access granted for ${request.requesterName || request.userId}.`);
      loadRequests();
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to approve access.');
    }
  };

  const handleDeny = async (request) => {
    if (!service) return;
    try {
      await service.denyAccess(request.id, { reason: denialReason.trim() || 'Not specified' });
      Alert.alert('Denied', `Request denied for ${request.requesterName || request.userId}.`);
      loadRequests();
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to deny request.');
    }
  };

  const handleRevoke = async () => {
    if (!service || !revokeId.trim()) return;
    try {
      await service.revokeAccess(revokeId.trim());
      Alert.alert('Revoked', `Access ${revokeId} revoked.`);
      setRevokeId('');
      loadRequests();
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to revoke access.');
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
        <Text style={styles.headerTitle}>Admin • Research Access</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primaryGreen} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
          <Text style={styles.sectionTitle}>Pending Requests</Text>
          {requests.length === 0 ? (
            <Text style={styles.infoText}>No pending access requests.</Text>
          ) : (
            requests.map((request) => (
              <AccessRequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onDeny={handleDeny}
              />
            ))
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Approval Defaults</Text>
            <TextInput
              style={styles.input}
              placeholder="Permissions (comma separated)"
              value={permissionsInput}
              onChangeText={setPermissionsInput}
            />
            <TextInput
              style={styles.input}
              placeholder="Expiry (YYYY-MM-DD)"
              value={expiryInput}
              onChangeText={setExpiryInput}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Renewable (true/false)"
              value={renewable}
              onChangeText={setRenewable}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Denial reason"
              value={denialReason}
              onChangeText={setDenialReason}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Revoke Access</Text>
            <TextInput
              style={styles.input}
              placeholder="Access request ID"
              value={revokeId}
              onChangeText={setRevokeId}
            />
            <TouchableOpacity style={styles.dangerButton} onPress={handleRevoke}>
              <Text style={styles.dangerText}>Revoke Access</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2FDFB' },
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
  sectionTitle: { fontWeight: '700', color: '#0F172A', marginHorizontal: 20, marginTop: 20 },
  requestCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 12,
  },
  requestTitle: { fontWeight: '700', color: '#0F172A' },
  requestMeta: { color: '#334155', marginTop: 4 },
  requestPurpose: { marginTop: 8, color: '#1E293B' },
  requestActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  approveButton: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveText: { color: '#166534', fontWeight: '700' },
  denyButton: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  denyText: { color: '#991B1B', fontWeight: '700' },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  input: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  dangerText: { color: '#991B1B', fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  infoText: { color: '#475569', marginHorizontal: 20, marginTop: 10 },
});

export default AdminAccessScreen;
