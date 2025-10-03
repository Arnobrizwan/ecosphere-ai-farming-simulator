import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { useGameState, CROP_TYPES } from '../GameStateContext';

/**
 * Interactive 2D Farm Game Component
 * Complete farming simulation with planting, watering, harvesting, and selling
 */
export default function InteractiveFarmGame({ mode = 'campaign', missionId = null }) {
  const {
    state,
    tillField,
    plantField,
    waterField,
    harvestField,
    sellProduce,
    resetField,
    autoProgressCrop
  } = useGameState();

  const [selectedField, setSelectedField] = useState(null);
  const [showCropSelector, setShowCropSelector] = useState(null);
  const [showMarket, setShowMarket] = useState(false);

  const handleFieldPress = (field) => {
    setSelectedField(field);
  };

  const handleTillField = (fieldId) => {
    tillField(fieldId);
    Alert.alert('Success', `Field ${fieldId + 1} tilled successfully!`);
  };

  const handlePlantField = (fieldId, cropType) => {
    plantField(fieldId, cropType);
    setShowCropSelector(null);
    Alert.alert('Success', `Planted ${cropType} in field ${fieldId + 1}!`);
  };

  const handleWaterField = (fieldId) => {
    waterField(fieldId);
    Alert.alert('Success', `Field ${fieldId + 1} watered!`);
  };

  const handleHarvestField = (fieldId) => {
    const field = state.fields.find(f => f.id === fieldId);
    harvestField(fieldId);
    Alert.alert('Harvest!', `Harvested ${field?.crop} from field ${fieldId + 1}!`);
  };

  const handleSellCrop = (cropType, amount) => {
    const price = state.market[cropType];
    const total = price * amount;
    sellProduce(cropType, amount);
    Alert.alert(
      'Sold!',
      `Sold ${amount} ${cropType} for ₹${total.toFixed(2)}!`
    );
  };

  const getFieldColor = (field) => {
    switch (field.status) {
      case 'fallow': return '#8B7355';
      case 'tilled': return '#654321';
      case 'growing': return '#90EE90';
      case 'ready': return '#FFD700';
      default: return '#8B7355';
    }
  };

  const getFieldIcon = (field) => {
    if (field.status === 'growing' || field.status === 'ready') {
      if (field.crop === 'wheat') return '🌾';
      if (field.crop === 'corn') return '🌽';
      if (field.crop === 'soy') return '🫘';
    }
    if (field.status === 'tilled') return '🟫';
    return '⬜';
  };

  const getFieldActions = (field) => {
    const actions = [];

    if (field.status === 'fallow') {
      actions.push({
        label: '🚜 Till',
        action: () => handleTillField(field.id),
        color: '#8B4513'
      });
    }

    if (field.status === 'tilled') {
      actions.push({
        label: '🌱 Plant',
        action: () => setShowCropSelector(field.id),
        color: '#2E7D32'
      });
    }

    if (field.status === 'growing' || field.status === 'ready') {
      actions.push({
        label: '💧 Water',
        action: () => handleWaterField(field.id),
        color: '#1E88E5',
        disabled: field.soilMoisture > 80
      });
    }

    if (field.status === 'ready') {
      actions.push({
        label: '✂️ Harvest',
        action: () => handleHarvestField(field.id),
        color: '#FFD700'
      });
    }

    if (field.status !== 'fallow') {
      actions.push({
        label: '🔄 Reset',
        action: () => {
          Alert.alert(
            'Reset Field',
            'Are you sure you want to reset this field?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', onPress: () => resetField(field.id), style: 'destructive' }
            ]
          );
        },
        color: '#F44336'
      });
    }

    return actions;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Resource Panel */}
      <View style={styles.resourcePanel}>
        <View style={styles.resourceRow}>
          <View style={styles.resourceItem}>
            <Text style={styles.resourceLabel}>💰 Credits</Text>
            <Text style={styles.resourceValue}>₹{state.resources.credits.toFixed(0)}</Text>
          </View>
          <View style={styles.resourceItem}>
            <Text style={styles.resourceLabel}>💧 Water</Text>
            <Text style={styles.resourceValue}>{state.resources.water.toFixed(0)}%</Text>
          </View>
          <View style={styles.resourceItem}>
            <Text style={styles.resourceLabel}>🌱 Soil</Text>
            <Text style={styles.resourceValue}>{state.resources.soilHealth.toFixed(0)}%</Text>
          </View>
        </View>
      </View>

      {/* Weather Panel */}
      <View style={styles.weatherPanel}>
        <Text style={styles.weatherText}>
          {state.weather.condition === 'Sunny' && '☀️'}
          {state.weather.condition === 'Partly Cloudy' && '⛅'}
          {state.weather.condition === 'Overcast' && '☁️'}
          {state.weather.condition === 'Rain' && '🌧️'}
          {' '}{state.weather.condition} - {state.weather.temperature}°C - Humidity {state.weather.humidity}%
        </Text>
      </View>

      {/* Inventory Panel */}
      <View style={styles.inventoryPanel}>
        <Text style={styles.panelTitle}>📦 Inventory</Text>
        <View style={styles.inventoryRow}>
          <View style={styles.inventoryItem}>
            <Text style={styles.inventoryIcon}>🌾</Text>
            <Text style={styles.inventoryText}>Wheat: {state.inventory.wheat}</Text>
          </View>
          <View style={styles.inventoryItem}>
            <Text style={styles.inventoryIcon}>🌽</Text>
            <Text style={styles.inventoryText}>Corn: {state.inventory.corn}</Text>
          </View>
          <View style={styles.inventoryItem}>
            <Text style={styles.inventoryIcon}>🫘</Text>
            <Text style={styles.inventoryText}>Soy: {state.inventory.soy}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.marketButton}
          onPress={() => setShowMarket(true)}
        >
          <Text style={styles.marketButtonText}>🏪 Open Market</Text>
        </TouchableOpacity>
      </View>

      {/* Farm Fields */}
      <View style={styles.farmPanel}>
        <Text style={styles.panelTitle}>🚜 Farm Fields</Text>
        <View style={styles.fieldsGrid}>
          {state.fields.map((field) => (
            <TouchableOpacity
              key={field.id}
              style={[
                styles.fieldCard,
                { borderColor: getFieldColor(field) }
              ]}
              onPress={() => handleFieldPress(field)}
            >
              <View style={[styles.fieldHeader, { backgroundColor: getFieldColor(field) }]}>
                <Text style={styles.fieldNumber}>Field {field.id + 1}</Text>
                <Text style={styles.fieldIcon}>{getFieldIcon(field)}</Text>
              </View>

              <View style={styles.fieldInfo}>
                <Text style={styles.fieldStatus}>
                  Status: {field.status.charAt(0).toUpperCase() + field.status.slice(1)}
                </Text>
                {field.crop && (
                  <Text style={styles.fieldCrop}>Crop: {field.crop.toUpperCase()}</Text>
                )}
                {field.status === 'growing' && (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${field.growth}%` }]} />
                    <Text style={styles.progressText}>{field.growth.toFixed(0)}%</Text>
                  </View>
                )}
                <Text style={styles.fieldMoisture}>
                  💧 Moisture: {field.soilMoisture.toFixed(0)}%
                </Text>
              </View>

              <View style={styles.fieldActions}>
                {getFieldActions(field).map((action, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.actionButton,
                      { backgroundColor: action.color },
                      action.disabled && styles.actionButtonDisabled
                    ]}
                    onPress={action.action}
                    disabled={action.disabled}
                  >
                    <Text style={styles.actionButtonText}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Auto Progress Button */}
      <TouchableOpacity
        style={styles.autoButton}
        onPress={autoProgressCrop}
      >
        <Text style={styles.autoButtonText}>🤖 Auto Progress</Text>
      </TouchableOpacity>
      {state.lastAutomationMessage && (
        <Text style={styles.automationMessage}>{state.lastAutomationMessage}</Text>
      )}

      {/* Crop Selector Modal */}
      <Modal
        visible={showCropSelector !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCropSelector(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Crop to Plant</Text>
            {CROP_TYPES.map((crop) => (
              <TouchableOpacity
                key={crop}
                style={styles.cropOption}
                onPress={() => handlePlantField(showCropSelector, crop)}
              >
                <Text style={styles.cropIcon}>
                  {crop === 'wheat' && '🌾'}
                  {crop === 'corn' && '🌽'}
                  {crop === 'soy' && '🫘'}
                </Text>
                <View style={styles.cropInfo}>
                  <Text style={styles.cropName}>{crop.toUpperCase()}</Text>
                  <Text style={styles.cropPrice}>Market: ₹{state.market[crop]?.toFixed(1)}/unit</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCropSelector(null)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Market Modal */}
      <Modal
        visible={showMarket}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMarket(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🏪 Market</Text>
            <Text style={styles.marketSubtitle}>Current Prices</Text>

            {CROP_TYPES.map((crop) => {
              const inventory = state.inventory[crop] || 0;
              const price = state.market[crop];

              return (
                <View key={crop} style={styles.marketItem}>
                  <View style={styles.marketItemHeader}>
                    <Text style={styles.marketIcon}>
                      {crop === 'wheat' && '🌾'}
                      {crop === 'corn' && '🌽'}
                      {crop === 'soy' && '🫘'}
                    </Text>
                    <View style={styles.marketItemInfo}>
                      <Text style={styles.marketItemName}>{crop.toUpperCase()}</Text>
                      <Text style={styles.marketItemPrice}>₹{price.toFixed(1)}/unit</Text>
                    </View>
                  </View>
                  <View style={styles.marketItemActions}>
                    <Text style={styles.marketItemStock}>Stock: {inventory}</Text>
                    {inventory > 0 && (
                      <>
                        <TouchableOpacity
                          style={styles.sellButton}
                          onPress={() => handleSellCrop(crop, Math.floor(inventory / 2))}
                        >
                          <Text style={styles.sellButtonText}>Sell Half</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.sellButton, styles.sellAllButton]}
                          onPress={() => handleSellCrop(crop, inventory)}
                        >
                          <Text style={styles.sellButtonText}>Sell All</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              style={styles.closeMarketButton}
              onPress={() => setShowMarket(false)}
            >
              <Text style={styles.closeMarketButtonText}>Close Market</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  resourcePanel: {
    backgroundColor: '#2E7D32',
    padding: 15,
    marginBottom: 10
  },
  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  resourceItem: {
    alignItems: 'center'
  },
  resourceLabel: {
    color: 'white',
    fontSize: 12,
    marginBottom: 4
  },
  resourceValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  weatherPanel: {
    backgroundColor: '#81D4FA',
    padding: 12,
    marginBottom: 10,
    alignItems: 'center'
  },
  weatherText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#01579B'
  },
  inventoryPanel: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10
  },
  inventoryItem: {
    alignItems: 'center'
  },
  inventoryIcon: {
    fontSize: 24,
    marginBottom: 4
  },
  inventoryText: {
    fontSize: 12,
    color: '#666'
  },
  marketButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  marketButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  farmPanel: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  fieldCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 3,
    marginBottom: 15,
    overflow: 'hidden'
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10
  },
  fieldNumber: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  fieldIcon: {
    fontSize: 24
  },
  fieldInfo: {
    padding: 10
  },
  fieldStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  fieldCrop: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  fieldMoisture: {
    fontSize: 11,
    color: '#999',
    marginTop: 4
  },
  progressBar: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 6,
    position: 'relative'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    position: 'absolute',
    left: 0,
    top: 0
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 20
  },
  fieldActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 4
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 4,
    marginBottom: 4
  },
  actionButtonDisabled: {
    opacity: 0.5
  },
  actionButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  autoButton: {
    backgroundColor: '#9C27B0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    margin: 15
  },
  autoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  automationMessage: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginHorizontal: 15,
    marginBottom: 15,
    fontStyle: 'italic'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333'
  },
  marketSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15
  },
  cropOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  cropIcon: {
    fontSize: 32,
    marginRight: 15
  },
  cropInfo: {
    flex: 1
  },
  cropName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  cropPrice: {
    fontSize: 13,
    color: '#666'
  },
  cancelButton: {
    backgroundColor: '#757575',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  marketItem: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12
  },
  marketItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  marketIcon: {
    fontSize: 28,
    marginRight: 12
  },
  marketItemInfo: {
    flex: 1
  },
  marketItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2
  },
  marketItemPrice: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600'
  },
  marketItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  marketItemStock: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600'
  },
  sellButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8
  },
  sellAllButton: {
    backgroundColor: '#F44336'
  },
  sellButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  closeMarketButton: {
    backgroundColor: '#2E7D32',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  closeMarketButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
