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
import { AcademicResourcesService } from '../../services/research/academicResources.service';
import { auth } from '../../services/firebase.config';

/**
 * UC53 - Access Academic Resources
 * Browse resources, enroll in courses, track progress, bookmark
 */
export default function AcademicResourcesScreen({ navigation }) {
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedResource, setSelectedResource] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [learningPaths, setLearningPaths] = useState({});
  const [showLearningPathModal, setShowLearningPathModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const types = ['all', 'reading', 'standard', 'course'];
  const categories = ['all', 'climate', 'soil', 'crop', 'water', 'sustainability'];
  const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [searchTerm, selectedType, selectedCategory, selectedDifficulty, resources]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new AcademicResourcesService(userId);
      const data = await service.searchResources();
      setResources(data);
    } catch (error) {
      console.error('Error loading resources:', error);
      Alert.alert('Error', 'Failed to load academic resources');
    } finally {
      setLoading(false);
    }
  };

  const filterResources = () => {
    let filtered = resources;

    if (selectedType !== 'all') {
      filtered = filtered.filter(r => r.type === selectedType);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(r => r.difficulty === selectedDifficulty);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.title?.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term)
      );
    }

    setFilteredResources(filtered);
  };

  const handleEnroll = async (resource) => {
    if (resource.type !== 'course') {
      Alert.alert('Info', 'Only courses can be enrolled in');
      return;
    }

    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new AcademicResourcesService(userId);
      await service.enrollInCourse(resource.id);
      Alert.alert('Success', 'Successfully enrolled in course');
      loadResources();
    } catch (error) {
      console.error('Error enrolling:', error);
      Alert.alert('Error', 'Failed to enroll in course');
    }
  };

  const handleMarkComplete = async (resource) => {
    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new AcademicResourcesService(userId);
      await service.markComplete(resource.id);
      Alert.alert('Success', 'Resource marked as complete');
      loadResources();
    } catch (error) {
      console.error('Error marking complete:', error);
      Alert.alert('Error', 'Failed to mark as complete');
    }
  };

  const handleBookmark = async (resource) => {
    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new AcademicResourcesService(userId);
      await service.bookmarkResource(resource.id);
      Alert.alert('Success', 'Resource bookmarked');
    } catch (error) {
      console.error('Error bookmarking:', error);
      Alert.alert('Error', 'Failed to bookmark resource');
    }
  };

  const handleViewLearningPath = async (topic) => {
    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new AcademicResourcesService(userId);
      const path = await service.getLearningPath(topic);
      setSelectedTopic(topic);
      setLearningPaths({ ...learningPaths, [topic]: path });
      setShowLearningPathModal(true);
    } catch (error) {
      console.error('Error loading learning path:', error);
      Alert.alert('Error', 'Failed to load learning path');
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      reading: '\u{1F4D6}',
      standard: '\u{1F4CB}',
      course: '\u{1F393}'
    };
    return icons[type] || '\u{1F4DA}';
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      beginner: '#4caf50',
      intermediate: '#ff9800',
      advanced: '#f44336'
    };
    return colors[difficulty] || '#999';
  };

  const renderResourceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resourceCard}
      onPress={() => {
        setSelectedResource(item);
        setShowDetailsModal(true);
      }}
    >
      <View style={styles.resourceHeader}>
        <Text style={styles.typeIcon}>{getTypeIcon(item.type)}</Text>
        <View style={styles.resourceHeaderText}>
          <Text style={styles.resourceTitle}>{item.title}</Text>
          <Text style={styles.resourceAuthor}>{item.author || 'Unknown Author'}</Text>
        </View>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
          <Text style={styles.difficultyText}>
            {item.difficulty?.substring(0, 3).toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.resourceDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.resourceMeta}>
        <Text style={styles.metaText}>{item.type}</Text>
        <Text style={styles.metaText}>{item.category}</Text>
        {item.duration && <Text style={styles.metaText}>{item.duration} hours</Text>}
        {item.enrollmentCount && (
          <Text style={styles.metaText}>{item.enrollmentCount} enrolled</Text>
        )}
      </View>

      {item.progress !== undefined && item.progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{item.progress}%</Text>
        </View>
      )}

      <View style={styles.resourceActions}>
        {item.type === 'course' && !item.enrolled && (
          <TouchableOpacity
            style={[styles.actionButton, styles.enrollButton]}
            onPress={() => handleEnroll(item)}
          >
            <Text style={[styles.actionButtonText, styles.enrollButtonText]}>Enroll</Text>
          </TouchableOpacity>
        )}
        {item.enrolled && !item.completed && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleMarkComplete(item)}
          >
            <Text style={styles.actionButtonText}>Mark Complete</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleBookmark(item)}
        >
          <Text style={styles.actionButtonText}>Bookmark</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Academic Resources</Text>
        <Text style={styles.headerSubtitle}>Learn and grow your research skills</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search resources..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Type:</Text>
          {types.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                selectedType === type && styles.filterChipActive
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={[
                styles.filterChipText,
                selectedType === type && styles.filterChipTextActive
              ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Category:</Text>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterChip,
                selectedCategory === category && styles.filterChipActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.filterChipText,
                selectedCategory === category && styles.filterChipTextActive
              ]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Level:</Text>
          {difficulties.map((difficulty) => (
            <TouchableOpacity
              key={difficulty}
              style={[
                styles.filterChip,
                selectedDifficulty === difficulty && styles.filterChipActive
              ]}
              onPress={() => setSelectedDifficulty(difficulty)}
            >
              <Text style={[
                styles.filterChipText,
                selectedDifficulty === difficulty && styles.filterChipTextActive
              ]}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.learningPathButton}>
        <TouchableOpacity
          style={styles.pathButton}
          onPress={() => handleViewLearningPath(selectedCategory !== 'all' ? selectedCategory : 'climate')}
        >
          <Text style={styles.pathButtonText}>View Learning Path</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredResources}
        renderItem={renderResourceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={loadResources}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No resources found</Text>
          </View>
        }
      />

      {/* Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.detailsHeader}>
                <Text style={styles.modalTitle}>Resource Details</Text>
                <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                  <Text style={styles.closeButton}>Close</Text>
                </TouchableOpacity>
              </View>

              {selectedResource && (
                <>
                  <View style={styles.resourceDetailHeader}>
                    <Text style={styles.detailTypeIcon}>{getTypeIcon(selectedResource.type)}</Text>
                    <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(selectedResource.difficulty) }]}>
                      <Text style={styles.difficultyText}>
                        {selectedResource.difficulty?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.detailTitle}>{selectedResource.title}</Text>
                  <Text style={styles.detailAuthor}>by {selectedResource.author || 'Unknown'}</Text>

                  <Text style={styles.detailDescription}>{selectedResource.description}</Text>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Information</Text>
                    <Text style={styles.detailText}>Type: {selectedResource.type}</Text>
                    <Text style={styles.detailText}>Category: {selectedResource.category}</Text>
                    <Text style={styles.detailText}>Difficulty: {selectedResource.difficulty}</Text>
                    {selectedResource.duration && (
                      <Text style={styles.detailText}>Duration: {selectedResource.duration} hours</Text>
                    )}
                    {selectedResource.enrollmentCount && (
                      <Text style={styles.detailText}>Enrolled: {selectedResource.enrollmentCount}</Text>
                    )}
                  </View>

                  {selectedResource.url && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Access</Text>
                      <Text style={styles.detailText}>{selectedResource.url}</Text>
                    </View>
                  )}

                  <View style={styles.modalActions}>
                    {selectedResource.type === 'course' && !selectedResource.enrolled && (
                      <TouchableOpacity
                        style={[styles.modalActionButton, styles.enrollButton]}
                        onPress={() => {
                          handleEnroll(selectedResource);
                          setShowDetailsModal(false);
                        }}
                      >
                        <Text style={[styles.modalActionButtonText, styles.enrollButtonText]}>
                          Enroll in Course
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.modalActionButton}
                      onPress={() => {
                        handleBookmark(selectedResource);
                        setShowDetailsModal(false);
                      }}
                    >
                      <Text style={styles.modalActionButtonText}>Bookmark</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Learning Path Modal */}
      <Modal visible={showLearningPathModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.detailsHeader}>
                <Text style={styles.modalTitle}>Learning Path: {selectedTopic}</Text>
                <TouchableOpacity onPress={() => setShowLearningPathModal(false)}>
                  <Text style={styles.closeButton}>Close</Text>
                </TouchableOpacity>
              </View>

              {selectedTopic && learningPaths[selectedTopic] && (
                <>
                  <Text style={styles.pathInfo}>
                    {learningPaths[selectedTopic].resources?.length || 0} resources
                  </Text>
                  <Text style={styles.pathInfo}>
                    Estimated duration: {learningPaths[selectedTopic].estimatedDuration || 0} hours
                  </Text>

                  <View style={styles.pathResourcesList}>
                    {learningPaths[selectedTopic].resources?.map((resource, index) => (
                      <View key={resource.id} style={styles.pathResourceItem}>
                        <View style={styles.pathNumber}>
                          <Text style={styles.pathNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.pathResourceContent}>
                          <Text style={styles.pathResourceTitle}>{resource.title}</Text>
                          <Text style={styles.pathResourceMeta}>
                            {resource.difficulty} • {resource.duration} hours
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
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
  filtersContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 8
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 6
  },
  filterChipActive: {
    backgroundColor: '#2e7d32'
  },
  filterChipText: {
    fontSize: 12,
    color: '#666'
  },
  filterChipTextActive: {
    color: 'white',
    fontWeight: 'bold'
  },
  learningPathButton: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  pathButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center'
  },
  pathButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  listContainer: {
    padding: 15
  },
  resourceCard: {
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
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 10
  },
  resourceHeaderText: {
    flex: 1
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2
  },
  resourceAuthor: {
    fontSize: 13,
    color: '#999'
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8
  },
  difficultyText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  resourceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20
  },
  resourceMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10
  },
  metaText: {
    fontSize: 12,
    color: '#999',
    marginRight: 12,
    marginBottom: 4
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 10
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 3
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    minWidth: 35
  },
  resourceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    marginLeft: 8
  },
  enrollButton: {
    backgroundColor: '#2e7d32'
  },
  actionButtonText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600'
  },
  enrollButtonText: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalScroll: {
    flex: 1
  },
  modalScrollContent: {
    paddingVertical: 40
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  closeButton: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: 'bold'
  },
  resourceDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  detailTypeIcon: {
    fontSize: 48
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6
  },
  detailAuthor: {
    fontSize: 14,
    color: '#999',
    marginBottom: 15
  },
  detailDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20
  },
  detailSection: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6
  },
  modalActions: {
    marginTop: 10
  },
  modalActionButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center'
  },
  modalActionButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600'
  },
  pathInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  pathResourcesList: {
    marginTop: 20
  },
  pathResourceItem: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start'
  },
  pathNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  pathNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  pathResourceContent: {
    flex: 1
  },
  pathResourceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  pathResourceMeta: {
    fontSize: 13,
    color: '#999'
  }
});
