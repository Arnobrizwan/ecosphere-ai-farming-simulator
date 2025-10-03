import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { auth } from '../../services/firebase.config';
import { KnowledgeService } from '../../services/community/knowledge.service';

const RESOURCE_TYPES = [
  { id: 'guide', label: 'Guide' },
  { id: 'how-to', label: 'How-To' },
  { id: 'dataset', label: 'Dataset' },
  { id: 'research', label: 'Research' },
];

const DIFFICULTIES = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'bn', label: 'বাংলা' },
  { id: 'hi', label: 'हिंदी' },
  { id: 'es', label: 'Español' },
];

const ShareKnowledgeScreen = ({ navigation }) => {
  const user = auth.currentUser;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('guide');
  const [category, setCategory] = useState('best_practices');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [language, setLanguage] = useState('en');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const knowledgeService = useMemo(() => {
    if (!user?.uid) return null;
    return new KnowledgeService(user.uid);
  }, [user?.uid]);

  const addTag = () => {
    const raw = tagInput.trim().replace(/^#/, '');
    if (!raw) return;
    const normalized = raw.toLowerCase();
    if (!tags.includes(normalized)) {
      setTags(prev => [...prev, normalized]);
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    setTags(prev => prev.filter(item => item !== tag));
  };

  const addFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: '*/*',
    });

    if (!result.canceled) {
      const selected = result.assets?.map(asset => ({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
      })) || [];
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const addImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Media access is needed to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      selectionLimit: 3,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selected = result.assets?.map(asset => ({
        uri: asset.uri,
        name: asset.fileName || asset.uri.split('/').pop(),
        type: asset.type || 'image/jpeg',
        size: asset.fileSize || 0,
        preview: asset.uri,
      })) || [];
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!knowledgeService) {
      Alert.alert('Sign in required', 'Please sign in to share knowledge.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your resource a title.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing description', 'Add a summary so others know what to expect.');
      return;
    }

    if (files.length === 0) {
      Alert.alert('No content', 'Attach at least one file or image.');
      return;
    }

    setIsSubmitting(true);

    try {
      await knowledgeService.uploadResource({
        title: title.trim(),
        description: description.trim(),
        type,
        category: category.trim() || 'general',
        tags,
        difficulty,
        language,
        files,
      });

      Alert.alert('Shared!', 'Your resource is now available to the community.');
      navigation.goBack();
    } catch (error) {
      console.error('Knowledge upload failed:', error);
      Alert.alert('Error', error.message || 'Unable to share resource.');
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
        <Text style={styles.headerTitle}>Share Knowledge</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.section}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Soil Moisture Monitoring Checklist"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Summary</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Explain what farmers will learn from this resource..."
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.optionRow}>
            {RESOURCE_TYPES.map(({ id, label }) => (
              <TouchableOpacity
                key={id}
                style={[styles.optionButton, type === id && styles.optionButtonActive]}
                onPress={() => setType(id)}
              >
                <Text style={type === id ? styles.optionTextActive : styles.optionText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="e.g., irrigation, climate, soil_health"
          />
        </View>

        <View style={styles.doubleRow}>
          <View style={[styles.section, styles.half]}>
            <Text style={styles.label}>Difficulty</Text>
            <View style={styles.optionRow}>
              {DIFFICULTIES.map(({ id, label }) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.smallOption, difficulty === id && styles.optionButtonActive]}
                  onPress={() => setDifficulty(id)}
                >
                  <Text style={difficulty === id ? styles.optionTextActive : styles.optionText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={[styles.section, styles.half]}>
            <Text style={styles.label}>Language</Text>
            <View style={styles.optionRow}>
              {LANGUAGES.map(({ id, label }) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.smallOption, language === id && styles.optionButtonActive]}
                  onPress={() => setLanguage(id)}
                >
                  <Text style={language === id ? styles.optionTextActive : styles.optionText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.inlineRow}>
            <TextInput
              style={styles.input}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="#satellite"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.addButton} onPress={addTag}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagList}>
            {tags.map(tag => (
              <TouchableOpacity key={tag} style={styles.tagChip} onPress={() => removeTag(tag)}>
                <Text style={styles.tagChipText}>#{tag} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Attachments</Text>
          <View style={styles.attachmentButtons}>
            <TouchableOpacity style={styles.attachButton} onPress={addFile}>
              <Text style={styles.attachButtonText}>Upload File</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachButton} onPress={addImage}>
              <Text style={styles.attachButtonText}>Add Image</Text>
            </TouchableOpacity>
          </View>

          {files.length === 0 ? (
            <Text style={styles.placeholderText}>Attach PDFs, spreadsheets, images, or datasets (3 max).</Text>
          ) : (
            <View style={styles.fileList}>
              {files.map((file, index) => (
                <View key={`${file.uri}-${index}`} style={styles.fileRow}>
                  {file.preview ? <Image source={{ uri: file.preview }} style={styles.filePreview} /> : <Text style={styles.fileIcon}>📄</Text>}
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName}>{file.name}</Text>
                    <Text style={styles.fileMeta}>{Math.round((file.size || 0) / 1024)} KB • {file.type}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeFile(index)}>
                    <Text style={styles.removeFile}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={isSubmitting}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={COLORS.pureWhite} /> : <Text style={styles.submitText}>Publish</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FA' },
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
  backButtonText: { color: COLORS.pureWhite, fontSize: 20 },
  headerTitle: { color: COLORS.pureWhite, fontSize: 20, fontWeight: '700' },
  scrollArea: { paddingHorizontal: 20 },
  section: { marginTop: 18 },
  label: { fontWeight: '700', color: '#253238', marginBottom: 8 },
  input: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#37474F',
  },
  textArea: {
    minHeight: 120,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 14,
    textAlignVertical: 'top',
    color: '#37474F',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.pureWhite,
  },
  optionButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: COLORS.primaryGreen,
  },
  optionText: { color: '#607D8B', fontWeight: '600' },
  optionTextActive: { color: COLORS.primaryGreen, fontWeight: '700' },
  doubleRow: { flexDirection: 'row', gap: 16 },
  half: { flex: 1 },
  smallOption: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.pureWhite,
  },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addButton: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  addButtonText: { color: COLORS.pureWhite, fontWeight: '700' },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tagChip: {
    backgroundColor: '#E0F2F1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagChipText: { color: '#00695C', fontWeight: '600' },
  attachmentButtons: { flexDirection: 'row', gap: 12 },
  attachButton: {
    flex: 1,
    backgroundColor: '#FFF8E1',
    borderColor: '#FFECB3',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  attachButtonText: { color: '#EF6C00', fontWeight: '700' },
  placeholderText: { color: '#90A4AE', marginTop: 10 },
  fileList: { marginTop: 12, gap: 12 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    padding: 12,
    gap: 12,
  },
  fileIcon: { fontSize: 20 },
  fileDetails: { flex: 1 },
  fileName: { fontWeight: '600', color: '#37474F' },
  fileMeta: { color: '#90A4AE', fontSize: 12 },
  filePreview: { width: 46, height: 46, borderRadius: 10 },
  removeFile: { color: '#D32F2F', fontWeight: '600' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: COLORS.pureWhite,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B0BEC5',
  },
  cancelText: { color: '#607D8B', fontWeight: '600' },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primaryGreen,
  },
  submitText: { color: COLORS.pureWhite, fontWeight: '700' },
});

export default ShareKnowledgeScreen;
