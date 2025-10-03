import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { auth } from '../../services/firebase.config';
import { ExpertService } from '../../services/community/expert.service';
import { COLORS } from '../../constants/colors';

const ExpertCard = ({ expert, onRequest }) => (
  <View style={styles.expertCard}>
    <Text style={styles.expertName}>{expert.name}</Text>
    <Text style={styles.expertMeta}>{expert.region || 'Available nationwide'}</Text>
    <Text style={styles.expertSpecialty}>{expert.expertise?.join(', ') || 'General agronomy'}</Text>
    <TouchableOpacity style={styles.requestButton} onPress={() => onRequest(expert)}>
      <Text style={styles.requestText}>Request Consultation</Text>
    </TouchableOpacity>
  </View>
);

const ExpertsScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const service = useMemo(() => (user ? new ExpertService(user.uid) : null), [user?.uid]);

  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    const loadExperts = async () => {
      if (!service) return;
      setLoading(true);
      try {
        const list = await service.searchExperts({});
        setExperts(list);
      } catch (error) {
        Alert.alert('Error', 'Unable to load experts.');
      } finally {
        setLoading(false);
      }
    };
    loadExperts();
  }, [service]);

  const handleRequest = async (expert) => {
    if (!service) return;
    if (!topic.trim() || !description.trim() || !scheduledDate.trim()) {
      Alert.alert('Missing details', 'Provide topic, description, and preferred date.');
      return;
    }

    try {
      await service.requestConsultation({
        expertId: expert.id,
        topic: topic.trim(),
        description: description.trim(),
        preferredDate: scheduledDate.trim(),
      });
      Alert.alert('Request sent', `Your consultation request was sent to ${expert.name}.`);
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to request consultation.');
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Sign in to access expert consultations.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expert Network</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.requestForm}>
        <Text style={styles.formTitle}>Consultation Request</Text>
        <TextInput
          style={styles.input}
          value={topic}
          onChangeText={setTopic}
          placeholder="Topic (e.g., Rice blast management)"
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your issue or question"
          multiline
        />
        <TextInput
          style={styles.input}
          value={scheduledDate}
          onChangeText={setScheduledDate}
          placeholder="Preferred date/time (e.g., 2025-10-05 14:00)"
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primaryGreen} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
          <Text style={styles.sectionTitle}>Available Experts</Text>
          {experts.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} onRequest={handleRequest} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FBFC' },
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
  requestForm: { padding: 20, gap: 12 },
  formTitle: { fontWeight: '700', color: '#1F2937' },
  input: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    color: '#374151',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  expertCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  expertName: { fontWeight: '700', color: '#111827', fontSize: 16 },
  expertMeta: { color: '#6B7280', marginTop: 4 },
  expertSpecialty: { marginTop: 6, color: '#2563EB', fontWeight: '600' },
  requestButton: {
    marginTop: 12,
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  requestText: { color: COLORS.pureWhite, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoText: { color: '#6B7280' },
});

export default ExpertsScreen;
