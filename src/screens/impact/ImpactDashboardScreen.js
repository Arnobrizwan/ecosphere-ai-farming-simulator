import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import ImpactHub from '../../services/impact/impactHub.service';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

const DEFAULT_PERIOD = '1y';
const YIELD_UNIT_OPTIONS = ['kg', 'tons', 'bushels'];
const COST_CATEGORY_OPTIONS = ['inputs', 'labor', 'energy', 'equipment', 'other'];
const ENV_INDICATOR_OPTIONS = [
  { key: 'soil_health', label: 'Soil Health' },
  { key: 'emissions', label: 'Emissions' },
  { key: 'biodiversity', label: 'Biodiversity' },
];

const createInitialFormErrors = () => ({
  yield: {},
  water: {},
  cost: {},
  environmental: {},
  verification: {},
});

const NumberInput = ({ value, onChange, placeholder, error, style }) => (
  <TextInput
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    keyboardType="numeric"
    style={[styles.input, style, error && styles.inputError]}
  />
);

const TextArea = ({ value, onChange, placeholder, error }) => (
  <TextInput
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    multiline
    style={[styles.input, styles.textArea, error && styles.inputError]}
  />
);

const ImpactDashboardScreen = () => {
  const [hub, setHub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [reportTitle, setReportTitle] = useState('Seasonal Impact Report');
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [evidenceFiles, setEvidenceFiles] = useState([]);

  const [yieldForm, setYieldForm] = useState({
    plotId: '',
    cropType: '',
    season: '',
    harvestDate: null,
    yield: '',
    unit: 'kg',
    area: '',
    notes: '',
  });

  const [waterForm, setWaterForm] = useState({
    plotId: '',
    date: null,
    volume: '',
    cost: '',
    area: '',
  });

  const [costForm, setCostForm] = useState({
    category: 'inputs',
    amount: '',
    date: null,
    baseline: '',
    notes: '',
  });

  const [environmentalForm, setEnvironmentalForm] = useState({
    indicator: 'soil_health',
    value: '',
    scale: 100,
    date: null,
    notes: '',
  });

  const [formErrors, setFormErrors] = useState(createInitialFormErrors());
  const [iosDatePicker, setIosDatePicker] = useState({ visible: false, formKey: null, fieldKey: null });
  const [iosTempDate, setIosTempDate] = useState(new Date());

  const resetFormErrors = (formKey) => {
    setFormErrors((prev) => ({
      ...prev,
      [formKey]: {},
    }));
  };

  const clearFieldError = (formKey, fieldKey) => {
    setFormErrors((prev) => {
      const current = prev[formKey];
      if (!current || !current[fieldKey]) {
        return prev;
      }

      const updated = { ...current };
      delete updated[fieldKey];

      return {
        ...prev,
        [formKey]: updated,
      };
    });
  };

  const setFormErrorState = (formKey, errors) => {
    setFormErrors((prev) => ({
      ...prev,
      [formKey]: errors,
    }));
  };

  const getFormState = (formKey) => {
    switch (formKey) {
      case 'yield':
        return yieldForm;
      case 'water':
        return waterForm;
      case 'cost':
        return costForm;
      case 'environmental':
        return environmentalForm;
      default:
        return {};
    }
  };

  const setFormFieldValue = (formKey, fieldKey, value) => {
    const setterMap = {
      yield: setYieldForm,
      water: setWaterForm,
      cost: setCostForm,
      environmental: setEnvironmentalForm,
    };

    const setter = setterMap[formKey];
    if (setter) {
      setter((prev) => ({
        ...prev,
        [fieldKey]: value,
      }));
    }
  };

  const openDatePicker = (formKey, fieldKey) => {
    const currentValue = getFormState(formKey)?.[fieldKey];
    const initialDate = currentValue instanceof Date
      ? currentValue
      : currentValue
        ? new Date(currentValue)
        : new Date();

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialDate,
        mode: 'date',
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            setFormFieldValue(formKey, fieldKey, selectedDate);
            clearFieldError(formKey, fieldKey);
          }
        },
      });
      return;
    }

    setIosTempDate(initialDate);
    setIosDatePicker({ visible: true, formKey, fieldKey });
  };

  const closeIosDatePicker = () => {
    setIosDatePicker({ visible: false, formKey: null, fieldKey: null });
  };

  const confirmIosDatePicker = () => {
    if (!iosDatePicker.visible) return;

    setFormFieldValue(iosDatePicker.formKey, iosDatePicker.fieldKey, iosTempDate);
    clearFieldError(iosDatePicker.formKey, iosDatePicker.fieldKey);
    closeIosDatePicker();
  };

  const handleIosDateChange = (_, selectedDate) => {
    if (selectedDate) {
      setIosTempDate(selectedDate);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) {
      return '';
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const handlePickEvidence = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.type === 'cancel') {
        return;
      }

      const assets = result.assets || (result.type === 'success' ? [result] : []);

      if (!assets.length) {
        return;
      }

      const normalized = assets
        .filter((asset) => asset?.uri)
        .map((asset) => ({
          uri: asset.uri,
          name: asset.name || 'evidence',
          size: asset.size,
          type: asset.mimeType || asset.type || 'application/octet-stream',
        }));

      if (!normalized.length) {
        return;
      }

      setEvidenceFiles((prev) => {
        const deduped = new Map(prev.map((file) => [file.uri, file]));
        normalized.forEach((file) => {
          deduped.set(file.uri, file);
        });
        return Array.from(deduped.values());
      });

      resetFormErrors('verification');
    } catch (error) {
      console.error('Evidence pick failed:', error);
      Alert.alert('Error', error.message || 'Unable to attach evidence right now.');
    }
  };

  const removeEvidence = (index) => {
    setEvidenceFiles((prev) => prev.filter((_, idx) => idx !== index));
    resetFormErrors('verification');
  };

  const renderFormErrors = (formKey) => {
    const errors = formErrors[formKey];
    if (!errors || Object.keys(errors).length === 0) {
      return null;
    }

    return (
      <View style={styles.errorList}>
        {Object.entries(errors)
          .filter(([, message]) => Boolean(message))
          .map(([field, message]) => (
            <Text key={`${formKey}-${field}`} style={styles.errorText}>
              • {message}
            </Text>
          ))}
      </View>
    );
  };

  const validateYieldForm = () => {
    const errors = {};

    if (!yieldForm.plotId.trim()) {
      errors.plotId = 'Plot ID is required.';
    }
    if (!yieldForm.cropType.trim()) {
      errors.cropType = 'Crop type is required.';
    }
    if (!yieldForm.harvestDate) {
      errors.harvestDate = 'Harvest date is required.';
    }
    if (!yieldForm.yield) {
      errors.yield = 'Yield amount is required.';
    }

    const yieldAmount = parseFloat(yieldForm.yield);
    if (yieldForm.yield && (Number.isNaN(yieldAmount) || yieldAmount <= 0)) {
      errors.yield = 'Yield amount must be a positive number.';
    }

    if (yieldForm.area) {
      const areaValue = parseFloat(yieldForm.area);
      if (Number.isNaN(areaValue) || areaValue <= 0) {
        errors.area = 'Area must be a positive number.';
      }
    }

    return errors;
  };

  const validateWaterForm = () => {
    const errors = {};

    if (!waterForm.plotId.trim()) {
      errors.plotId = 'Plot ID is required.';
    }
    if (!waterForm.date) {
      errors.date = 'Please select a date.';
    }
    if (!waterForm.volume) {
      errors.volume = 'Water volume is required.';
    }

    const volumeValue = parseFloat(waterForm.volume);
    if (waterForm.volume && (Number.isNaN(volumeValue) || volumeValue <= 0)) {
      errors.volume = 'Water volume must be a positive number.';
    }

    if (waterForm.area) {
      const areaValue = parseFloat(waterForm.area);
      if (Number.isNaN(areaValue) || areaValue <= 0) {
        errors.area = 'Area must be a positive number.';
      }
    }

    if (waterForm.cost) {
      const costValue = parseFloat(waterForm.cost);
      if (Number.isNaN(costValue) || costValue < 0) {
        errors.cost = 'Cost must be zero or a positive number.';
      }
    }

    return errors;
  };

  const validateCostForm = () => {
    const errors = {};

    if (!costForm.category) {
      errors.category = 'Select a category.';
    }
    if (!costForm.amount) {
      errors.amount = 'Cost amount is required.';
    }
    if (!costForm.date) {
      errors.date = 'Please select a date.';
    }

    const amountValue = parseFloat(costForm.amount);
    if (costForm.amount && (Number.isNaN(amountValue) || amountValue <= 0)) {
      errors.amount = 'Cost amount must be a positive number.';
    }

    if (costForm.baseline) {
      const baselineValue = parseFloat(costForm.baseline);
      if (Number.isNaN(baselineValue) || baselineValue < 0) {
        errors.baseline = 'Baseline must be zero or a positive number.';
      }
    }

    return errors;
  };

  const validateEnvironmentalForm = () => {
    const errors = {};

    if (!environmentalForm.indicator) {
      errors.indicator = 'Select an indicator.';
    }
    if (!environmentalForm.value) {
      errors.value = 'Indicator value is required.';
    }
    if (!environmentalForm.date) {
      errors.date = 'Please select a date.';
    }

    const valueNumber = parseFloat(environmentalForm.value);
    if (environmentalForm.value && Number.isNaN(valueNumber)) {
      errors.value = 'Indicator value must be numeric.';
    }

    if (environmentalForm.scale) {
      const scaleNumber = parseFloat(environmentalForm.scale);
      if (Number.isNaN(scaleNumber) || scaleNumber <= 0) {
        errors.scale = 'Scale must be a positive number.';
      }
    }

    return errors;
  };

  useEffect(() => {
    const init = async () => {
      const user = authService.getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const impactHub = new ImpactHub();
      await impactHub.initialize(user.uid);
      setHub(impactHub);
      await refreshData(impactHub, period);
      setLoading(false);
    };

    init();
  }, [period]);

  const refreshData = async (impactHub, periodString = DEFAULT_PERIOD) => {
    try {
      setLoading(true);
      const dashboard = await impactHub.getDashboard({ period: periodString });
      setSummary(dashboard);
      const [userReports, userVerifications] = await Promise.all([
        impactHub.reportService.getUserReports(),
        impactHub.verificationService.getUserVerifications(),
      ]);
      setReports(userReports);
      setVerifications(userVerifications);
      setLastRefresh(Date.now());
    } catch (error) {
      console.error('Impact dashboard load failed:', error);
      Alert.alert('Error', error.message || 'Failed to load impact data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordYield = async () => {
    if (!hub) return;
    const errors = validateYieldForm();
    if (Object.keys(errors).length > 0) {
      setFormErrorState('yield', errors);
      Alert.alert('Missing details', Object.values(errors).join('\n'));
      return;
    }

    resetFormErrors('yield');

    const yieldAmount = parseFloat(yieldForm.yield);
    const area = yieldForm.area ? parseFloat(yieldForm.area) : 1;
    try {
      setSubmitting(true);
      await hub.yieldService.recordYield({
        plotId: yieldForm.plotId,
        cropType: yieldForm.cropType,
        season: yieldForm.season,
        harvestDate: yieldForm.harvestDate ? yieldForm.harvestDate.getTime() : Date.now(),
        yield: yieldAmount,
        unit: yieldForm.unit,
        area: area || 1,
        notes: yieldForm.notes,
      });
      Alert.alert('Saved', 'Yield entry recorded successfully.');
      await refreshData(hub, period);
      setYieldForm({ plotId: '', cropType: '', season: '', harvestDate: null, yield: '', unit: 'kg', area: '', notes: '' });
    } catch (error) {
      console.error('Record yield failed:', error);
      Alert.alert('Error', error.message || 'Failed to record yield.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordWater = async () => {
    if (!hub) return;
    const errors = validateWaterForm();
    if (Object.keys(errors).length > 0) {
      setFormErrorState('water', errors);
      Alert.alert('Missing details', Object.values(errors).join('\n'));
      return;
    }

    resetFormErrors('water');

    const volume = parseFloat(waterForm.volume);
    const area = waterForm.area ? parseFloat(waterForm.area) : 1;
    const cost = waterForm.cost ? parseFloat(waterForm.cost) : 0;
    try {
      setSubmitting(true);
      await hub.waterService.logWaterUsage({
        plotId: waterForm.plotId,
        date: waterForm.date ? waterForm.date.getTime() : Date.now(),
        volume,
        area: area || 1,
        cost,
      });
      Alert.alert('Saved', 'Water usage logged successfully.');
      await refreshData(hub, period);
      setWaterForm({ plotId: '', date: null, volume: '', cost: '', area: '' });
    } catch (error) {
      console.error('Record water failed:', error);
      Alert.alert('Error', error.message || 'Failed to log water usage.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordCost = async () => {
    if (!hub) return;
    const errors = validateCostForm();
    if (Object.keys(errors).length > 0) {
      setFormErrorState('cost', errors);
      Alert.alert('Missing details', Object.values(errors).join('\n'));
      return;
    }

    resetFormErrors('cost');

    const amount = parseFloat(costForm.amount);
    const baseline = costForm.baseline ? parseFloat(costForm.baseline) : 0;
    try {
      setSubmitting(true);
      await hub.costService.recordCost({
        category: costForm.category,
        amount,
        date: costForm.date ? costForm.date.getTime() : Date.now(),
        baseline,
        notes: costForm.notes,
      });
      Alert.alert('Saved', 'Cost record added.');
      await refreshData(hub, period);
      setCostForm({ category: 'inputs', amount: '', date: null, baseline: '', notes: '' });
    } catch (error) {
      console.error('Record cost failed:', error);
      Alert.alert('Error', error.message || 'Failed to log cost record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordEnvironmental = async () => {
    if (!hub) return;
    const errors = validateEnvironmentalForm();
    if (Object.keys(errors).length > 0) {
      setFormErrorState('environmental', errors);
      Alert.alert('Missing details', Object.values(errors).join('\n'));
      return;
    }

    resetFormErrors('environmental');

    const value = parseFloat(environmentalForm.value);
    const scale = environmentalForm.scale ? parseFloat(environmentalForm.scale) : 100;
    try {
      setSubmitting(true);
      await hub.environmentalService.recordIndicator({
        indicator: environmentalForm.indicator,
        value,
        scale,
        date: environmentalForm.date ? environmentalForm.date.getTime() : Date.now(),
        notes: environmentalForm.notes,
      });
      Alert.alert('Saved', 'Environmental indicator recorded.');
      await refreshData(hub, period);
      setEnvironmentalForm({ indicator: 'soil_health', value: '', scale: 100, date: null, notes: '' });
    } catch (error) {
      console.error('Record environmental failed:', error);
      Alert.alert('Error', error.message || 'Failed to record environmental indicator.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!hub) return;
    try {
      setSubmitting(true);
      const now = Date.now();
      const periodRange = {
        start: now - 180 * 24 * 60 * 60 * 1000,
        end: now,
      };
      await hub.reportService.generateReport({
        title: reportTitle || 'Impact Report',
        period: periodRange,
        plots: [],
        format: 'pdf',
        includeCharts: true,
      });
      Alert.alert('Report generated', 'Impact report has been generated successfully.');
      await refreshData(hub, period);
    } catch (error) {
      console.error('Generate report failed:', error);
      Alert.alert('Error', error.message || 'Failed to generate report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitVerification = async (reportId) => {
    if (!hub) return;
    if (evidenceFiles.length === 0) {
      const errors = {
        evidence: 'Attach at least one evidence file before submitting for verification.',
      };
      setFormErrorState('verification', errors);
      Alert.alert('Missing evidence', errors.evidence);
      return;
    }

    resetFormErrors('verification');
    try {
      setSubmitting(true);
      await hub.verificationService.submitForVerification({
        reportId,
        evidence: evidenceFiles,
        notes: 'Submitted via mobile dashboard.',
      });
      Alert.alert('Submitted', 'Report sent for verification.');
      await refreshData(hub, period);
      setEvidenceFiles([]);
      resetFormErrors('verification');
    } catch (error) {
      console.error('Submit verification failed:', error);
      Alert.alert('Error', error.message || 'Failed to submit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  const periodLabel = useMemo(() => {
    const map = {
      '3m': 'Last 3 months',
      '6m': 'Last 6 months',
      '1y': 'Last 12 months',
      '2y': 'Last 24 months',
    };
    return map[period] || 'Custom period';
  }, [period]);

  if (loading && !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryGreen} />
        <Text style={styles.loadingText}>Loading impact metrics…</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Impact Measurement Hub</Text>
      <Text style={styles.subtitle}>Period: {periodLabel}</Text>
      <Text style={styles.refreshText}>Updated: {new Date(lastRefresh).toLocaleTimeString()}</Text>

      {summary ? (
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Yield</Text>
            <Text style={styles.summaryValue}>{summary.yield?.improvement?.percentage ?? 0}%</Text>
            <Text style={styles.summaryMeta}>Avg yield: {summary.yield?.averageYield ?? 0} kg/ha</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Water Savings</Text>
            <Text style={styles.summaryValue}>{summary.water?.savings?.percentage ?? 0}%</Text>
            <Text style={styles.summaryMeta}>Usage: {summary.water?.averageUsage ?? 0} L/ha</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Cost Reduction</Text>
            <Text style={styles.summaryValue}>{summary.cost?.reduction?.percentage ?? 0}%</Text>
            <Text style={styles.summaryMeta}>Spend: ৳{summary.cost?.totalCost ?? 0}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Environmental</Text>
            <Text style={styles.summaryValue}>{summary.environmental?.score ?? 0}</Text>
            <Text style={styles.summaryMeta}>Improvement: {summary.environmental?.improvement ?? 0}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.noDataText}>No impact data recorded yet.</Text>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Log Yield</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, formErrors.yield?.plotId && styles.inputError]}
            placeholder="Plot ID *"
            value={yieldForm.plotId}
            onChangeText={(text) => {
              clearFieldError('yield', 'plotId');
              setYieldForm((prev) => ({ ...prev, plotId: text }));
            }}
          />
          <TextInput
            style={[styles.input, formErrors.yield?.cropType && styles.inputError]}
            placeholder="Crop type *"
            value={yieldForm.cropType}
            onChangeText={(text) => {
              clearFieldError('yield', 'cropType');
              setYieldForm((prev) => ({ ...prev, cropType: text }));
            }}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="Season"
            value={yieldForm.season}
            onChangeText={(text) => setYieldForm((prev) => ({ ...prev, season: text }))}
          />
          <TouchableOpacity
            style={[styles.input, styles.dateInput, formErrors.yield?.harvestDate && styles.inputError]}
            onPress={() => openDatePicker('yield', 'harvestDate')}
          >
            <Text style={styles.dateInputText}>
              {yieldForm.harvestDate
                ? yieldForm.harvestDate.toLocaleDateString()
                : 'Select harvest date *'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <NumberInput
            placeholder="Yield amount *"
            value={yieldForm.yield}
            onChange={(text) => {
              clearFieldError('yield', 'yield');
              setYieldForm((prev) => ({ ...prev, yield: text }));
            }}
            error={formErrors.yield?.yield}
          />
          <View style={[styles.input, styles.pickerRow]}>
            {YIELD_UNIT_OPTIONS.map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[styles.chip, yieldForm.unit === unit && styles.chipActive]}
                onPress={() => setYieldForm((prev) => ({ ...prev, unit }))}
              >
                <Text
                  style={[styles.chipText, yieldForm.unit === unit && styles.chipTextActive]}
                >
                  {unit.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <NumberInput
            placeholder="Area (ha)"
            value={yieldForm.area}
            onChange={(text) => {
              clearFieldError('yield', 'area');
              setYieldForm((prev) => ({ ...prev, area: text }));
            }}
            error={formErrors.yield?.area}
          />
        </View>
        <TextArea
          placeholder="Notes"
          value={yieldForm.notes}
          onChange={(text) => setYieldForm((prev) => ({ ...prev, notes: text }))}
        />
        {renderFormErrors('yield')}
        <TouchableOpacity style={styles.primaryButton} onPress={handleRecordYield} disabled={submitting}>
          <Text style={styles.primaryButtonText}>Save Yield Entry</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Log Water Usage</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, formErrors.water?.plotId && styles.inputError]}
            placeholder="Plot ID *"
            value={waterForm.plotId}
            onChangeText={(text) => {
              clearFieldError('water', 'plotId');
              setWaterForm((prev) => ({ ...prev, plotId: text }));
            }}
          />
          <TouchableOpacity
            style={[styles.input, styles.dateInput, formErrors.water?.date && styles.inputError]}
            onPress={() => openDatePicker('water', 'date')}
          >
            <Text style={styles.dateInputText}>
              {waterForm.date ? waterForm.date.toLocaleDateString() : 'Select date *'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <NumberInput
            placeholder="Volume (L) *"
            value={waterForm.volume}
            onChange={(text) => {
              clearFieldError('water', 'volume');
              setWaterForm((prev) => ({ ...prev, volume: text }));
            }}
            error={formErrors.water?.volume}
          />
          <NumberInput
            placeholder="Area (ha)"
            value={waterForm.area}
            onChange={(text) => {
              clearFieldError('water', 'area');
              setWaterForm((prev) => ({ ...prev, area: text }));
            }}
            error={formErrors.water?.area}
          />
          <NumberInput
            placeholder="Cost"
            value={waterForm.cost}
            onChange={(text) => {
              clearFieldError('water', 'cost');
              setWaterForm((prev) => ({ ...prev, cost: text }));
            }}
            error={formErrors.water?.cost}
          />
        </View>
        {renderFormErrors('water')}
        <TouchableOpacity style={styles.primaryButton} onPress={handleRecordWater} disabled={submitting}>
          <Text style={styles.primaryButtonText}>Save Water Entry</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Log Cost Record</Text>
        <View style={styles.row}>
          <View style={[styles.pickerContainer, formErrors.cost?.category && styles.inputError]}>
            <Picker
              selectedValue={costForm.category}
              onValueChange={(value) => {
                clearFieldError('cost', 'category');
                setCostForm((prev) => ({ ...prev, category: value }));
              }}
              style={styles.picker}
            >
              {COST_CATEGORY_OPTIONS.map((cat) => (
                <Picker.Item
                  key={cat}
                  label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  value={cat}
                />
              ))}
            </Picker>
          </View>
          <NumberInput
            placeholder="Amount *"
            value={costForm.amount}
            onChange={(text) => {
              clearFieldError('cost', 'amount');
              setCostForm((prev) => ({ ...prev, amount: text }));
            }}
            error={formErrors.cost?.amount}
          />
          <TouchableOpacity
            style={[styles.input, styles.dateInput, formErrors.cost?.date && styles.inputError]}
            onPress={() => openDatePicker('cost', 'date')}
          >
            <Text style={styles.dateInputText}>
              {costForm.date ? costForm.date.toLocaleDateString() : 'Select date *'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <NumberInput
            placeholder="Baseline"
            value={costForm.baseline}
            onChange={(text) => {
              clearFieldError('cost', 'baseline');
              setCostForm((prev) => ({ ...prev, baseline: text }));
            }}
            error={formErrors.cost?.baseline}
          />
        </View>
        <TextArea
          placeholder="Notes"
          value={costForm.notes}
          onChange={(text) => setCostForm((prev) => ({ ...prev, notes: text }))}
        />
        {renderFormErrors('cost')}
        <TouchableOpacity style={styles.primaryButton} onPress={handleRecordCost} disabled={submitting}>
          <Text style={styles.primaryButtonText}>Save Cost Entry</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Log Environmental Indicator</Text>
        <View style={styles.row}>
          <View style={[styles.pickerContainer, formErrors.environmental?.indicator && styles.inputError]}>
            <Picker
              selectedValue={environmentalForm.indicator}
              onValueChange={(value) => {
                clearFieldError('environmental', 'indicator');
                setEnvironmentalForm((prev) => ({ ...prev, indicator: value }));
              }}
              style={styles.picker}
            >
              {ENV_INDICATOR_OPTIONS.map((option) => (
                <Picker.Item key={option.key} label={option.label} value={option.key} />
              ))}
            </Picker>
          </View>
          <NumberInput
            placeholder="Value *"
            value={environmentalForm.value}
            onChange={(text) => {
              clearFieldError('environmental', 'value');
              setEnvironmentalForm((prev) => ({ ...prev, value: text }));
            }}
            error={formErrors.environmental?.value}
          />
          <NumberInput
            placeholder="Scale"
            value={String(environmentalForm.scale)}
            onChange={(text) => {
              clearFieldError('environmental', 'scale');
              setEnvironmentalForm((prev) => ({ ...prev, scale: text }));
            }}
            error={formErrors.environmental?.scale}
          />
        </View>
        <TouchableOpacity
          style={[styles.input, styles.dateInput, formErrors.environmental?.date && styles.inputError]}
          onPress={() => openDatePicker('environmental', 'date')}
        >
          <Text style={styles.dateInputText}>
            {environmentalForm.date ? environmentalForm.date.toLocaleDateString() : 'Select date *'}
          </Text>
        </TouchableOpacity>
        <TextArea
          placeholder="Notes"
          value={environmentalForm.notes}
          onChange={(text) => setEnvironmentalForm((prev) => ({ ...prev, notes: text }))}
        />
        {renderFormErrors('environmental')}
        <TouchableOpacity style={styles.primaryButton} onPress={handleRecordEnvironmental} disabled={submitting}>
          <Text style={styles.primaryButtonText}>Save Indicator</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generate Impact Report</Text>
        <TextInput
          style={styles.input}
          placeholder="Report title"
          value={reportTitle}
          onChangeText={setReportTitle}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleGenerateReport} disabled={submitting}>
          <Text style={styles.primaryButtonText}>Generate Report</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButtonAlt, formErrors.verification?.evidence && styles.inputError]}
          onPress={handlePickEvidence}
          disabled={submitting}
        >
          <Text style={styles.secondaryButtonAltText}>Attach Evidence</Text>
        </TouchableOpacity>
        {evidenceFiles.length > 0 && (
          <View style={styles.evidenceList}>
            {evidenceFiles.map((file, index) => (
              <View key={`${file.name}-${index}`} style={styles.evidenceItem}>
                <Text style={styles.listMeta}>
                  {file.name}
                  {file.size ? ` (${formatFileSize(file.size)})` : ''}
                </Text>
                <TouchableOpacity onPress={() => removeEvidence(index)}>
                  <Text style={styles.removeLink}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {renderFormErrors('verification')}
        {reports.length > 0 ? (
          <View style={styles.listContainer}>
            {reports.map((report) => (
              <View key={report.id} style={styles.listItem}>
                <View>
                  <Text style={styles.listTitle}>{report.title}</Text>
                  <Text style={styles.listMeta}>Status: {report.status}</Text>
                  <Text style={styles.listMeta}>Created: {new Date(report.createdAt).toLocaleDateString()}</Text>
                </View>
                {report.status === 'generated' && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleSubmitVerification(report.id)}
                    disabled={submitting}
                  >
                    <Text style={styles.secondaryButtonText}>Submit for Verification</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDataText}>No reports generated yet.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verification Status</Text>
        {verifications.length > 0 ? (
          <View style={styles.listContainer}>
            {verifications.map((verification) => (
              <View key={verification.id} style={styles.listItem}>
                <View>
                  <Text style={styles.listTitle}>Report: {verification.reportId}</Text>
                  <Text style={styles.listMeta}>Status: {verification.status}</Text>
                  {verification.decision?.notes ? (
                    <Text style={styles.listMeta}>Notes: {verification.decision.notes}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDataText}>No verification requests submitted yet.</Text>
        )}
      </View>

        <View style={styles.footerSpacer} />
      </ScrollView>
      {Platform.OS === 'ios' && (
        <Modal
          transparent
          animationType="slide"
          visible={iosDatePicker.visible}
          onRequestClose={closeIosDatePicker}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <DateTimePicker
                value={iosTempDate}
                mode="date"
                display="spinner"
                onChange={handleIosDateChange}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={closeIosDatePicker}
                >
                  <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={confirmIosDatePicker}
                >
                  <Text style={styles.modalButtonTextPrimary}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.deepBlack,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.earthBrown,
    marginTop: 4,
  },
  refreshText: {
    fontSize: 12,
    color: COLORS.earthBrown,
    marginTop: 2,
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.deepBlack,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flexBasis: '48%',
    backgroundColor: COLORS.pureWhite,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.earthBrown,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primaryGreen,
    marginTop: 6,
  },
  summaryMeta: {
    fontSize: 12,
    color: COLORS.deepBlack,
    marginTop: 4,
  },
  noDataText: {
    fontSize: 13,
    color: COLORS.earthBrown,
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.deepBlack,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.deepBlack,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  errorList: {
    marginBottom: 6,
    marginTop: -4,
    gap: 2,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: COLORS.pureWhite,
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 13,
  },
  listContainer: {
    marginTop: 12,
    gap: 12,
  },
  listItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.deepBlack,
  },
  listMeta: {
    fontSize: 12,
    color: COLORS.earthBrown,
    marginTop: 4,
  },
  footerSpacer: {
    height: 40,
  },
  dateInput: {
    justifyContent: 'center',
  },
  dateInputText: {
    color: COLORS.deepBlack,
    fontSize: 14,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  picker: {
    flex: 1,
    height: 44,
    color: COLORS.deepBlack,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 6,
  },
  chip: {
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipActive: {
    backgroundColor: COLORS.primaryGreen,
  },
  chipText: {
    color: COLORS.earthBrown,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.pureWhite,
  },
  secondaryButtonAlt: {
    marginTop: 10,
    backgroundColor: '#BFDBFE',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonAltText: {
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 14,
  },
  evidenceList: {
    marginTop: 10,
    gap: 8,
  },
  evidenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeLink: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  modalContent: {
    backgroundColor: COLORS.pureWhite,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.deepBlack,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.primaryGreen,
  },
  modalButtonSecondary: {
    backgroundColor: '#E2E8F0',
  },
  modalButtonTextPrimary: {
    color: COLORS.pureWhite,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: COLORS.deepBlack,
    fontWeight: '600',
  },
});

ImpactDashboardScreen.showGameOverlay = true;

export default ImpactDashboardScreen;
