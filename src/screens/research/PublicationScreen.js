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
import { PublicationService } from '../../services/research/publication.service';
import { auth } from '../../services/firebase.config';

/**
 * UC52 - Publish Research Findings
 * Submit publications, track status, view reviews, publish with DOI
 */
export default function PublicationScreen({ navigation }) {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [newPublication, setNewPublication] = useState({
    title: '',
    abstract: '',
    authors: '',
    manuscript: '',
    keywords: '',
    category: 'research_article'
  });

  useEffect(() => {
    loadPublications();
  }, []);

  const loadPublications = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new PublicationService(userId);
      const data = await service.getUserPublications();
      setPublications(data);
    } catch (error) {
      console.error('Error loading publications:', error);
      Alert.alert('Error', 'Failed to load publications');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newPublication.title || !newPublication.abstract) {
      Alert.alert('Error', 'Please fill in title and abstract');
      return;
    }

    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new PublicationService(userId);

      const publicationData = {
        ...newPublication,
        authors: newPublication.authors.split(',').map(a => ({ name: a.trim() })),
        keywords: newPublication.keywords.split(',').map(k => k.trim())
      };

      await service.submitPublication(publicationData);
      setShowCreateModal(false);
      setNewPublication({
        title: '',
        abstract: '',
        authors: '',
        manuscript: '',
        keywords: '',
        category: 'research_article'
      });
      loadPublications();
      Alert.alert('Success', 'Publication submitted for review');
    } catch (error) {
      console.error('Error submitting publication:', error);
      Alert.alert('Error', 'Failed to submit publication');
    }
  };

  const handlePublish = async (publication) => {
    if (publication.status !== 'approved') {
      Alert.alert('Error', 'Publication must be approved before publishing');
      return;
    }

    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new PublicationService(userId);
      const result = await service.publish(publication.id);

      Alert.alert(
        'Published Successfully',
        `DOI: ${result.doi}\n\nCitation:\n${result.citation}`,
        [{ text: 'OK', onPress: loadPublications }]
      );
    } catch (error) {
      console.error('Error publishing:', error);
      Alert.alert('Error', 'Failed to publish');
    }
  };

  const handleViewDetails = (publication) => {
    setSelectedPublication(publication);
    setShowDetailsModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      submitted: '#ff9800',
      under_review: '#2196f3',
      approved: '#4caf50',
      published: '#2e7d32'
    };
    return colors[status] || '#999';
  };

  const renderPublicationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.publicationCard}
      onPress={() => handleViewDetails(item)}
    >
      <View style={styles.publicationHeader}>
        <Text style={styles.publicationTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.publicationAbstract} numberOfLines={3}>
        {item.abstract}
      </Text>

      <View style={styles.publicationMeta}>
        <Text style={styles.metaText}>
          Authors: {item.authors?.map(a => a.name).join(', ')}
        </Text>
        <Text style={styles.metaText}>
          Category: {item.category?.replace('_', ' ')}
        </Text>
        {item.doi && (
          <Text style={styles.metaText}>DOI: {item.doi}</Text>
        )}
      </View>

      <View style={styles.publicationStats}>
        <Text style={styles.statText}>Reviews: {item.reviews?.length || 0}</Text>
        {item.publishedAt && (
          <>
            <Text style={styles.statText}>Views: {item.views || 0}</Text>
            <Text style={styles.statText}>Downloads: {item.downloads || 0}</Text>
          </>
        )}
      </View>

      <View style={styles.publicationActions}>
        {item.status === 'approved' && !item.publishedAt && (
          <TouchableOpacity
            style={[styles.actionButton, styles.publishButton]}
            onPress={() => handlePublish(item)}
          >
            <Text style={[styles.actionButtonText, styles.publishButtonText]}>
              Publish Now
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleViewDetails(item)}
        >
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Publications</Text>
        <Text style={styles.headerSubtitle}>Publish and track research findings</Text>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ Submit Publication</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={publications}
        renderItem={renderPublicationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={loadPublications}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No publications yet</Text>
            <Text style={styles.emptySubtext}>Submit your first research publication</Text>
          </View>
        }
      />

      {/* Create Publication Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Submit Publication</Text>

              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Publication title"
                value={newPublication.title}
                onChangeText={(text) => setNewPublication({ ...newPublication, title: text })}
              />

              <Text style={styles.label}>Abstract *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Abstract"
                value={newPublication.abstract}
                onChangeText={(text) => setNewPublication({ ...newPublication, abstract: text })}
                multiline
              />

              <Text style={styles.label}>Authors (comma-separated) *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe, Jane Smith"
                value={newPublication.authors}
                onChangeText={(text) => setNewPublication({ ...newPublication, authors: text })}
              />

              <Text style={styles.label}>Manuscript</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Full manuscript text or link"
                value={newPublication.manuscript}
                onChangeText={(text) => setNewPublication({ ...newPublication, manuscript: text })}
                multiline
              />

              <Text style={styles.label}>Keywords (comma-separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="climate, soil, agriculture"
                value={newPublication.keywords}
                onChangeText={(text) => setNewPublication({ ...newPublication, keywords: text })}
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryButtons}>
                {['research_article', 'review', 'case_study', 'technical_note'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      newPublication.category === cat && styles.categoryButtonActive
                    ]}
                    onPress={() => setNewPublication({ ...newPublication, category: cat })}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      newPublication.category === cat && styles.categoryButtonTextActive
                    ]}>
                      {cat.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleSubmit}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                    Submit
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.detailsHeader}>
                <Text style={styles.modalTitle}>Publication Details</Text>
                <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                  <Text style={styles.closeButton}>Close</Text>
                </TouchableOpacity>
              </View>

              {selectedPublication && (
                <>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedPublication.status), alignSelf: 'flex-start' }]}>
                    <Text style={styles.statusText}>
                      {selectedPublication.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.detailTitle}>{selectedPublication.title}</Text>
                  <Text style={styles.detailText}>{selectedPublication.abstract}</Text>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Authors</Text>
                    <Text style={styles.detailText}>
                      {selectedPublication.authors?.map(a => a.name).join(', ')}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Keywords</Text>
                    <View style={styles.keywordContainer}>
                      {selectedPublication.keywords?.map((keyword, index) => (
                        <View key={index} style={styles.keyword}>
                          <Text style={styles.keywordText}>{keyword}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {selectedPublication.doi && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>DOI</Text>
                      <Text style={styles.detailText}>{selectedPublication.doi}</Text>
                    </View>
                  )}

                  {selectedPublication.citation && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Citation</Text>
                      <Text style={styles.citationText}>{selectedPublication.citation}</Text>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Reviews ({selectedPublication.reviews?.length || 0})</Text>
                    {selectedPublication.reviews?.length > 0 ? (
                      selectedPublication.reviews.map((review, index) => (
                        <View key={index} style={styles.reviewCard}>
                          <Text style={styles.reviewDecision}>
                            Decision: {review.decision.toUpperCase()}
                          </Text>
                          <Text style={styles.reviewRating}>Rating: {review.rating}/5</Text>
                          <Text style={styles.reviewComments}>{review.comments}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.detailText}>No reviews yet</Text>
                    )}
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
  toolbar: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  createButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  listContainer: {
    padding: 15
  },
  publicationCard: {
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
  publicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  publicationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold'
  },
  publicationAbstract: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
  },
  publicationMeta: {
    marginBottom: 12
  },
  metaText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4
  },
  publicationStats: {
    flexDirection: 'row',
    marginBottom: 12
  },
  statText: {
    fontSize: 12,
    color: '#999',
    marginRight: 15
  },
  publicationActions: {
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
  publishButton: {
    backgroundColor: '#2e7d32'
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600'
  },
  publishButtonText: {
    color: 'white'
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb'
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 10
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8
  },
  categoryButtonActive: {
    backgroundColor: '#2e7d32'
  },
  categoryButtonText: {
    fontSize: 13,
    color: '#666'
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: 'bold'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 10
  },
  modalButtonPrimary: {
    backgroundColor: '#2e7d32'
  },
  modalButtonText: {
    fontSize: 16,
    color: '#666'
  },
  modalButtonTextPrimary: {
    color: 'white',
    fontWeight: 'bold'
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
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  detailSection: {
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  keywordContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  keyword: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8
  },
  keywordText: {
    fontSize: 13,
    color: '#1976d2'
  },
  citationText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 6
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10
  },
  reviewDecision: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  reviewRating: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6
  },
  reviewComments: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic'
  }
});
