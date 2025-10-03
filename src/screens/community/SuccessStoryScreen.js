import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../../services/firebase.config';
import SuccessStoryService from '../../services/community/successStory.service';
import { COLORS } from '../../constants/colors';

const SuccessStoryScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const service = useMemo(() => (user ? new SuccessStoryService(user.uid) : null), [user?.uid]);

  const [title, setTitle] = useState('');
  const [narrative, setNarrative] = useState('');
  const [metrics, setMetrics] = useState('');
  const [testimonials, setTestimonials] = useState('');
  const [media, setMedia] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow access to your gallery to attach media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 3,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (!result.canceled) {
      const selected = result.assets?.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || asset.uri.split('/').pop(),
        type: asset.type || 'image/jpeg',
      })) || [];
      setMedia((prev) => [...prev, ...selected]);
    }
  };

  const removeMedia = (index) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!service) {
      Alert.alert('Sign in required', 'Please sign in to share a success story.');
      return;
    }

    if (!title.trim() || !narrative.trim()) {
      Alert.alert('Missing info', 'Title and narrative are required.');
      return;
    }

    setSubmitting(true);
    try {
      await service.createStory({
        title: title.trim(),
        narrative: narrative.trim(),
        metricsText: metrics.trim(),
        testimonialsText: testimonials.trim(),
        media,
      });
      Alert.alert('Thank you!', 'Your success story has been submitted.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to publish success story.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Success Story</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={styles.section}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="How we increased rice yield by 30%"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Narrative</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={narrative}
            onChangeText={setNarrative}
            placeholder="Describe your farming journey, challenges, and outcomes..."
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Key Metrics (optional)</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={metrics}
            onChangeText={setMetrics}
            placeholder="Yield increase: +30%\nWater saved: 15%\nIncome boost: 25,000 BDT"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Testimonials (optional)</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={testimonials}
            onChangeText={setTestimonials}
            placeholder="Include quotes from buyers, community members, or partners"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Photos</Text>
          <TouchableOpacity style={styles.mediaButton} onPress={pickMedia}>
            <Text style={styles.mediaButtonText}>Add Photos</Text>
          </TouchableOpacity>
          <View style={styles.mediaRow}>
            {media.map((file, index) => (
              <View key={`${file.uri}-${index}`} style={styles.mediaPreview}>
                <Image source={{ uri: file.uri }} style={styles.mediaImage} />
                <TouchableOpacity style={styles.mediaRemove} onPress={() => removeMedia(index)}>
                  <Text style={styles.mediaRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={submitting}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={COLORS.pureWhite} /> : <Text style={styles.submitText}>Publish</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
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
  scrollArea: { paddingHorizontal: 20 },
  section: { marginTop: 18 },
  label: { fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  input: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  textArea: {
    minHeight: 120,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    textAlignVertical: 'top',
  },
  mediaButton: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  mediaButtonText: { color: '#C2410C', fontWeight: '700' },
  mediaRow: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  mediaPreview: { width: 96, height: 96, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  mediaImage: { width: '100%', height: '100%' },
  mediaRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRemoveText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: COLORS.pureWhite,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5F5',
  },
  cancelText: { color: '#4B5563', fontWeight: '600' },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primaryGreen,
  },
  submitText: { color: COLORS.pureWhite, fontWeight: '700' },
});

export default SuccessStoryScreen;
