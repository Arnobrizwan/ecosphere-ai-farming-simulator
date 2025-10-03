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
import { ProjectManagementService } from '../../services/research/projectManagement.service';
import { auth } from '../../services/firebase.config';

/**
 * UC54 - Manage Research Projects
 * Create projects, track milestones/tasks, manage risks, generate reports
 */
export default function ProjectManagementScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [projectReport, setProjectReport] = useState(null);

  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    objectives: '',
    methodology: '',
    startDate: '',
    endDate: '',
    budget: ''
  });

  const [newMilestone, setNewMilestone] = useState({
    title: '',
    dueDate: '',
    deliverables: ''
  });

  const [newTask, setNewTask] = useState({
    title: '',
    assignedTo: '',
    dueDate: '',
    priority: 'medium'
  });

  const [newRisk, setNewRisk] = useState({
    description: '',
    severity: 'medium',
    mitigation: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new ProjectManagementService(userId);
      const data = await service.getUserProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      Alert.alert('Error', 'Failed to load research projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.title || !newProject.description) {
      Alert.alert('Error', 'Please fill in title and description');
      return;
    }

    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new ProjectManagementService(userId);

      const projectData = {
        ...newProject,
        objectives: newProject.objectives.split('\n').filter(o => o.trim()),
        timeline: {
          startDate: Date.now(),
          endDate: Date.now() + (90 * 24 * 60 * 60 * 1000) // 90 days
        },
        budget: {
          allocated: parseFloat(newProject.budget) || 0,
          spent: 0,
          currency: 'USD'
        }
      };

      await service.createProject(projectData);
      setShowCreateModal(false);
      setNewProject({
        title: '',
        description: '',
        objectives: '',
        methodology: '',
        startDate: '',
        endDate: '',
        budget: ''
      });
      loadProjects();
      Alert.alert('Success', 'Project created successfully');
    } catch (error) {
      console.error('Error creating project:', error);
      Alert.alert('Error', 'Failed to create project');
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.title) {
      Alert.alert('Error', 'Please enter a milestone title');
      return;
    }

    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new ProjectManagementService(userId);

      const milestoneData = {
        ...newMilestone,
        deliverables: newMilestone.deliverables.split('\n').filter(d => d.trim()),
        dueDate: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
      };

      await service.addMilestone(selectedProject.id, milestoneData);
      setShowMilestoneModal(false);
      setNewMilestone({ title: '', dueDate: '', deliverables: '' });
      loadProjects();
      Alert.alert('Success', 'Milestone added successfully');
    } catch (error) {
      console.error('Error adding milestone:', error);
      Alert.alert('Error', 'Failed to add milestone');
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new ProjectManagementService(userId);

      const taskData = {
        ...newTask,
        dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      };

      await service.addTask(selectedProject.id, taskData);
      setShowTaskModal(false);
      setNewTask({ title: '', assignedTo: '', dueDate: '', priority: 'medium' });
      loadProjects();
      Alert.alert('Success', 'Task added successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Error', 'Failed to add task');
    }
  };

  const handleAddRisk = async () => {
    if (!newRisk.description) {
      Alert.alert('Error', 'Please enter a risk description');
      return;
    }

    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new ProjectManagementService(userId);
      await service.addRisk(selectedProject.id, newRisk);
      setShowRiskModal(false);
      setNewRisk({ description: '', severity: 'medium', mitigation: '' });
      loadProjects();
      Alert.alert('Success', 'Risk added successfully');
    } catch (error) {
      console.error('Error adding risk:', error);
      Alert.alert('Error', 'Failed to add risk');
    }
  };

  const handleUpdateMilestoneStatus = async (milestoneId, status) => {
    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new ProjectManagementService(userId);
      await service.updateMilestoneStatus(selectedProject.id, milestoneId, status);
      loadProjects();
    } catch (error) {
      console.error('Error updating milestone:', error);
      Alert.alert('Error', 'Failed to update milestone status');
    }
  };

  const handleGenerateReport = async () => {
    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new ProjectManagementService(userId);
      const report = await service.generateReport(selectedProject.id);
      setProjectReport(report);
      setShowReportModal(true);
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report');
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#f44336',
      medium: '#ff9800',
      low: '#4caf50'
    };
    return colors[priority] || '#999';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      high: '#f44336',
      medium: '#ff9800',
      low: '#4caf50'
    };
    return colors[severity] || '#999';
  };

  const renderProjectCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.projectCard,
        selectedProject?.id === item.id && styles.projectCardActive
      ]}
      onPress={() => setSelectedProject(item)}
    >
      <Text style={styles.projectName}>{item.title}</Text>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${item.progress || 0}%` }]} />
        </View>
        <Text style={styles.progressText}>{item.progress || 0}%</Text>
      </View>
    </TouchableOpacity>
  );

  const renderMilestone = ({ item }) => (
    <View style={styles.milestoneCard}>
      <View style={styles.milestoneHeader}>
        <Text style={styles.milestoneTitle}>{item.title}</Text>
        <TouchableOpacity
          style={[
            styles.statusBadge,
            item.status === 'completed' ? styles.statusCompleted : styles.statusPending
          ]}
          onPress={() => handleUpdateMilestoneStatus(
            item.id,
            item.status === 'completed' ? 'pending' : 'completed'
          )}
        >
          <Text style={styles.statusText}>
            {item.status === 'completed' ? 'Done' : 'Pending'}
          </Text>
        </TouchableOpacity>
      </View>
      {item.dueDate && (
        <Text style={styles.milestoneDate}>
          Due: {new Date(item.dueDate).toLocaleDateString()}
        </Text>
      )}
      {item.deliverables?.length > 0 && (
        <View style={styles.deliverables}>
          {item.deliverables.map((d, index) => (
            <Text key={index} style={styles.deliverableText}>• {d}</Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderTask = ({ item }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>{item.priority?.toUpperCase()}</Text>
        </View>
      </View>
      {item.assignedTo && (
        <Text style={styles.taskMeta}>Assigned to: {item.assignedTo}</Text>
      )}
      {item.dueDate && (
        <Text style={styles.taskMeta}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
      )}
    </View>
  );

  const renderRisk = ({ item }) => (
    <View style={styles.riskCard}>
      <View style={styles.riskHeader}>
        <Text style={styles.riskDescription}>{item.description}</Text>
        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
          <Text style={styles.severityText}>{item.severity?.toUpperCase()}</Text>
        </View>
      </View>
      {item.mitigation && (
        <Text style={styles.mitigation}>Mitigation: {item.mitigation}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Research Projects</Text>
        <Text style={styles.headerSubtitle}>Manage and track research projects</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Projects</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={projects}
            renderItem={renderProjectCard}
            keyExtractor={(item) => item.id}
            refreshing={loading}
            onRefresh={loadProjects}
          />
        </View>

        <ScrollView style={styles.mainContent}>
          {selectedProject ? (
            <>
              <View style={styles.projectHeader}>
                <View>
                  <Text style={styles.projectTitle}>{selectedProject.title}</Text>
                  <Text style={styles.projectDescription}>{selectedProject.description}</Text>
                </View>
                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={handleGenerateReport}
                >
                  <Text style={styles.reportButtonText}>Generate Report</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.progressSection}>
                <Text style={styles.progressLabel}>Overall Progress</Text>
                <View style={styles.progressBarLarge}>
                  <View style={[styles.progressFillLarge, { width: `${selectedProject.progress || 0}%` }]} />
                </View>
                <Text style={styles.progressPercentage}>{selectedProject.progress || 0}%</Text>
              </View>

              <View style={styles.budgetSection}>
                <Text style={styles.sectionTitle}>Budget</Text>
                <View style={styles.budgetInfo}>
                  <Text style={styles.budgetText}>
                    Allocated: ${selectedProject.budget?.allocated || 0}
                  </Text>
                  <Text style={styles.budgetText}>
                    Spent: ${selectedProject.budget?.spent || 0}
                  </Text>
                  <Text style={styles.budgetText}>
                    Remaining: ${(selectedProject.budget?.allocated || 0) - (selectedProject.budget?.spent || 0)}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Milestones</Text>
                  <TouchableOpacity onPress={() => setShowMilestoneModal(true)}>
                    <Text style={styles.addButton}>+ Add Milestone</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={selectedProject.milestones || []}
                  renderItem={renderMilestone}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No milestones yet</Text>
                  }
                />
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Tasks</Text>
                  <TouchableOpacity onPress={() => setShowTaskModal(true)}>
                    <Text style={styles.addButton}>+ Add Task</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={selectedProject.tasks || []}
                  renderItem={renderTask}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No tasks yet</Text>
                  }
                />
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Risks</Text>
                  <TouchableOpacity onPress={() => setShowRiskModal(true)}>
                    <Text style={styles.addButton}>+ Add Risk</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={selectedProject.risks || []}
                  renderItem={renderRisk}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No risks identified</Text>
                  }
                />
              </View>
            </>
          ) : (
            <View style={styles.emptyProject}>
              <Text style={styles.emptyProjectText}>
                Select a project or create a new one
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Create Project Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Project</Text>

              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Project title"
                value={newProject.title}
                onChangeText={(text) => setNewProject({ ...newProject, title: text })}
              />

              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Project description"
                value={newProject.description}
                onChangeText={(text) => setNewProject({ ...newProject, description: text })}
                multiline
              />

              <Text style={styles.label}>Objectives (one per line)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Objective 1&#10;Objective 2&#10;Objective 3"
                value={newProject.objectives}
                onChangeText={(text) => setNewProject({ ...newProject, objectives: text })}
                multiline
              />

              <Text style={styles.label}>Methodology</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Research methodology"
                value={newProject.methodology}
                onChangeText={(text) => setNewProject({ ...newProject, methodology: text })}
                multiline
              />

              <Text style={styles.label}>Budget (USD)</Text>
              <TextInput
                style={styles.input}
                placeholder="10000"
                value={newProject.budget}
                onChangeText={(text) => setNewProject({ ...newProject, budget: text })}
                keyboardType="numeric"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleCreateProject}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                    Create
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Milestone Modal */}
      <Modal visible={showMilestoneModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>Add Milestone</Text>

            <TextInput
              style={styles.input}
              placeholder="Milestone title"
              value={newMilestone.title}
              onChangeText={(text) => setNewMilestone({ ...newMilestone, title: text })}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Deliverables (one per line)"
              value={newMilestone.deliverables}
              onChangeText={(text) => setNewMilestone({ ...newMilestone, deliverables: text })}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowMilestoneModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleAddMilestone}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal visible={showTaskModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>Add Task</Text>

            <TextInput
              style={styles.input}
              placeholder="Task title"
              value={newTask.title}
              onChangeText={(text) => setNewTask({ ...newTask, title: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Assigned to (User ID)"
              value={newTask.assignedTo}
              onChangeText={(text) => setNewTask({ ...newTask, assignedTo: text })}
            />

            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityButtons}>
              {['low', 'medium', 'high'].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityButton,
                    newTask.priority === priority && styles.priorityButtonActive,
                    { backgroundColor: newTask.priority === priority ? getPriorityColor(priority) : '#f5f5f5' }
                  ]}
                  onPress={() => setNewTask({ ...newTask, priority })}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    newTask.priority === priority && styles.priorityButtonTextActive
                  ]}>
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowTaskModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleAddTask}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Risk Modal */}
      <Modal visible={showRiskModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>Add Risk</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Risk description"
              value={newRisk.description}
              onChangeText={(text) => setNewRisk({ ...newRisk, description: text })}
              multiline
            />

            <Text style={styles.label}>Severity</Text>
            <View style={styles.priorityButtons}>
              {['low', 'medium', 'high'].map((severity) => (
                <TouchableOpacity
                  key={severity}
                  style={[
                    styles.priorityButton,
                    newRisk.severity === severity && styles.priorityButtonActive,
                    { backgroundColor: newRisk.severity === severity ? getSeverityColor(severity) : '#f5f5f5' }
                  ]}
                  onPress={() => setNewRisk({ ...newRisk, severity })}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    newRisk.severity === severity && styles.priorityButtonTextActive
                  ]}>
                    {severity}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Mitigation strategy"
              value={newRisk.mitigation}
              onChangeText={(text) => setNewRisk({ ...newRisk, mitigation: text })}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowRiskModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleAddRisk}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.reportHeader}>
                <Text style={styles.modalTitle}>Project Report</Text>
                <TouchableOpacity onPress={() => setShowReportModal(false)}>
                  <Text style={styles.closeButton}>Close</Text>
                </TouchableOpacity>
              </View>

              {projectReport && (
                <>
                  <Text style={styles.reportTitle}>{projectReport.title}</Text>
                  <Text style={styles.reportStatus}>Status: {projectReport.status}</Text>
                  <Text style={styles.reportProgress}>Progress: {projectReport.progress}%</Text>

                  <View style={styles.reportSection}>
                    <Text style={styles.reportSectionTitle}>Milestones</Text>
                    <Text style={styles.reportText}>Total: {projectReport.milestones?.total || 0}</Text>
                    <Text style={styles.reportText}>Completed: {projectReport.milestones?.completed || 0}</Text>
                    <Text style={styles.reportText}>Pending: {projectReport.milestones?.pending || 0}</Text>
                  </View>

                  <View style={styles.reportSection}>
                    <Text style={styles.reportSectionTitle}>Tasks</Text>
                    <Text style={styles.reportText}>Total: {projectReport.tasks?.total || 0}</Text>
                    <Text style={styles.reportText}>Completed: {projectReport.tasks?.completed || 0}</Text>
                  </View>

                  <View style={styles.reportSection}>
                    <Text style={styles.reportSectionTitle}>Risks</Text>
                    <Text style={styles.reportText}>Total: {projectReport.risks?.total || 0}</Text>
                    <Text style={styles.reportText}>High Severity: {projectReport.risks?.high || 0}</Text>
                    <Text style={styles.reportText}>Mitigated: {projectReport.risks?.mitigated || 0}</Text>
                  </View>

                  <View style={styles.reportSection}>
                    <Text style={styles.reportSectionTitle}>Budget</Text>
                    <Text style={styles.reportText}>
                      Allocated: ${projectReport.budget?.allocated || 0}
                    </Text>
                    <Text style={styles.reportText}>
                      Spent: ${projectReport.budget?.spent || 0}
                    </Text>
                    <Text style={styles.reportText}>
                      Remaining: ${(projectReport.budget?.allocated || 0) - (projectReport.budget?.spent || 0)}
                    </Text>
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
  content: {
    flex: 1,
    flexDirection: 'row'
  },
  sidebar: {
    width: 200,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0'
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  createButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center'
  },
  createButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold'
  },
  projectCard: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  projectCardActive: {
    backgroundColor: '#e8f5e9'
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2e7d32',
    borderRadius: 2
  },
  progressText: {
    fontSize: 11,
    color: '#666',
    fontWeight: 'bold',
    minWidth: 30
  },
  mainContent: {
    flex: 1,
    padding: 20
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  projectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  projectDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8
  },
  reportButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  reportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  progressSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10
  },
  progressBarLarge: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressFillLarge: {
    height: '100%',
    backgroundColor: '#2e7d32',
    borderRadius: 6
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
    textAlign: 'center'
  },
  budgetSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20
  },
  budgetInfo: {
    marginTop: 10
  },
  budgetText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6
  },
  section: {
    marginBottom: 25
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  addButton: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600'
  },
  milestoneCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  milestoneTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusCompleted: {
    backgroundColor: '#4caf50'
  },
  statusPending: {
    backgroundColor: '#ff9800'
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold'
  },
  milestoneDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8
  },
  deliverables: {
    marginTop: 6
  },
  deliverableText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  taskCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  taskMeta: {
    fontSize: 12,
    color: '#999'
  },
  riskCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  riskDescription: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 10
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  severityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  mitigation: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic'
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20
  },
  emptyProject: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyProjectText: {
    fontSize: 16,
    color: '#999'
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
  modalContentSmall: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
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
    marginBottom: 12,
    fontSize: 16
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  priorityButtons: {
    flexDirection: 'row',
    marginBottom: 15
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center'
  },
  priorityButtonActive: {
    // Background color set dynamically
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600'
  },
  priorityButtonTextActive: {
    color: 'white'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
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
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  closeButton: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: 'bold'
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  reportStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  reportProgress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20
  },
  reportSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  reportSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  reportText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  }
});
