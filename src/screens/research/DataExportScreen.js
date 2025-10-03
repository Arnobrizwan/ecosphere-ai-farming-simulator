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
import { DataExportService } from '../../services/research/dataExport.service';
import { ResearchDataService } from '../../services/research/researchData.service';
import { auth } from '../../services/firebase.config';

/**
 * UC55 - Export Research Data
 * Select dataset, configure export format, anonymization, preview, download
 */
export default function DataExportScreen({ navigation }) {
  const [datasets, setDatasets] = useState([]);
  const [exportHistory, setExportHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [exportConfig, setExportConfig] = useState({
    format: 'csv',
    subsetFields: [],
    anonymization: {
      enabled: false,
      method: 'hash',
      fields: []
    }
  });

  const [availableFields] = useState([
    'date', 'location', 'temperature', 'rainfall', 'humidity', 'soilMoisture', 'cropYield'
  ]);

  const formats = ['csv', 'json', 'geotiff', 'netcdf'];
  const anonymizationMethods = ['hash', 'remove', 'generalize'];

  useEffect(() => {
    loadDatasets();
    loadExportHistory();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new ResearchDataService(userId, 'researcher');
      const data = await service.browseCatalog();
      // Filter to only show datasets with access
      const accessibleDatasets = data.filter(d => d.hasAccess);
      setDatasets(accessibleDatasets);
    } catch (error) {
      console.error('Error loading datasets:', error);
      Alert.alert('Error', 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const loadExportHistory = async () => {
    try {
      // Mock export history - in real app would fetch from service
      setExportHistory([]);
    } catch (error) {
      console.error('Error loading export history:', error);
    }
  };

  const handleSelectDataset = (dataset) => {
    setSelectedDataset(dataset);
    setExportConfig({
      format: 'csv',
      subsetFields: [],
      anonymization: {
        enabled: false,
        method: 'hash',
        fields: []
      }
    });
    setShowConfigModal(true);
  };

  const toggleSubsetField = (field) => {
    const fields = exportConfig.subsetFields.includes(field)
      ? exportConfig.subsetFields.filter(f => f !== field)
      : [...exportConfig.subsetFields, field];

    setExportConfig({ ...exportConfig, subsetFields: fields });
  };

  const toggleAnonymizationField = (field) => {
    const fields = exportConfig.anonymization.fields.includes(field)
      ? exportConfig.anonymization.fields.filter(f => f !== field)
      : [...exportConfig.anonymization.fields, field];

    setExportConfig({
      ...exportConfig,
      anonymization: { ...exportConfig.anonymization, fields }
    });
  };

  const handlePreview = () => {
    setShowConfigModal(false);
    setShowPreviewModal(true);
  };

  const handleExport = async () => {
    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new DataExportService(userId);

      const config = {
        datasetId: selectedDataset.id,
        format: exportConfig.format,
        subset: exportConfig.subsetFields.length > 0
          ? { fields: exportConfig.subsetFields }
          : {},
        anonymization: exportConfig.anonymization.enabled
          ? exportConfig.anonymization
          : { enabled: false }
      };

      const result = await service.exportDataset(config);

      setShowPreviewModal(false);
      setShowConfigModal(false);

      Alert.alert(
        'Export Ready',
        `Your data export is ready!\n\nFormat: ${exportConfig.format.toUpperCase()}\n\nCitation:\n${result.citation}\n\nREADME:\n${result.readme.substring(0, 150)}...`,
        [
          { text: 'View History', onPress: () => setShowHistoryModal(true) },
          { text: 'Download', onPress: () => console.log('Download:', result.downloadUrl) }
        ]
      );

      setExportHistory([result, ...exportHistory]);
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', error.message || 'Failed to export data');
    }
  };

  const renderDatasetItem = ({ item }) => (
    <TouchableOpacity
      style={styles.datasetCard}
      onPress={() => handleSelectDataset(item)}
    >
      <View style={styles.datasetHeader}>
        <Text style={styles.datasetTitle}>{item.title}</Text>
        <View style={styles.accessBadge}>
          <Text style={styles.accessText}>Access Granted</Text>
        </View>
      </View>

      <Text style={styles.datasetDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.datasetMeta}>
        <Text style={styles.metaText}>Format: {item.format?.toUpperCase()}</Text>
        <Text style={styles.metaText}>Records: {item.recordCount || 0}</Text>
      </View>

      <TouchableOpacity
        style={styles.exportButton}
        onPress={() => handleSelectDataset(item)}
      >
        <Text style={styles.exportButtonText}>Configure Export</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderExportHistoryItem = ({ item }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Dataset: {item.datasetId}</Text>
        <View style={styles.formatBadge}>
          <Text style={styles.formatText}>{item.format?.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.historyDate}>
        Exported: {new Date(item.createdAt).toLocaleString()}
      </Text>

      {item.anonymization?.enabled && (
        <Text style={styles.historyAnon}>
          Anonymized: {item.anonymization.method} ({item.anonymization.fields?.length} fields)
        </Text>
      )}

      <TouchableOpacity
        style={styles.downloadButton}
        onPress={() => console.log('Download:', item.downloadUrl)}
      >
        <Text style={styles.downloadButtonText}>Download</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Data Export</Text>
        <Text style={styles.headerSubtitle}>Export and download research data</Text>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setShowHistoryModal(true)}
        >
          <Text style={styles.historyButtonText}>
            Export History ({exportHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={datasets}
        renderItem={renderDatasetItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={loadDatasets}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No accessible datasets</Text>
            <Text style={styles.emptySubtext}>
              Request access to datasets to enable export
            </Text>
          </View>
        }
      />

      {/* Export Configuration Modal */}
      <Modal visible={showConfigModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Configure Export</Text>
                <TouchableOpacity onPress={() => setShowConfigModal(false)}>
                  <Text style={styles.closeButton}>Close</Text>
                </TouchableOpacity>
              </View>

              {selectedDataset && (
                <>
                  <Text style={styles.datasetName}>{selectedDataset.title}</Text>

                  <View style={styles.configSection}>
                    <Text style={styles.sectionTitle}>Export Format</Text>
                    <View style={styles.formatButtons}>
                      {formats.map((format) => (
                        <TouchableOpacity
                          key={format}
                          style={[
                            styles.formatButton,
                            exportConfig.format === format && styles.formatButtonActive
                          ]}
                          onPress={() => setExportConfig({ ...exportConfig, format })}
                        >
                          <Text style={[
                            styles.formatButtonText,
                            exportConfig.format === format && styles.formatButtonTextActive
                          ]}>
                            {format.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.configSection}>
                    <Text style={styles.sectionTitle}>Subset Fields (Optional)</Text>
                    <Text style={styles.sectionSubtitle}>
                      Select specific fields to export. Leave empty to export all.
                    </Text>
                    <View style={styles.fieldsList}>
                      {availableFields.map((field) => (
                        <TouchableOpacity
                          key={field}
                          style={[
                            styles.fieldChip,
                            exportConfig.subsetFields.includes(field) && styles.fieldChipActive
                          ]}
                          onPress={() => toggleSubsetField(field)}
                        >
                          <Text style={[
                            styles.fieldChipText,
                            exportConfig.subsetFields.includes(field) && styles.fieldChipTextActive
                          ]}>
                            {field}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.configSection}>
                    <View style={styles.anonymizationHeader}>
                      <Text style={styles.sectionTitle}>Anonymization</Text>
                      <TouchableOpacity
                        style={[
                          styles.toggleButton,
                          exportConfig.anonymization.enabled && styles.toggleButtonActive
                        ]}
                        onPress={() => setExportConfig({
                          ...exportConfig,
                          anonymization: {
                            ...exportConfig.anonymization,
                            enabled: !exportConfig.anonymization.enabled
                          }
                        })}
                      >
                        <Text style={[
                          styles.toggleButtonText,
                          exportConfig.anonymization.enabled && styles.toggleButtonTextActive
                        ]}>
                          {exportConfig.anonymization.enabled ? 'Enabled' : 'Disabled'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {exportConfig.anonymization.enabled && (
                      <>
                        <Text style={styles.label}>Method</Text>
                        <View style={styles.methodButtons}>
                          {anonymizationMethods.map((method) => (
                            <TouchableOpacity
                              key={method}
                              style={[
                                styles.methodButton,
                                exportConfig.anonymization.method === method && styles.methodButtonActive
                              ]}
                              onPress={() => setExportConfig({
                                ...exportConfig,
                                anonymization: {
                                  ...exportConfig.anonymization,
                                  method
                                }
                              })}
                            >
                              <Text style={[
                                styles.methodButtonText,
                                exportConfig.anonymization.method === method && styles.methodButtonTextActive
                              ]}>
                                {method.charAt(0).toUpperCase() + method.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <Text style={styles.label}>Fields to Anonymize</Text>
                        <View style={styles.fieldsList}>
                          {availableFields.map((field) => (
                            <TouchableOpacity
                              key={field}
                              style={[
                                styles.fieldChip,
                                exportConfig.anonymization.fields.includes(field) && styles.fieldChipActive
                              ]}
                              onPress={() => toggleAnonymizationField(field)}
                            >
                              <Text style={[
                                styles.fieldChipText,
                                exportConfig.anonymization.fields.includes(field) && styles.fieldChipTextActive
                              ]}>
                                {field}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}
                  </View>

                  <View style={styles.configActions}>
                    <TouchableOpacity
                      style={styles.previewButton}
                      onPress={handlePreview}
                    >
                      <Text style={styles.previewButtonText}>Preview Configuration</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.exportActionButton}
                      onPress={handleExport}
                    >
                      <Text style={styles.exportActionButtonText}>Export Now</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={showPreviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.previewModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Export Preview</Text>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.previewContent}>
              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>Dataset:</Text>
                <Text style={styles.previewValue}>{selectedDataset?.title}</Text>
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>Format:</Text>
                <Text style={styles.previewValue}>{exportConfig.format.toUpperCase()}</Text>
              </View>

              {exportConfig.subsetFields.length > 0 && (
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Subset Fields:</Text>
                  <Text style={styles.previewValue}>
                    {exportConfig.subsetFields.join(', ')}
                  </Text>
                </View>
              )}

              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>Anonymization:</Text>
                <Text style={styles.previewValue}>
                  {exportConfig.anonymization.enabled
                    ? `Enabled (${exportConfig.anonymization.method})`
                    : 'Disabled'}
                </Text>
              </View>

              {exportConfig.anonymization.enabled && exportConfig.anonymization.fields.length > 0 && (
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Anonymized Fields:</Text>
                  <Text style={styles.previewValue}>
                    {exportConfig.anonymization.fields.join(', ')}
                  </Text>
                </View>
              )}

              <View style={styles.previewWarning}>
                <Text style={styles.warningText}>
                  This configuration will be used to export your data.
                  Please review carefully before proceeding.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setShowPreviewModal(false);
                  setShowConfigModal(true);
                }}
              >
                <Text style={styles.backButtonText}>Back to Config</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmExportButton}
                onPress={handleExport}
              >
                <Text style={styles.confirmExportButtonText}>Confirm Export</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export History Modal */}
      <Modal visible={showHistoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.historyModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Export History</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={exportHistory}
              renderItem={renderExportHistoryItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.historyList}
              ListEmptyComponent={
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyHistoryText}>No exports yet</Text>
                </View>
              }
            />
          </View>
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
  historyButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  historyButtonText: {
    color: 'white',
    fontSize: 14,
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
    flex: 1,
    marginRight: 10
  },
  accessBadge: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  accessText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold'
  },
  datasetDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
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
  exportButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
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
    color: '#bbb',
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalScroll: {
    flex: 1,
    width: '100%'
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: 'bold'
  },
  datasetName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  configSection: {
    marginBottom: 25
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 10
  },
  formatButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  formatButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
    marginBottom: 10
  },
  formatButtonActive: {
    backgroundColor: '#2e7d32'
  },
  formatButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600'
  },
  formatButtonTextActive: {
    color: 'white'
  },
  fieldsList: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  fieldChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  fieldChipActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1976d2'
  },
  fieldChipText: {
    fontSize: 13,
    color: '#666'
  },
  fieldChipTextActive: {
    color: '#1976d2',
    fontWeight: 'bold'
  },
  anonymizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5'
  },
  toggleButtonActive: {
    backgroundColor: '#ff9800'
  },
  toggleButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600'
  },
  toggleButtonTextActive: {
    color: 'white'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10
  },
  methodButtons: {
    flexDirection: 'row',
    marginBottom: 15
  },
  methodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 4,
    alignItems: 'center'
  },
  methodButtonActive: {
    backgroundColor: '#ff9800'
  },
  methodButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600'
  },
  methodButtonTextActive: {
    color: 'white'
  },
  configActions: {
    marginTop: 20
  },
  previewButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10
  },
  previewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  exportActionButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  exportActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  previewModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    maxHeight: '80%',
    width: '90%'
  },
  previewContent: {
    marginVertical: 15
  },
  previewSection: {
    marginBottom: 15
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  previewValue: {
    fontSize: 14,
    color: '#666'
  },
  previewWarning: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginTop: 10
  },
  warningText: {
    fontSize: 13,
    color: '#856404'
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15
  },
  backButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10
  },
  backButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600'
  },
  confirmExportButton: {
    flex: 1,
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  confirmExportButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold'
  },
  historyModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    maxHeight: '80%',
    width: '90%'
  },
  historyList: {
    paddingVertical: 10
  },
  historyCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  formatBadge: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  formatText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold'
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4
  },
  historyAnon: {
    fontSize: 12,
    color: '#ff9800',
    marginBottom: 10
  },
  downloadButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold'
  },
  emptyHistory: {
    padding: 40,
    alignItems: 'center'
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#999'
  }
});
