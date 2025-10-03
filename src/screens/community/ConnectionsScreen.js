import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { auth } from '../../services/firebase.config';
import { ConnectionService } from '../../services/community/connection.service';
import { COLORS } from '../../constants/colors';

const formatLocation = (location) => {
  if (!location) return 'Unknown location';
  if (typeof location === 'string') return location;

  const {
    address,
    village,
    union,
    upazila,
    district,
    city,
    state,
    country,
    lat,
    lng
  } = location;

  const parts = [
    address,
    village,
    union,
    upazila || district || city || state,
    country
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  if (typeof lat === 'number' && typeof lng === 'number') {
    const formatCoord = (value) => {
      const sign = value >= 0 ? '' : '-';
      return `${sign}${Math.abs(value).toFixed(2)}`;
    };
    return `${formatCoord(lat)}, ${formatCoord(lng)}`;
  }

  return 'Unknown location';
};

const ConnectionCard = ({ user, connection, onConnect, onAccept }) => {
  const locationText = formatLocation(user.location);

  if (connection?.status === 'accepted') {
    return (
      <View style={styles.connectionCardAccepted}>
        <Text style={styles.userName}>{user.name || 'Farmer'}</Text>
        <Text style={styles.userMeta}>{locationText}</Text>
        <Text style={styles.badge}>Connected</Text>
      </View>
    );
  }

  if (connection?.status === 'pending') {
    if (connection.userId2 === user.id) {
      return (
        <View style={styles.connectionCardPending}>
          <Text style={styles.userName}>{user.name || 'Farmer'}</Text>
          <Text style={styles.userMeta}>{locationText}</Text>
          <View style={styles.pendingActions}>
            <TouchableOpacity style={styles.acceptButton} onPress={() => onAccept(connection.id)}>
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.connectionCardPending}>
        <Text style={styles.userName}>{user.name || 'Farmer'}</Text>
        <Text style={styles.userMeta}>{locationText}</Text>
        <Text style={styles.badge}>Requested</Text>
      </View>
    );
  }

  return (
    <View style={styles.connectionCard}>
      <Text style={styles.userName}>{user.name || 'Farmer'}</Text>
      <Text style={styles.userMeta}>{locationText}</Text>
      <TouchableOpacity style={styles.connectButton} onPress={() => onConnect(user.id)}>
        <Text style={styles.connectText}>Connect</Text>
      </TouchableOpacity>
    </View>
  );
};

const ConnectionsScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const connectionService = useMemo(() => (user ? new ConnectionService(user.uid) : null), [user?.uid]);

  const [search, setSearch] = useState('');
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!connectionService) return;
    setLoading(true);
    try {
      const [conn, pending, users] = await Promise.all([
        connectionService.getConnections(),
        connectionService.getPendingRequests(),
        connectionService.searchUsers('', {})
      ]);
      setConnections(conn);
      setPendingRequests(pending);
      setResults(users);
    } catch (error) {
      console.error('Failed to load connections', error);
      Alert.alert('Error', 'Unable to load connections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [connectionService]);

  const handleSearch = async () => {
    if (!connectionService) return;
    const users = await connectionService.searchUsers(search, {});
    setResults(users);
  };

  const handleConnect = async (targetUserId) => {
    if (!connectionService) return;
    try {
      await connectionService.sendRequest(targetUserId);
      Alert.alert('Request sent', 'The user will be notified.');
      loadData();
    } catch (error) {
      Alert.alert('Unable to send request', error.message);
    }
  };

  const handleAccept = async (connectionId) => {
    if (!connectionService) return;
    await connectionService.acceptRequest(connectionId);
    loadData();
  };

  const findConnection = (userId) => {
    return connections.find((conn) => conn.userId === userId) || pendingRequests.find((req) => req.userId === userId);
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Please sign in to manage connections.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connect with Farmers</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or location"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primaryGreen} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
          <Text style={styles.sectionTitle}>Your Connections</Text>
          {connections.length === 0 ? (
            <Text style={styles.infoText}>No connections yet. Start by sending a request.</Text>
          ) : (
            <FlatList
              data={connections}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item }) => (
                <View style={styles.connectionPreview}>
                  <Text style={styles.userName}>{item.userName}</Text>
                  <Text style={styles.userMeta}>{item.status}</Text>
                </View>
              )}
            />
          )}

          <Text style={styles.sectionTitle}>Suggestions</Text>
          {results.map((userResult) => (
            <ConnectionCard
              key={userResult.id}
              user={userResult}
              connection={findConnection(userResult.id)}
              onConnect={handleConnect}
              onAccept={handleAccept}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D0D7DE',
  },
  searchButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchButtonText: { color: COLORS.pureWhite, fontWeight: '700' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2933',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  infoText: {
    color: '#6B7280',
    fontSize: 14,
    marginHorizontal: 20,
  },
  connectionPreview: {
    backgroundColor: COLORS.pureWhite,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 160,
  },
  connectionCard: {
    backgroundColor: COLORS.pureWhite,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  connectionCardAccepted: {
    backgroundColor: '#E0F2F1',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 16,
  },
  connectionCardPending: {
    backgroundColor: '#FFF7ED',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 16,
  },
  userName: { fontWeight: '700', color: '#111827' },
  userMeta: { color: '#6B7280', marginTop: 4 },
  connectButton: {
    marginTop: 12,
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  connectText: { color: COLORS.pureWhite, fontWeight: '700' },
  badge: {
    marginTop: 12,
    backgroundColor: '#047857',
    color: COLORS.pureWhite,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pendingActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptText: { color: COLORS.pureWhite, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default ConnectionsScreen;
