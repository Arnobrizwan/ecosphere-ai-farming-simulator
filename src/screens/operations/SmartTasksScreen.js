import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/auth.service';
import SmartTaskService from '../../services/smartTask.service';

const DEFAULT_FORM = {
  name: '',
  description: '',
  type: 'generic',
  category: 'operations',
  trigger: null,
  schedule: {
    frequency: 'daily',
    time: '06:00',
  },
  targetDevices: [],
  targetPlots: [],
  resources: {},
  priority: 'normal',
};

const FREQUENCIES = ['once', 'daily', 'weekly', 'monthly'];
const PRIORITIES = ['low', 'normal', 'high'];

const getUserContextForGemini = (tasks) => ({
  existingTasks: tasks.map((task) => ({
    name: task.name,
    trigger: task.trigger,
    schedule: task.schedule,
    status: task.status,
  })),
});

export default function SmartTasksScreen({ navigation }) {
  const [smartTaskService, setSmartTaskService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [resourceKey, setResourceKey] = useState('water');
  const [resourceValue, setResourceValue] = useState('');
  const [triggerEnabled, setTriggerEnabled] = useState(false);
  const [triggerThreshold, setTriggerThreshold] = useState('25');
  const [triggerType, setTriggerType] = useState('soilMoisture');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const user = authService.getCurrentUser();
        if (!user) {
          Alert.alert('Authentication required', 'Please sign in again to manage automated tasks.');
          navigation.goBack();
          return;
        }

        const service = new SmartTaskService(user.uid);
        setSmartTaskService(service);

        try {
          const unsubscribe = service.subscribe((taskList) => {
            console.log('Smart tasks loaded:', taskList.length);
            setTasks(taskList);
            setLoading(false);
          });

          return () => unsubscribe();
        } catch (subscribeError) {
          console.error('Subscribe error:', subscribeError);
          setLoading(false);
          setTasks([]);
        }
      } catch (error) {
        console.error('SmartTasks init error:', error);
        setLoading(false);
        setTasks([]);
      }
    };

    init();
  }, [navigation]);

  const automationPreview = useMemo(() => {
    if (!smartTaskService || !form.name) return null;
    try {
      return smartTaskService.mapToAutomationPayload(form);
    } catch (err) {
      return null;
    }
  }, [smartTaskService, form]);

  const handleAddResource = () => {
    if (!resourceKey || !resourceValue) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        [resourceKey.trim()]: Number(resourceValue) || resourceValue,
      },
    }));

    setResourceKey('');
    setResourceValue('');
  };

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setTriggerEnabled(false);
    setTriggerType('soilMoisture');
    setTriggerThreshold('25');
    setResourceKey('water');
    setResourceValue('');
  };

  const handleCreateTask = async () => {
    if (!smartTaskService) return;
    try {
      const payload = {
        ...form,
        trigger: triggerEnabled
          ? {
              type: triggerType,
              threshold: Number(triggerThreshold),
              checkFrequency: 'hourly',
            }
          : null,
      };

      await smartTaskService.createTask(payload);
      Alert.alert('Success', 'Automated task created successfully.');
      resetForm();
    } catch (error) {
      console.error('Create task error:', error);
      Alert.alert('Error creating task', error.message || 'Unable to save task.');
    }
  };

  const applyGeneratedRule = (result) => {
    if (!result?.success) {
      Alert.alert('AI Assistant', result?.message || 'Could not generate a task rule.');
      return;
    }

    const data = result.data || {};
    setForm((prev) => ({
      ...prev,
      name: data.name || prev.name,
      description: data.description || prev.description,
      trigger: data.trigger || prev.trigger,
      schedule: data.schedule || prev.schedule,
      resources: data.resources || prev.resources,
      priority: data.priority || prev.priority,
    }));

    if (data.trigger) {
      setTriggerEnabled(true);
      setTriggerType(data.trigger.type || 'soilMoisture');
      setTriggerThreshold(String(data.trigger.threshold || triggerThreshold));
    }
  };

  const handleGenerateRule = async () => {
    if (!smartTaskService) return;
    if (!aiPrompt.trim()) {
      Alert.alert('AI Assistant', 'Describe the task you wish to automate.');
      return;
    }

    setAiLoading(true);
    const context = getUserContextForGemini(tasks);
    try {
      const result = await smartTaskService.generateRuleFromPrompt(aiPrompt.trim(), context);
      applyGeneratedRule(result);
    } catch (error) {
      console.error('Gemini rule error:', error);
      Alert.alert('AI Assistant', error.message || 'Unable to generate rule at this time.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleEvaluate = async (task) => {
    if (!smartTaskService) return;
    try {
      const result = await smartTaskService.evaluateTaskSafety(task);
      if (result.success) {
        Alert.alert('Task Evaluation', JSON.stringify(result.data, null, 2));
      } else {
        Alert.alert('Task Evaluation', result.message || 'Unable to evaluate task.');
      }
    } catch (error) {
      console.error('Evaluate error:', error);
      Alert.alert('Task Evaluation', error.message || 'Unable to evaluate task.');
    }
  };

  const renderTaskCard = (task) => {
    const statusColor = {
      scheduled: COLORS.skyBlue,
      active: COLORS.primaryGreen,
      paused: '#FF9800',
      waiting: '#FF5722',
      completed: '#4CAF50',
      failed: '#E53935',
    }[task.status] || '#999999';

    return (
      <View key={task.id} style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <View>
            <Text style={styles.taskName}>{task.name}</Text>
            <Text style={styles.taskMeta}>{task.type} · {task.priority.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{task.status.toUpperCase()}</Text>
          </View>
        </View>

        {task.description ? (
          <Text style={styles.taskDescription}>{task.description}</Text>
        ) : null}

        {task.schedule ? (
          <Text style={styles.taskInfo}>Schedule: {task.schedule.frequency} @ {task.schedule.time}</Text>
        ) : null}

        {task.trigger ? (
          <Text style={styles.taskInfo}>
            Trigger: {task.trigger.type} {'>'}
            {task.trigger.threshold}
          </Text>
        ) : null}

        {task.manualOverride?.active ? (
          <Text style={styles.overrideText}>Manual override active: {task.manualOverride.reason}</Text>
        ) : null}

        <View style={styles.taskActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.outlineButton]}
            onPress={() => handleEvaluate(task)}
          >
            <Text style={styles.actionButtonText}>Evaluate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.outlineButton]}
            onPress={() => navigation.navigate('CampaignMode', { highlightTask: task.id })}
          >
            <Text style={styles.actionButtonText}>View in Campaign</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => confirmDelete(task.id)}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusControls}>
          <TouchableOpacity
            style={[styles.statusButton, styles.primaryButton]}
            onPress={() => smartTaskService.updateStatus(task.id, 'active')}
          >
            <Text style={styles.statusButtonText}>Activate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusButton, styles.secondaryButton]}
            onPress={() =>
              smartTaskService.setManualOverride(task.id, {
                active: !task.manualOverride?.active,
                reason: task.manualOverride?.active ? '' : 'Manual override from mobile app',
                expiresAt: null,
              })
            }
          >
            <Text style={styles.statusButtonText}>
              {task.manualOverride?.active ? 'Disable Override' : 'Manual Override'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const confirmDelete = (taskId) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to remove this automated task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => smartTaskService.deleteTask(taskId) },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>UC22 · Smart Task Automation</Text>
        <Text style={styles.subtitle}>Create rules, link IoT devices, and manage automated farm work.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryGreen} />
          <Text style={styles.loadingText}>Loading smart tasks…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Rule Builder</Text>
            <Text style={styles.sectionHelp}>
              Describe the job and AgriBot will propose triggers, schedules, and resources.
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g., Water greenhouse tomatoes whenever moisture drops below 30%"
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={aiPrompt}
              onChangeText={setAiPrompt}
              multiline
            />
            <TouchableOpacity
              style={[styles.primaryButton, aiLoading && styles.disabledButton]}
              onPress={handleGenerateRule}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <ActivityIndicator color={COLORS.pureWhite} />
              ) : (
                <Text style={styles.primaryButtonText}>Generate with Gemini</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Task Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Task name"
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={form.name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
            />
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Description / notes (optional)"
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={form.description}
              onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
              multiline
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Type (e.g., irrigation, scouting)"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={form.type}
                onChangeText={(value) => setForm((prev) => ({ ...prev, type: value }))}
              />
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Priority (low/normal/high)"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={form.priority}
                onChangeText={(value) => setForm((prev) => ({ ...prev, priority: value }))}
              />
            </View>

            <Text style={styles.fieldLabel}>Schedule</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Frequency"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={form.schedule.frequency}
                onChangeText={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    schedule: { ...prev.schedule, frequency: value },
                  }))
                }
              />
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Time (HH:MM)"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={form.schedule.time}
                onChangeText={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    schedule: { ...prev.schedule, time: value },
                  }))
                }
              />
            </View>

            <View style={styles.triggerRow}>
              <Text style={styles.fieldLabel}>Use trigger condition?</Text>
              <Switch
                value={triggerEnabled}
                onValueChange={setTriggerEnabled}
                trackColor={{ true: COLORS.primaryGreen, false: 'rgba(255,255,255,0.3)' }}
              />
            </View>

            {triggerEnabled ? (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Trigger type (soilMoisture, rainfall, temperature)"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  value={triggerType}
                  onChangeText={setTriggerType}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Threshold"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  keyboardType="numeric"
                  value={triggerThreshold}
                  onChangeText={setTriggerThreshold}
                />
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Resources Needed</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Resource (e.g., water)"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={resourceKey}
                onChangeText={setResourceKey}
              />
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Amount"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={resourceValue}
                onChangeText={setResourceValue}
              />
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleAddResource}>
              <Text style={styles.secondaryButtonText}>Add Resource</Text>
            </TouchableOpacity>
            {Object.keys(form.resources).length > 0 ? (
              <View style={styles.resourceList}>
                {Object.entries(form.resources).map(([key, value]) => (
                  <Text key={key} style={styles.resourceChip}>
                    {key}: {value}
                  </Text>
                ))}
              </View>
            ) : null}

            <TouchableOpacity style={styles.primaryButton} onPress={handleCreateTask}>
              <Text style={styles.primaryButtonText}>Create Automated Task</Text>
            </TouchableOpacity>
          </View>

          {automationPreview ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3D Automation Preview</Text>
              <Text style={styles.sectionHelp}>
                This payload feeds the `TaskAutomationSystem` inside the 3D world.
              </Text>
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>{JSON.stringify(automationPreview, null, 2)}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Smart Tasks</Text>
            {tasks.length === 0 ? (
              <Text style={styles.emptyText}>No smart tasks yet. Create one above to populate the queue.</Text>
            ) : (
              tasks.map(renderTaskCard)
            )}
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1C14',
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#123222',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  backButtonText: {
    color: COLORS.pureWhite,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.pureWhite,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.pureWhite,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  section: {
    backgroundColor: 'rgba(18, 50, 34, 0.85)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.pureWhite,
    marginBottom: 6,
  },
  sectionHelp: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.pureWhite,
    marginBottom: 12,
    fontSize: 14,
  },
  multilineInput: {
    height: 90,
    textAlignVertical: 'top',
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    color: COLORS.pureWhite,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowInput: {
    flex: 1,
  },
  triggerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginBottom: 6,
  },
  resourceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  resourceChip: {
    backgroundColor: 'rgba(46, 125, 50, 0.4)',
    color: COLORS.pureWhite,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: COLORS.pureWhite,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryButtonText: {
    color: COLORS.pureWhite,
    fontWeight: '600',
  },
  previewBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 12,
  },
  previewText: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  taskCard: {
    backgroundColor: 'rgba(9, 26, 17, 0.9)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskName: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  taskMeta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    color: COLORS.pureWhite,
    fontSize: 11,
    fontWeight: '600',
  },
  taskDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 6,
  },
  taskInfo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  overrideText: {
    color: '#FFCC80',
    fontSize: 12,
    marginTop: 6,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  deleteButton: {
    backgroundColor: '#C62828',
  },
  actionButtonText: {
    color: COLORS.pureWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  statusControls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonSmall: {
    backgroundColor: COLORS.primaryGreen,
  },
  primaryButtonOutline: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  primaryButtonTextSmall: {
    color: COLORS.pureWhite,
    fontWeight: '600',
  },
  primaryButtonIcon: {
    marginRight: 6,
  },
  primaryButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusButtonText: {
    color: COLORS.pureWhite,
    fontWeight: '600',
    fontSize: 12,
  },
});
