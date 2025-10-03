import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { auth } from '../../services/firebase.config';
import { AuditComplianceService } from '../../services/admin/auditCompliance.service';
import { COLORS } from '../../constants/colors';

const AdminAuditScreen = ({ navigation }) => {
  const admin = auth.currentUser;
  const service = useMemo(() => (admin ? new AuditComplianceService(admin.uid) : null), [admin?.uid]);

  const [start, setStart] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  const [end, setEnd] = useState(new Date().toISOString());
  const [scope, setScope] = useState('user,moderation,settings');
  const [format, setFormat] = useState('pdf');
  const [reportUrl, setReportUrl] = useState('');
  const [exportUrl, setExportUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const ensureService = () => {
    if (!service) {
      Alert.alert('Admin only', 'Administrator account required.');
      return false;
    }
    return true;
  };

  const buildTimeframe = () => ({ start: Date.parse(start), end: Date.parse(end) });

  const handleGenerateReport = async () => {
    if (!ensureService()) return;
    const timeframe = buildTimeframe();
    if (Number.isNaN(timeframe.start) || Number.isNaN(timeframe.end)) {
      Alert.alert('Invalid timeframe', 'Provide ISO timestamps.');
      return;
    }
    setLoading(true);
    try {
      const response = await service.generateReport({
        timeframe,
        scope: scope.split(',').map((s) => s.trim()).filter(Boolean),
        format,
      });
      setReportUrl(response.url);
      Alert.alert('Report ready', 'Download link has been generated.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportLogs = async () => {
    if (!ensureService()) return;
    const timeframe = buildTimeframe();
    setLoading(true);
    try {
      const response = await service.exportLogs({ timeframe, format });
      setExportUrl(response.url);
      Alert.alert('Export ready', `${response.eventCount} events exported.`);
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to export logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleReport = async () => {
    if (!ensureService()) return;
    try {
      const response = await service.scheduleReport({
        frequency: 'monthly',
        recipients: ['compliance@example.com'],
        scope: scope.split(',').map((s) => s.trim()).filter(Boolean),
      });
      Alert.alert('Scheduled', `Report scheduling ${response.scheduled ? 'enabled' : 'failed'}.`);
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to schedule reports.');
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
        <Text style={styles.headerTitle}>Admin • Audit & Compliance</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeframe</Text>
          <TextInput
            style={styles.input}
            placeholder="Start ISO"
            value={start}
            onChangeText={setStart}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="End ISO"
            value={end}
            onChangeText={setEnd}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scope & Format</Text>
          <TextInput
            style={styles.input}
            placeholder="Scope resources"
            value={scope}
            onChangeText={setScope}
          />
          <TextInput
            style={styles.input}
            placeholder="Format (pdf/csv/json)"
            value={format}
            onChangeText={setFormat}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGenerateReport} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.pureWhite} /> : <Text style={styles.primaryText}>Generate Report</Text>}
          </TouchableOpacity>
          {reportUrl ? <Text style={styles.infoText}>Report URL: {reportUrl}</Text> : null}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleExportLogs} disabled={loading}>
            <Text style={styles.secondaryText}>Export Logs</Text>
          </TouchableOpacity>
          {exportUrl ? <Text style={styles.infoText}>Export URL: {exportUrl}</Text> : null}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.scheduleButton} onPress={handleScheduleReport}>
            <Text style={styles.scheduleText}>Schedule Monthly Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4FF' },
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
  sectionTitle: { fontWeight: '700', color: '#312E81', marginBottom: 8 },
  input: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#4C1D95',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: COLORS.pureWhite, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#DDD6FE',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: '#4C1D95', fontWeight: '700' },
  scheduleButton: {
    backgroundColor: '#C4B5FD',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  scheduleText: { color: '#312E81', fontWeight: '700' },
  infoText: { color: '#4338CA', marginTop: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default AdminAuditScreen;
