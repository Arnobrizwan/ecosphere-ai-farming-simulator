import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { useGameState, CROP_TYPES } from '../../game2d/GameStateContext';

const STATUS_LABELS = {
  fallow: 'Fallow',
  tilled: 'Tilled',
  growing: 'Growing',
  ready: 'Ready to Harvest',
};

function toDayHour(tick) {
  const totalHours = tick;
  const day = Math.floor(totalHours / 24) + 1;
  const hour = totalHours % 24;
  return { day, hour };
}

function moistureColor(value) {
  if (value >= 65) return '#0EA5E9';
  if (value >= 40) return '#22C55E';
  if (value >= 25) return '#F59E0B';
  return '#DC2626';
}

const CropManagementScreen = ({ navigation }) => {
  const {
    state,
    tillField,
    plantField,
    waterField,
    harvestField,
    sellProduce,
    acknowledgeCropTutorial,
    autoProgressCrop,
  } = useGameState();
  const [selectedCrop, setSelectedCrop] = useState('wheat');

  const { day, hour } = useMemo(() => toDayHour(state.tick), [state.tick]);

  useEffect(() => {
    if (!state.tutorial.crop.introAcknowledged) {
      acknowledgeCropTutorial('introAcknowledged');
    }
  }, [state.tutorial.crop.introAcknowledged, acknowledgeCropTutorial]);

  const tutorialStep = useMemo(() => {
    const cropTutorial = state.tutorial.crop;
    if (!cropTutorial.tilled || state.fields.some((field) => field.status === 'fallow')) {
      return {
        title: 'Step 1: Till a field',
        description: 'Fallow plots need to be tilled before seeds can be planted. Pick a fallow plot and till it.',
      };
    }
    if (!cropTutorial.planted || state.fields.some((field) => field.status === 'tilled')) {
      return {
        title: 'Step 2: Plant seeds',
        description: 'Choose a crop and plant it on your tilled plot. High market price crops bring better returns.',
      };
    }
    if (!cropTutorial.watered || state.fields.some((field) => field.status === 'growing' && field.soilMoisture < 60)) {
      return {
        title: 'Step 3: Keep moisture healthy',
        description: 'Growing crops thrive when soil moisture stays above 60%. Water plots dipping into the yellow zone.',
      };
    }
    if (!cropTutorial.harvested || state.fields.some((field) => field.status === 'ready')) {
      return {
        title: 'Step 4: Harvest mature crops',
        description: 'Once growth hits 100%, harvest to free the plot and move produce into inventory.',
      };
    }
    if (!cropTutorial.sold || Object.values(state.inventory).some((amount) => amount > 0)) {
      return {
        title: 'Step 5: Sell your produce',
        description: 'Visit the inventory panel to sell crops at current market rates and boost farm credits.',
      };
    }
    return {
      title: 'Crop loop mastered!',
      description: 'Keep the cycle flowing — balance market prices, moisture, and plot usage for maximum profit.',
    };
  }, [state.tutorial.crop, state.fields, state.inventory]);

  const handlePlant = (fieldId) => {
    plantField(fieldId, selectedCrop);
  };

  const handleSellAll = (crop) => {
    sellProduce(crop, state.inventory[crop]);
  };

  const renderFieldActions = (field) => {
    switch (field.status) {
      case 'fallow':
        return (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => tillField(field.id)}
          >
            <Text style={styles.actionButtonText}>Till Field</Text>
          </TouchableOpacity>
        );
      case 'tilled':
        return (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePlant(field.id)}
          >
            <Text style={styles.actionButtonText}>Plant {selectedCrop}</Text>
          </TouchableOpacity>
        );
      case 'growing':
        return (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => waterField(field.id)}
          >
            <Text style={styles.secondaryButtonText}>Water (+Moisture)</Text>
          </TouchableOpacity>
        );
      case 'ready':
        return (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => harvestField(field.id)}
          >
            <Text style={styles.actionButtonText}>Harvest</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.screenTitle}>Crop Management Hub</Text>
          <Text style={styles.screenSubtitle}>
            Day {day} • {hour.toString().padStart(2, '0')}:00 hrs
          </Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Weather</Text>
          <Text style={styles.infoValue}>{state.weather.condition}</Text>
          <Text style={styles.infoMeta}>
            {state.weather.temperature}°C • Humidity {state.weather.humidity}%
          </Text>
          <Text style={styles.infoMeta}>Rain chance {state.weather.rainfallChance}%</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Selected Crop</Text>
          <View style={styles.chipRow}>
            {CROP_TYPES.map((crop) => (
              <TouchableOpacity
                key={crop}
                style={[
                  styles.chip,
                  selectedCrop === crop && styles.chipActive,
                ]}
                onPress={() => setSelectedCrop(crop)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedCrop === crop && styles.chipTextActive,
                  ]}
                >
                  {crop.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.infoMeta}>Market price: ₹{state.market[selectedCrop]} / unit</Text>
        </View>
      </View>

      <View style={styles.tutorialCard}>
        <View style={styles.tutorialHeaderRow}>
          <Text style={styles.tutorialTitle}>{tutorialStep.title}</Text>
          <TouchableOpacity style={styles.autoButton} onPress={autoProgressCrop}>
            <Text style={styles.autoButtonText}>Auto-run next step</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.tutorialDescription}>{tutorialStep.description}</Text>
        {state.lastAutomationMessage ? (
          <Text style={styles.automationNote}>Automation: {state.lastAutomationMessage}</Text>
        ) : null}
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Fields</Text>
        <Text style={styles.sectionMeta}>Tap actions to progress the crop cycle</Text>
      </View>

      <View style={styles.fieldsGrid}>
        {state.fields.map((field) => (
          <View key={field.id} style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldTitle}>Plot {field.id + 1}</Text>
              <Text style={styles.fieldStatus}>{STATUS_LABELS[field.status]}</Text>
            </View>

            <Text style={styles.fieldDetail}>
              Crop: {field.crop ? field.crop.toUpperCase() : '—'}
            </Text>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${field.growth}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>Growth {field.growth}%</Text>

            <View style={styles.moistureRow}>
              <Text style={styles.moistureLabel}>Soil moisture</Text>
              <Text style={[styles.moistureValue, { color: moistureColor(field.soilMoisture) }]}>
                {Math.round(field.soilMoisture)}%
              </Text>
            </View>

            {renderFieldActions(field)}
          </View>
        ))}
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Inventory & Market</Text>
      </View>

      <View style={styles.inventoryCard}>
        {CROP_TYPES.map((crop) => (
          <View key={crop} style={styles.inventoryRow}>
            <View>
              <Text style={styles.inventoryLabel}>{crop.toUpperCase()}</Text>
              <Text style={styles.inventoryMeta}>Stored: {state.inventory[crop]} units</Text>
              <Text style={styles.inventoryMeta}>Market price: ₹{state.market[crop]} / unit</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, state.inventory[crop] === 0 && styles.disabledButton]}
              disabled={state.inventory[crop] === 0}
              onPress={() => handleSellAll(crop)}
            >
              <Text style={styles.actionButtonText}>Sell All</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default CropManagementScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  contentContainer: {
    paddingBottom: 40,
    paddingHorizontal: 18,
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.deepBlack,
  },
  screenSubtitle: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginTop: 4,
  },
  backButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.pureWhite,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.pureWhite,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.earthBrown,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.deepBlack,
    marginTop: 6,
  },
  infoMeta: {
    fontSize: 12,
    color: COLORS.deepBlack,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: COLORS.primaryGreen,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  chipTextActive: {
    color: COLORS.pureWhite,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tutorialCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  tutorialHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  tutorialDescription: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  automationNote: {
    marginTop: 10,
    fontSize: 12,
    color: '#92400E',
    fontStyle: 'italic',
  },
  autoButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  autoButtonText: {
    color: COLORS.pureWhite,
    fontWeight: '600',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.deepBlack,
  },
  sectionMeta: {
    fontSize: 12,
    color: COLORS.earthBrown,
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  fieldCard: {
    width: '48%',
    backgroundColor: COLORS.pureWhite,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  fieldTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.deepBlack,
  },
  fieldStatus: {
    fontSize: 12,
    color: COLORS.earthBrown,
    fontWeight: '600',
  },
  fieldDetail: {
    fontSize: 12,
    color: COLORS.deepBlack,
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 8,
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.primaryGreen,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.earthBrown,
    marginTop: 6,
  },
  moistureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 16,
  },
  moistureLabel: {
    fontSize: 12,
    color: COLORS.earthBrown,
  },
  moistureValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.pureWhite,
    fontWeight: '600',
    fontSize: 13,
  },
  secondaryButton: {
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 13,
  },
  inventoryCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 40,
  },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  inventoryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.deepBlack,
  },
  inventoryMeta: {
    fontSize: 12,
    color: COLORS.earthBrown,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
