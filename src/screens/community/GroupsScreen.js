import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { auth } from '../../services/firebase.config';
import { GroupService } from '../../services/community/group.service';
import { COLORS } from '../../constants/colors';

const GroupCard = ({ group, membership, onJoin, onLeave }) => {
  const joined = Boolean(membership);
  return (
    <View style={styles.groupCard}>
      <Text style={styles.groupName}>{group.name}</Text>
      <Text style={styles.groupMeta}>{group.type?.toUpperCase()} • {group.location || 'Global'}</Text>
      <Text style={styles.groupDescription}>{group.description || 'No description provided.'}</Text>
      <TouchableOpacity
        style={joined ? styles.leaveButton : styles.joinButton}
        onPress={() => (joined ? onLeave(group.id) : onJoin(group.id))}
      >
        <Text style={joined ? styles.leaveText : styles.joinText}>{joined ? 'Leave Group' : 'Join Group'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const GroupsScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const service = useMemo(() => (user ? new GroupService(user.uid) : null), [user?.uid]);

  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!service) return;
    setLoading(true);
    try {
      const [groupList, userGroups] = await Promise.all([
        service.searchGroups({}),
        service.getUserGroups(),
      ]);
      setGroups(groupList);
      setMemberships(userGroups);
    } catch (error) {
      Alert.alert('Error', 'Unable to load groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [service]);

  const handleJoin = async (groupId) => {
    if (!service) return;
    try {
      await service.joinGroup(groupId);
      load();
    } catch (error) {
      Alert.alert('Unable to join', error.message);
    }
  };

  const handleLeave = async (groupId) => {
    if (!service) return;
    await service.leaveGroup(groupId);
    load();
  };

  const filtered = groups.filter((group) =>
    group.name?.toLowerCase().includes(search.toLowerCase()) ||
    group.description?.toLowerCase().includes(search.toLowerCase())
  );

  const membershipMap = new Map(memberships.map((g) => [g.id, g]));

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Sign in to manage group memberships.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Farmer Groups</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search groups by name or topic"
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primaryGreen} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 140 }}
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              membership={membershipMap.get(item.id)}
              onJoin={handleJoin}
              onLeave={handleLeave}
            />
          )}
          ListEmptyComponent={<Text style={styles.infoText}>No groups found.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  searchBar: { padding: 20 },
  searchInput: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  groupCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  groupName: { fontWeight: '700', color: '#111827', fontSize: 16 },
  groupMeta: { color: '#6B7280', marginTop: 4 },
  groupDescription: { marginTop: 8, color: '#4B5563' },
  joinButton: {
    marginTop: 12,
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  leaveButton: {
    marginTop: 12,
    backgroundColor: '#FDE68A',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinText: { color: COLORS.pureWhite, fontWeight: '700' },
  leaveText: { color: '#92400E', fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoText: { color: '#6B7280', marginHorizontal: 20, marginTop: 20 },
});

export default GroupsScreen;
