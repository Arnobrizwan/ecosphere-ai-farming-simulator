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
import { UserManagementService } from '../../services/admin/userManagement.service';
import { COLORS } from '../../constants/colors';

const ROLE_OPTIONS = ['farmer', 'student', 'researcher', 'officer', 'admin'];

const AdminUsersScreen = ({ navigation }) => {
  const admin = auth.currentUser;
  const service = useMemo(() => (admin ? new UserManagementService(admin.uid) : null), [admin?.uid]);

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: '', status: '' });

  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'farmer', permissions: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleInput, setRoleInput] = useState('');
  const [permissionsInput, setPermissionsInput] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [bulkCSV, setBulkCSV] = useState('email,name,role\n');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadUsers = async () => {
    if (!service) return;
    setLoading(true);
    try {
      const list = await service.searchUsers({
        role: filters.role || undefined,
        status: filters.status || undefined,
      });
      const summary = await service.getUserStats();
      setUsers(list);
      setStats(summary);
    } catch (error) {
      console.error('Failed to load users', error);
      Alert.alert('Error', 'Unable to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [service]);

  const refresh = () => {
    loadUsers();
  };

  const handleCreateUser = async () => {
    if (!service) return;
    if (!newUser.email.trim() || !newUser.name.trim()) {
      Alert.alert('Missing data', 'Name and email are required.');
      return;
    }
    setIsProcessing(true);
    try {
      await service.createUser({
        ...newUser,
        permissions: newUser.permissions
          .split(',')
          .map((perm) => perm.trim())
          .filter(Boolean),
      });
      Alert.alert('Success', 'User created and notified.');
      setNewUser({ name: '', email: '', role: 'farmer', permissions: '' });
      refresh();
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to create user.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignRole = async () => {
    if (!service || !selectedUser) return;
    if (!roleInput.trim()) {
      Alert.alert('Missing role', 'Enter the new role.');
      return;
    }
    setIsProcessing(true);
    try {
      await service.assignRole(selectedUser.id, roleInput.trim());
      Alert.alert('Updated', 'Role updated successfully.');
      refresh();
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to update role.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermissions = async () => {
    if (!service || !selectedUser) return;
    setIsProcessing(true);
    try {
      const perms = permissionsInput
        .split(',')
        .map((perm) => perm.trim())
        .filter(Boolean);
      await service.updatePermissions(selectedUser.id, perms);
      Alert.alert('Updated', 'Permissions saved.');
      refresh();
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to update permissions.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspend = async () => {
    if (!service || !selectedUser) return;
    if (!suspendReason.trim()) {
      Alert.alert('Missing reason', 'Add a suspension reason.');
      return;
    }
    setIsProcessing(true);
    try {
      await service.suspendUser(selectedUser.id, suspendReason.trim());
      Alert.alert('Suspended', 'User access revoked.');
      refresh();
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to suspend user.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnable = async () => {
    if (!service || !selectedUser) return;
    setIsProcessing(true);
    try {
      await service.enableUser(selectedUser.id);
      Alert.alert('Restored', 'User access restored.');
      refresh();
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to enable user.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetMFA = async () => {
    if (!service || !selectedUser) return;
    setIsProcessing(true);
    try {
      await service.resetMFA(selectedUser.id);
      Alert.alert('Reset', 'MFA has been cleared.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to reset MFA.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!service || !selectedUser) return;
    setIsProcessing(true);
    try {
      await service.resetPassword(selectedUser.id);
      Alert.alert('Reset', 'Password reset instructions sent.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to reset password.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkImport = async () => {
    if (!service) return;
    if (!bulkCSV.trim()) {
      Alert.alert('Missing CSV', 'Paste CSV data to import.');
      return;
    }
    setIsProcessing(true);
    try {
      const results = await service.bulkImport(bulkCSV.trim());
      const failures = results.filter((r) => !r.success);
      if (failures.length) {
        Alert.alert('Import completed with issues', `${failures.length} rows failed.`);
      } else {
        Alert.alert('Import successful', `Imported ${results.length} users.`);
      }
      refresh();
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to import users.');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectUser = (userRecord) => {
    setSelectedUser(userRecord);
    setRoleInput(userRecord.role || '');
    setPermissionsInput((userRecord.permissions || []).join(', '));
  };

  if (!admin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Sign in with an administrator account to manage users.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin • Users & Roles</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primaryGreen} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 200 }}>
          {stats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Directory Snapshot</Text>
              <Text style={styles.infoText}>Total users: {stats.total}</Text>
              <Text style={styles.infoText}>Active accounts: {stats.active}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Filters</Text>
            <View style={styles.inlineRow}>
              <TextInput
                style={styles.input}
                placeholder="Role"
                value={filters.role}
                onChangeText={(value) => setFilters((prev) => ({ ...prev, role: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Status"
                value={filters.status}
                onChangeText={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              />
              <TouchableOpacity style={styles.smallButton} onPress={loadUsers}>
                <Text style={styles.smallButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Create User</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={newUser.name}
              onChangeText={(value) => setNewUser((prev) => ({ ...prev, name: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={newUser.email}
              onChangeText={(value) => setNewUser((prev) => ({ ...prev, email: value }))}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Role"
              value={newUser.role}
              onChangeText={(value) => setNewUser((prev) => ({ ...prev, role: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Permissions (comma separated)"
              value={newUser.permissions}
              onChangeText={(value) => setNewUser((prev) => ({ ...prev, permissions: value }))}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleCreateUser} disabled={isProcessing}>
              <Text style={styles.primaryButtonText}>Create User</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bulk Import (CSV)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              value={bulkCSV}
              onChangeText={setBulkCSV}
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={handleBulkImport} disabled={isProcessing}>
              <Text style={styles.secondaryButtonText}>Import Users</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Directory</Text>
            {users.map((userRecord) => (
              <TouchableOpacity
                key={userRecord.id}
                style={[styles.userRow, selectedUser?.id === userRecord.id && styles.userRowSelected]}
                onPress={() => selectUser(userRecord)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{userRecord.name || userRecord.email}</Text>
                  <Text style={styles.userMeta}>{userRecord.email}</Text>
                  <Text style={styles.userMeta}>Role: {userRecord.role} • Status: {userRecord.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {selectedUser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Manage: {selectedUser.name || selectedUser.email}</Text>
              <TextInput
                style={styles.input}
                placeholder="Role"
                value={roleInput}
                onChangeText={setRoleInput}
              />
              <TouchableOpacity style={styles.secondaryButton} onPress={handleAssignRole} disabled={isProcessing}>
                <Text style={styles.secondaryButtonText}>Update Role</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Permissions (comma separated)"
                value={permissionsInput}
                onChangeText={setPermissionsInput}
              />
              <TouchableOpacity style={styles.secondaryButton} onPress={handlePermissions} disabled={isProcessing}>
                <Text style={styles.secondaryButtonText}>Update Permissions</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Suspend reason"
                value={suspendReason}
                onChangeText={setSuspendReason}
              />
              <View style={styles.inlineRow}>
                <TouchableOpacity style={styles.dangerButton} onPress={handleSuspend} disabled={isProcessing}>
                  <Text style={styles.dangerButtonText}>Suspend</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleEnable} disabled={isProcessing}>
                  <Text style={styles.secondaryButtonText}>Enable</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inlineRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleResetMFA} disabled={isProcessing}>
                  <Text style={styles.secondaryButtonText}>Reset MFA</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleResetPassword} disabled={isProcessing}>
                  <Text style={styles.secondaryButtonText}>Reset Password</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F6FF' },
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
  sectionTitle: { fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  input: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    color: '#111827',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: COLORS.pureWhite, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryButtonText: { color: '#4338CA', fontWeight: '700' },
  smallButton: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  smallButtonText: { color: COLORS.pureWhite, fontWeight: '700' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userRow: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 10,
  },
  userRowSelected: { borderColor: COLORS.primaryGreen },
  userName: { fontWeight: '700', color: '#111827' },
  userMeta: { color: '#6B7280' },
  dangerButton: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButtonText: { color: '#B91C1C', fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  infoText: { color: '#4B5563' },
});

export default AdminUsersScreen;
