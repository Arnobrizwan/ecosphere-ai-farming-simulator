import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert
} from 'react-native';
import { ResearchDataService } from '../../services/research/researchData.service';
import { auth } from '../../services/firebase.config';

/**
 * UC50 - Access Research Data
 * Browse catalog, request/load dataset, preview/download
 */
export default function ResearchDataScreen({ navigation }) {
  const [datasets, setDatasets] = useState([]);
  const [filteredDatasets, setFilteredDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const categories = ['all', 'climate', 'soil', 'crop', 'water', 'satellite'];

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    filterDatasets();
  }, [searchTerm, selectedCategory, datasets]);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new ResearchDataService(userId, 'researcher');
      const data = await service.browseCatalog();
      setDatasets(data);
    } catch (error) {
      console.error('Error loading datasets:', error);
      Alert.alert('Error', 'Failed to load research datasets');
    } finally {
      setLoading(false);
    }
  };

  const filterDatasets = () => {
    let filtered = datasets;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(ds => ds.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ds =>
        ds.title?.toLowerCase().includes(term) ||
        ds.description?.toLowerCase().includes(term)
      );
    }

    setFilteredDatasets(filtered);
  };

  const handleDatasetSelect = (dataset) => {
    setSelectedDataset(dataset);
  };

  const handlePreview = async (dataset) => {
    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new ResearchDataService(userId, 'researcher');
      const preview = await service.previewDataset(dataset.id);
      setPreviewData(preview);
      setShowPreview(true);
    } catch (error) {
      console.error('Error previewing dataset:', error);
      Alert.alert('Error', error.message || 'Failed to preview dataset');
    }
  };

  const handleDownload = async (dataset) => {
    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new ResearchDataService(userId, 'researcher');
      const result = await service.downloadDataset(dataset.id);

      Alert.alert(
        'Download Ready',
        `Dataset ready for download.\n\nCitation:\n${result.citation}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Download', onPress: () => console.log('Download:', result.downloadUrl) }
        ]
      );
    } catch (error) {
      console.error('Error downloading dataset:', error);
      Alert.alert('Error', error.message || 'Failed to download dataset');
    }
  };

  const handleRequestAccess = async (dataset) => {
    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new ResearchDataService(userId, 'researcher');
      const result = await service.requestAccess(dataset.id);

      if (result.granted) {
        Alert.alert('Success', 'Access granted immediately');
        loadDatasets();
      } else {
        Alert.alert('Request Submitted', 'Your access request has been submitted for approval');
      }
    } catch (error) {
      console.error('Error requesting access:', error);
      Alert.alert('Error', 'Failed to request access');
    }
  };

  const renderDatasetItem = ({ item }) => (
    <TouchableOpacity
      style={styles.datasetCard}
      onPress={() => handleDatasetSelect(item)}
    >
      <View style={styles.datasetHeader}>
        <Text style={styles.datasetTitle}>{item.title || 'Untitled Dataset'}</Text>
        <View style={[styles.badge, item.hasAccess ? styles.accessGranted : styles.accessDenied]}>
          <Text style={styles.badgeText}>
            {item.hasAccess ? 'Access' : item.requiresRequest ? 'Request' : 'Locked'}
          </Text>
        </View>
      </View>

      <Text style={styles.datasetDescription} numberOfLines={2}>
        {item.description || 'No description available'}
      </Text>

      <View style={styles.datasetMeta}>
        <Text style={styles.metaText}>Format: {item.format?.toUpperCase() || 'N/A'}</Text>
        <Text style={styles.metaText}>Records: {item.recordCount || 0}</Text>
        <Text style={styles.metaText}>Downloads: {item.downloads || 0}</Text>
      </View>

      <View style={styles.datasetTags}>
        {item.tags?.map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.datasetActions}>
        {item.hasAccess ? (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePreview(item)}
            >
              <Text style={styles.actionButtonText}>Preview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => handleDownload(item)}
            >
              <Text style={[styles.actionButtonText, styles.primaryButtonText]}>Download</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.requestButton]}
            onPress={() => handleRequestAccess(item)}
          >
            <Text style={styles.actionButtonText}>Request Access</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Research Data</Text>
        <Text style={styles.headerSubtitle}>Access curated research datasets</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search datasets..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === category && styles.categoryChipTextActive
            ]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredDatasets}
        renderItem={renderDatasetItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={loadDatasets}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No datasets found</Text>
          </View>
        }
      />

      <Modal
        visible={showPreview}
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dataset Preview</Text>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {previewData && (
              <View>
                <Text style={styles.previewLabel}>Record Count: {previewData.preview?.recordCount}</Text>
                <Text style={styles.previewLabel}>Fields:</Text>
                {previewData.preview?.fields?.map((field, index) => (
                  <Text key={index} style={styles.previewField}>• {field}</Text>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#2e7d32',
    padding: 20,
    paddingTop: 60
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white'
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4
  },
  searchContainer: {
    padding: 15,
    backgroundColor: 'white'
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  categoriesContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingBottom: 15
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8
  },
  categoryChipActive: {
    backgroundColor: '#2e7d32'
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666'
  },
  categoryChipTextActive: {
    color: 'white',
    fontWeight: 'bold'
  },
  listContainer: {
    padding: 15
  },
  datasetCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  datasetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  datasetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8
  },
  accessGranted: {
    backgroundColor: '#4caf50'
  },
  accessDenied: {
    backgroundColor: '#ff9800'
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  datasetDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  datasetMeta: {
    flexDirection: 'row',
    marginBottom: 12
  },
  metaText: {
    fontSize: 12,
    color: '#999',
    marginRight: 15
  },
  datasetTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12
  },
  tag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6
  },
  tagText: {
    fontSize: 12,
    color: '#1976d2'
  },
  datasetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    marginLeft: 8
  },
  primaryButton: {
    backgroundColor: '#2e7d32'
  },
  requestButton: {
    backgroundColor: '#ff9800'
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600'
  },
  primaryButtonText: {
    color: 'white'
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#999'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#2e7d32'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white'
  },
  closeButton: {
    fontSize: 16,
    color: 'white'
  },
  modalContent: {
    flex: 1,
    padding: 20
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12
  },
  previewField: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    marginBottom: 4
  }
});
