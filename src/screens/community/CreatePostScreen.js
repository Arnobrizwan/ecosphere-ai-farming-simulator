import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { auth } from '../../services/firebase.config';
import PostService from '../../services/community/post.service';

const VISIBILITY_OPTIONS = ['public', 'followers', 'group'];

const CreatePostScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const [content, setContent] = useState('');
  const [groupId, setGroupId] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [tagInput, setTagInput] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [media, setMedia] = useState([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleOffsetHours, setScheduleOffsetHours] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postService = useMemo(() => {
    if (!user?.uid) return null;
    return new PostService(user.uid);
  }, [user?.uid]);

  const addHashtag = () => {
    const raw = tagInput.trim().replace(/^#/, '');
    if (!raw) return;

    const normalized = raw.toLowerCase();
    if (!hashtags.includes(normalized)) {
      setHashtags((prev) => [...prev, normalized]);
    }
    setTagInput('');
  };

  const removeHashtag = (tag) => {
    setHashtags((prev) => prev.filter((item) => item !== tag));
  };

  const pickMedia = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Media access is needed to attach photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      selectionLimit: 3,
    });

    if (!result.canceled) {
      const selected = result.assets?.map((asset) => ({
        uri: asset.uri,
        type: asset.type || 'image',
        name: asset.fileName || asset.uri.split('/').pop(),
      })) || [];
      setMedia((prev) => [...prev, ...selected]);
    }
  }, []);

  const removeMedia = (index) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const computeScheduledTimestamp = () => {
    if (!scheduleEnabled) return null;
    const hours = parseFloat(scheduleOffsetHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      throw new Error('Enter a valid positive number of hours for scheduling.');
    }
    const milliseconds = Date.now() + hours * 60 * 60 * 1000;
    return milliseconds;
  };

  const handleSubmit = async () => {
    if (!postService) {
      Alert.alert('Sign in required', 'Please log in to create a post.');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Empty post', 'Write something before publishing.');
      return;
    }

    setIsSubmitting(true);

    try {
      const scheduledFor = computeScheduledTimestamp();
      const post = {
        content: content.trim(),
        media,
        hashtags,
        visibility,
        groupId: groupId.trim() || null,
        scheduledFor,
      };

      await postService.createPost(post);
      Alert.alert('Success', scheduledFor ? 'Post scheduled successfully.' : 'Post published successfully.');
      navigation.goBack();
    } catch (error) {
      console.error('Create post failed:', error);
      Alert.alert('Error', error.message || 'Unable to create post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.section}>
          <Text style={styles.label}>Share something with the community</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={content}
            onChangeText={setContent}
            placeholder="Tell the community about your farm, share updates, or ask a question..."
          />
          <Text style={styles.charCount}>{content.length}/5000</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Hashtags</Text>
          <View style={styles.inlineRow}>
            <TextInput
              style={styles.input}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="#sustainable"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.addButton} onPress={addHashtag}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagList}>
            {hashtags.map((tag) => (
              <TouchableOpacity key={tag} style={styles.tagChip} onPress={() => removeHashtag(tag)}>
                <Text style={styles.tagChipText}>#{tag} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Visibility</Text>
          <View style={styles.visibilityRow}>
            {VISIBILITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.visibilityOption, visibility === option && styles.visibilityOptionActive]}
                onPress={() => setVisibility(option)}
              >
                <Text
                  style={visibility === option ? styles.visibilityOptionTextActive : styles.visibilityOptionText}
                >
                  {option.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {visibility === 'group' && (
            <TextInput
              style={styles.input}
              value={groupId}
              onChangeText={setGroupId}
              placeholder="Enter group ID"
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Media</Text>
          <TouchableOpacity style={styles.mediaButton} onPress={pickMedia}>
            <Text style={styles.mediaButtonText}>Add Photos or Videos</Text>
          </TouchableOpacity>
          <View style={styles.mediaPreviewContainer}>
            {media.map((file, idx) => (
              <View key={`${file.uri}-${idx}`} style={styles.mediaPreview}>
                <Image source={{ uri: file.uri }} style={styles.mediaThumbnail} />
                <TouchableOpacity style={styles.mediaRemove} onPress={() => removeMedia(idx)}>
                  <Text style={styles.mediaRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.scheduleRow}>
            <Text style={styles.label}>Schedule</Text>
            <Switch
              value={scheduleEnabled}
              onValueChange={setScheduleEnabled}
              trackColor={{ true: COLORS.primaryGreen, false: '#d1d4d6' }}
            />
          </View>
          {scheduleEnabled && (
            <View>
              <Text style={styles.scheduleHint}>Enter hours from now to publish (e.g., 1.5 for ninety minutes).</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={scheduleOffsetHours}
                onChangeText={setScheduleOffsetHours}
                placeholder="Publish in how many hours?"
              />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={isSubmitting}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.pureWhite} />
          ) : (
            <Text style={styles.submitButtonText}>{scheduleEnabled ? 'Schedule' : 'Publish'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F9',
  },
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
  backButtonText: {
    color: COLORS.pureWhite,
    fontSize: 20,
  },
  headerTitle: {
    color: COLORS.pureWhite,
    fontSize: 20,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 140,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    padding: 14,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#37474F',
  },
  charCount: {
    textAlign: 'right',
    color: '#90A4AE',
    marginTop: 6,
    fontSize: 12,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#37474F',
  },
  addButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  addButtonText: {
    color: COLORS.pureWhite,
    fontWeight: '700',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    backgroundColor: '#E0F2F1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagChipText: {
    color: '#00695C',
    fontWeight: '600',
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  visibilityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    alignItems: 'center',
  },
  visibilityOptionActive: {
    backgroundColor: '#E8F5E9',
    borderColor: COLORS.primaryGreen,
  },
  visibilityOptionText: {
    color: '#607D8B',
    fontWeight: '600',
  },
  visibilityOptionTextActive: {
    color: COLORS.primaryGreen,
    fontWeight: '700',
  },
  mediaButton: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  mediaButtonText: {
    color: '#E65100',
    fontWeight: '700',
  },
  mediaPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  mediaPreview: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
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
  mediaRemoveText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleHint: {
    color: '#607D8B',
    marginBottom: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: '#ECEFF1',
    backgroundColor: COLORS.pureWhite,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B0BEC5',
  },
  cancelButtonText: {
    color: '#607D8B',
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primaryGreen,
  },
  submitButtonText: {
    color: COLORS.pureWhite,
    fontWeight: '700',
  },
});

export default CreatePostScreen;
