import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Dimensions
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase.config';

const { width } = Dimensions.get('window');

export default function FarmConfigScreen({ navigation }) {
  const [userId, setUserId] = useState('');
  const [totalFarmArea, setTotalFarmArea] = useState(0);
  const [plots, setPlots] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlot, setEditingPlot] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Game data from Firestore
  const [cropsDatabase, setCropsDatabase] = useState([]);
  const [soilTypes, setSoilTypes] = useState([]);
  const [waterSources, setWaterSources] = useState([]);
  const [equipment, setEquipment] = useState([]);

  // Modal form state
  const [plotName, setPlotName] = useState('');
  const [plotArea, setPlotArea] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [cropSearchQuery, setCropSearchQuery] = useState('');
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonEnd, setSeasonEnd] = useState('');
  const [soilType, setSoilType] = useState('loamy');
  const [waterSource, setWaterSource] = useState('both');
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  
  useEffect(() => {
    loadUserData();
    loadGameData();
  }, []);

  const loadGameData = async () => {
    setLoading(true);
    try {
      const cropsSnap = await getDoc(doc(db, 'gameData', 'crops'));
      if (cropsSnap.exists()) {
        setCropsDatabase(cropsSnap.data().all);
      }

      const soilTypesSnap = await getDoc(doc(db, 'gameData', 'soilTypes'));
      if (soilTypesSnap.exists()) {
        setSoilTypes(soilTypesSnap.data().all);
      }

      const waterSourcesSnap = await getDoc(doc(db, 'gameData', 'waterSources'));
      if (waterSourcesSnap.exists()) {
        setWaterSources(waterSourcesSnap.data().all);
      }

      const equipmentSnap = await getDoc(doc(db, 'gameData', 'equipment'));
      if (equipmentSnap.exists()) {
        setEquipment(equipmentSnap.data().all);
      }
    } catch (error) {
      console.log('Game data load error:', error);
      Alert.alert('Error', 'Failed to load game data. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    const user = authService.getCurrentUser();
    if (user) {
      setUserId(user.uid);
      await loadFarmData(user.uid);
    }
  };

  const loadFarmData = async (uid) => {
    try {
      // Load total farm area from locations
      const locationsRef = collection(db, 'users', uid, 'locations');
      const locationsSnap = await getDocs(locationsRef);
      
      let totalArea = 0;
      locationsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.area && data.area.value) {
          totalArea += data.area.value;
        }
      });
      setTotalFarmArea(totalArea);

      // Load existing farm config
      const configRef = doc(db, 'users', uid, 'farmConfig', 'main');
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        const data = configSnap.data();
        setPlots(data.plots || []);
      }
    } catch (error) {
      console.log('Load error:', error);
    }
  };

  const getUsedArea = () => {
    return plots.reduce((sum, plot) => sum + parseFloat(plot.area || 0), 0);
  };

  const getRemainingArea = () => {
    return totalFarmArea - getUsedArea();
  };

  const openAddPlotModal = () => {
    resetModalForm();
    setEditingPlot(null);
    setShowModal(true);
  };

  const openEditPlotModal = (plot) => {
    setEditingPlot(plot);
    setPlotName(plot.name);
    setPlotArea(plot.area.toString());
    setSelectedCrop(cropsDatabase.find(c => c.id === plot.crop));
    setSeasonStart(plot.season.start);
    setSeasonEnd(plot.season.end);
    setSoilType(plot.soilType);
    setWaterSource(plot.waterSource);
    setSelectedEquipment(plot.equipment || []);
    setShowModal(true);
  };

  const resetModalForm = () => {
    setPlotName('');
    setPlotArea('');
    setSelectedCrop(null);
    setCropSearchQuery('');
    setSeasonStart('');
    setSeasonEnd('');
    setSoilType('loamy');
    setWaterSource('both');
    setSelectedEquipment([]);
  };

  const validatePlot = () => {
    if (!plotName.trim()) {
      Alert.alert('⚠️ Required', 'Please enter a plot name');
      return false;
    }

    if (!plotArea || parseFloat(plotArea) <= 0) {
      Alert.alert('⚠️ Invalid', 'Please enter a valid plot area');
      return false;
    }

    const area = parseFloat(plotArea);
    const currentUsed = editingPlot ? getUsedArea() - parseFloat(editingPlot.area) : getUsedArea();
    
    if (currentUsed + area > totalFarmArea) {
      Alert.alert(
        '⚠️ Area Exceeded',
        `Plot area exceeds available space. Remaining: ${(totalFarmArea - currentUsed).toFixed(2)} acres`
      );
      return false;
    }

    if (!selectedCrop) {
      Alert.alert('⚠️ Required', 'Please select a crop');
      return false;
    }

    if (!seasonStart || !seasonEnd) {
      Alert.alert('⚠️ Required', 'Please enter planting season dates');
      return false;
    }

    return true;
  };

  const handleSavePlot = () => {
    if (!validatePlot()) return;

    const newPlot = {
      id: editingPlot ? editingPlot.id : Date.now().toString(),
      name: plotName.trim(),
      area: parseFloat(plotArea),
      crop: selectedCrop.id,
      cropName: selectedCrop.name,
      cropIcon: selectedCrop.icon,
      cropColor: selectedCrop.color,
      season: {
        start: seasonStart,
        end: seasonEnd
      },
      soilType,
      waterSource,
      equipment: selectedEquipment,
      createdAt: editingPlot ? editingPlot.createdAt : new Date().toISOString()
    };

    if (editingPlot) {
      // Update existing plot
      setPlots(plots.map(p => p.id === editingPlot.id ? newPlot : p));
    } else {
      // Add new plot
      setPlots([...plots, newPlot]);
    }

    setShowModal(false);
    resetModalForm();
  };

  const handleDeletePlot = (plotId) => {
    Alert.alert(
      '🗑️ Delete Plot',
      'Are you sure you want to delete this plot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPlots(plots.filter(p => p.id !== plotId));
          }
        }
      ]
    );
  };

  const handleSaveConfiguration = async () => {
    if (plots.length === 0) {
      Alert.alert('⚠️ No Plots', 'Please add at least one plot before continuing');
      return;
    }

    setLoading(true);

    try {
      const configRef = doc(db, 'users', userId, 'farmConfig', 'main');
      const configData = {
        plots,
        totalArea: totalFarmArea,
        usedArea: getUsedArea(),
        plotCount: plots.length,
        updatedAt: new Date().toISOString()
      };

      await setDoc(configRef, configData);

      // Update user document
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        hasFarmConfig: true,
        onboardingComplete: true
      }, { merge: true });

      Alert.alert(
        '🎉 Farm Configured!',
        'Your farm setup is complete. Ready to start farming!',
        [
          {
            text: 'Start Farming',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('❌ Error', 'Failed to save configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleEquipment = (equipmentId) => {
    if (selectedEquipment.includes(equipmentId)) {
      setSelectedEquipment(selectedEquipment.filter(id => id !== equipmentId));
    } else {
      setSelectedEquipment([...selectedEquipment, equipmentId]);
    }
  };

  const filteredCrops = cropsDatabase.filter(crop =>
    crop.name.toLowerCase().includes(cropSearchQuery.toLowerCase())
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🌱</Text>
      <Text style={styles.emptyTitle}>Start Your Farm</Text>
      <Text style={styles.emptyText}>
        Add your first plot to begin managing your farm
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={openAddPlotModal}>
        <Text style={styles.emptyButtonText}>+ Add First Plot</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPlotCard = (plot) => (
    <View key={plot.id} style={[styles.plotCard, { borderLeftColor: plot.cropColor }]}>
      <View style={styles.plotHeader}>
        <View style={styles.plotTitleRow}>
          <Text style={styles.plotIcon}>{plot.cropIcon}</Text>
          <View style={styles.plotInfo}>
            <Text style={styles.plotName}>{plot.name}</Text>
            <Text style={styles.plotCrop}>{plot.cropName}</Text>
          </View>
        </View>
        <View style={styles.plotActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditPlotModal(plot)}
          >
            <Text style={styles.actionIcon}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeletePlot(plot.id)}
          >
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.plotDetails}>
        <View style={styles.plotStat}>
          <Text style={styles.plotStatLabel}>Area</Text>
          <Text style={styles.plotStatValue}>{plot.area} acres</Text>
        </View>
        <View style={styles.plotStat}>
          <Text style={styles.plotStatLabel}>Season</Text>
          <Text style={styles.plotStatValue}>
            {plot.season.start} - {plot.season.end}
          </Text>
        </View>
      </View>

      <View style={styles.plotTags}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>
            {soilTypes.find(s => s.id === plot.soilType)?.icon} {plot.soilType}
          </Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>
            {WATER_SOURCES.find(w => w.id === plot.waterSource)?.icon} {plot.waterSource}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚜 Farm Configuration</Text>
        <Text style={styles.headerSubtitle}>Manage your plots and resources</Text>
      </View>

      {/* Farm Overview Card */}
      <View style={styles.overviewCard}>
        <View style={styles.overviewRow}>
          <View style={styles.overviewStat}>
            <Text style={styles.overviewLabel}>Total Area</Text>
            <Text style={styles.overviewValue}>{totalFarmArea.toFixed(2)} acres</Text>
          </View>
          <View style={styles.overviewStat}>
            <Text style={styles.overviewLabel}>Used</Text>
            <Text style={styles.overviewValue}>{getUsedArea().toFixed(2)} acres</Text>
          </View>
          <View style={styles.overviewStat}>
            <Text style={styles.overviewLabel}>Plots</Text>
            <Text style={styles.overviewValue}>{plots.length}</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(getUsedArea() / totalFarmArea) * 100}%` }
            ]}
          />
        </View>
        <Text style={styles.remainingText}>
          {getRemainingArea().toFixed(2)} acres remaining
        </Text>
      </View>

      {/* Plots List */}
      <ScrollView style={styles.plotsList} showsVerticalScrollIndicator={false}>
        {plots.length === 0 ? renderEmptyState() : plots.map(renderPlotCard)}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Add Button */}
      {plots.length > 0 && (
        <TouchableOpacity style={styles.floatingButton} onPress={openAddPlotModal}>
          <Text style={styles.floatingButtonText}>+ Add Plot</Text>
        </TouchableOpacity>
      )}

      {/* Save Configuration Button */}
      {plots.length > 0 && (
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSaveConfiguration}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? '⏳ Saving...' : '✓ Complete Setup'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Add/Edit Plot Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingPlot ? '✏️ Edit Plot' : '➕ Add New Plot'}
              </Text>

              {/* Plot Name */}
              <Text style={styles.inputLabel}>Plot Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., North Field, Plot 1"
                value={plotName}
                onChangeText={setPlotName}
              />

              {/* Plot Area */}
              <Text style={styles.inputLabel}>Area (acres) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter area in acres"
                value={plotArea}
                onChangeText={setPlotArea}
                keyboardType="decimal-pad"
              />
              <Text style={styles.helperText}>
                Available: {getRemainingArea().toFixed(2)} acres
              </Text>

              {/* Crop Selection */}
              <Text style={styles.inputLabel}>Select Crop *</Text>
              <TextInput
                style={styles.input}
                placeholder="Search crops..."
                value={cropSearchQuery}
                onChangeText={setCropSearchQuery}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cropList}>
                {filteredCrops.map((crop) => (
                  <TouchableOpacity
                    key={crop.id}
                    style={[
                      styles.cropCard,
                      selectedCrop?.id === crop.id && styles.cropCardSelected,
                      { borderColor: crop.color }
                    ]}
                    onPress={() => {
                      setSelectedCrop(crop);
                      setCropSearchQuery('');
                    }}
                  >
                    <Text style={styles.cropIcon}>{crop.icon}</Text>
                    <Text style={styles.cropName}>{crop.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Season Dates */}
              <Text style={styles.inputLabel}>Planting Season *</Text>
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  placeholder="Start (MM/YYYY)"
                  value={seasonStart}
                  onChangeText={setSeasonStart}
                />
                <Text style={styles.dateSeparator}>to</Text>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  placeholder="End (MM/YYYY)"
                  value={seasonEnd}
                  onChangeText={setSeasonEnd}
                />
              </View>

              {/* Soil Type */}
              <Text style={styles.inputLabel}>Soil Type</Text>
              <View style={styles.optionGrid}>
                {soilTypes.map((soil) => (
                  <TouchableOpacity
                    key={soil.id}
                    style={[
                      styles.optionCard,
                      soilType === soil.id && styles.optionCardSelected
                    ]}
                    onPress={() => setSoilType(soil.id)}
                  >
                    <Text style={styles.optionIcon}>{soil.icon}</Text>
                    <Text style={styles.optionLabel}>{soil.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Water Source */}
              <Text style={styles.inputLabel}>Water Source</Text>
              <View style={styles.optionGrid}>
                {WATER_SOURCES.map((water) => (
                  <TouchableOpacity
                    key={water.id}
                    style={[
                      styles.optionCard,
                      waterSource === water.id && styles.optionCardSelected
                    ]}
                    onPress={() => setWaterSource(water.id)}
                  >
                    <Text style={styles.optionIcon}>{water.icon}</Text>
                    <Text style={styles.optionLabel}>{water.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Equipment */}
              <Text style={styles.inputLabel}>Available Equipment</Text>
              <View style={styles.equipmentGrid}>
                {EQUIPMENT.map((equip) => (
                  <TouchableOpacity
                    key={equip.id}
                    style={[
                      styles.equipmentCard,
                      selectedEquipment.includes(equip.id) && styles.equipmentCardSelected
                    ]}
                    onPress={() => toggleEquipment(equip.id)}
                  >
                    <Text style={styles.equipmentIcon}>{equip.icon}</Text>
                    <Text style={styles.equipmentLabel}>{equip.label}</Text>
                    {selectedEquipment.includes(equip.id) && (
                      <Text style={styles.equipmentCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={handleSavePlot}
                >
                  <Text style={styles.modalSaveText}>
                    {editingPlot ? 'Update' : 'Add Plot'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pureWhite,
  },
  header: {
    backgroundColor: COLORS.primaryGreen,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.pureWhite,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.accentYellow,
  },
  overviewCard: {
    backgroundColor: COLORS.accentYellow,
    margin: 20,
    padding: 20,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: COLORS.primaryGreen,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    color: COLORS.earthBrown,
    marginBottom: 5,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
  },
  progressBar: {
    height: 10,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primaryGreen,
  },
  remainingText: {
    fontSize: 12,
    color: COLORS.earthBrown,
    textAlign: 'center',
  },
  plotsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.earthBrown,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 40,
  },
  emptyButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  plotCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 6,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  plotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  plotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  plotIcon: {
    fontSize: 36,
    marginRight: 12,
  },
  plotInfo: {
    flex: 1,
  },
  plotName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 3,
  },
  plotCrop: {
    fontSize: 14,
    color: COLORS.earthBrown,
  },
  plotActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 18,
  },
  plotDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  plotStat: {
    flex: 1,
  },
  plotStatLabel: {
    fontSize: 12,
    color: COLORS.earthBrown,
    marginBottom: 3,
  },
  plotStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  plotTags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: COLORS.accentYellow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.deepBlack,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingButtonText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 55,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.deepBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.pureWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.pureWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.pureWhite,
    borderWidth: 2,
    borderColor: COLORS.primaryGreen,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: COLORS.deepBlack,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.earthBrown,
    marginTop: 5,
  },
  cropList: {
    marginTop: 10,
    marginBottom: 10,
  },
  cropCard: {
    width: 100,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cropCardSelected: {
    backgroundColor: COLORS.primaryGreen,
  },
  cropIcon: {
    fontSize: 32,
    marginBottom: 5,
  },
  cropName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateInput: {
    flex: 1,
  },
  dateSeparator: {
    fontSize: 14,
    color: COLORS.earthBrown,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  optionCard: {
    width: (width - 60) / 2,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: COLORS.primaryGreen,
  },
  optionIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  equipmentCard: {
    width: (width - 60) / 2,
    backgroundColor: COLORS.accentYellow,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.earthBrown,
    position: 'relative',
  },
  equipmentCardSelected: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: COLORS.primaryGreen,
  },
  equipmentIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  equipmentLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.deepBlack,
    flex: 1,
  },
  equipmentCheck: {
    fontSize: 18,
    color: COLORS.pureWhite,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 30,
    marginBottom: 20,
  },
  modalCancelButton: {
    flex: 1,
    height: 50,
    backgroundColor: COLORS.earthBrown,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSaveButton: {
    flex: 2,
    height: 50,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
