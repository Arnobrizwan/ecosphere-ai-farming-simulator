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
import { CollaborationService } from '../../services/research/collaboration.service';
import { auth } from '../../services/firebase.config';

/**
 * UC51 - Collaborate with Researchers
 * Create/join workspaces, invite members, share notes/data, track tasks
 */
export default function CollaborationScreen({ navigation }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '' });
  const [newInvite, setNewInvite] = useState({ email: '', role: 'member' });
  const [newTask, setNewTask] = useState({ title: '', assignedTo: '', dueDate: '' });
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new CollaborationService(userId);
      const data = await service.getUserWorkspaces();
      setWorkspaces(data);
      if (data.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(data[0]);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
      Alert.alert('Error', 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name) {
      Alert.alert('Error', 'Please enter a workspace name');
      return;
    }

    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new CollaborationService(userId);
      await service.createWorkspace(newWorkspace);
      setShowCreateModal(false);
      setNewWorkspace({ name: '', description: '' });
      loadWorkspaces();
      Alert.alert('Success', 'Workspace created successfully');
    } catch (error) {
      console.error('Error creating workspace:', error);
      Alert.alert('Error', 'Failed to create workspace');
    }
  };

  const handleInviteMember = async () => {
    if (!newInvite.email) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new CollaborationService(userId);
      await service.inviteMember(selectedWorkspace.id, newInvite);
      setShowInviteModal(false);
      setNewInvite({ email: '', role: 'member' });
      loadWorkspaces();
      Alert.alert('Success', 'Invitation sent successfully');
    } catch (error) {
      console.error('Error inviting member:', error);
      Alert.alert('Error', 'Failed to send invitation');
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new CollaborationService(userId);
      await service.createTask(selectedWorkspace.id, newTask);
      setShowTaskModal(false);
      setNewTask({ title: '', assignedTo: '', dueDate: '' });
      loadWorkspaces();
      Alert.alert('Success', 'Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new CollaborationService(userId);
      await service.addNote(selectedWorkspace.id, { content: newNote });
      setNewNote('');
      loadWorkspaces();
      Alert.alert('Success', 'Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Failed to add note');
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const userId = auth.currentUser?.uid || 'demo_user';
      const service = new CollaborationService(userId);
      await service.updateTaskStatus(selectedWorkspace.id, taskId, newStatus);
      loadWorkspaces();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  const renderWorkspaceCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.workspaceCard,
        selectedWorkspace?.id === item.id && styles.workspaceCardActive
      ]}
      onPress={() => setSelectedWorkspace(item)}
    >
      <Text style={styles.workspaceName}>{item.name}</Text>
      <Text style={styles.workspaceMembers}>{item.members?.length || 0} members</Text>
    </TouchableOpacity>
  );

  const renderTask = ({ item }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <TouchableOpacity
          style={[
            styles.statusBadge,
            item.status === 'completed' ? styles.statusCompleted : styles.statusPending
          ]}
          onPress={() => handleUpdateTaskStatus(
            item.id,
            item.status === 'completed' ? 'todo' : 'completed'
          )}
        >
          <Text style={styles.statusText}>
            {item.status === 'completed' ? 'Done' : 'To Do'}
          </Text>
        </TouchableOpacity>
      </View>
      {item.assignedTo && (
        <Text style={styles.taskMeta}>Assigned to: {item.assignedTo}</Text>
      )}
      {item.dueDate && (
        <Text style={styles.taskMeta}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
      )}
    </View>
  );

  const renderNote = ({ item }) => (
    <View style={styles.noteCard}>
      <Text style={styles.noteContent}>{item.content}</Text>
      <Text style={styles.noteMeta}>
        {new Date(item.createdAt).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Collaboration</Text>
        <Text style={styles.headerSubtitle}>Research workspaces</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Workspaces</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={workspaces}
            renderItem={renderWorkspaceCard}
            keyExtractor={(item) => item.id}
            refreshing={loading}
            onRefresh={loadWorkspaces}
          />
        </View>

        <ScrollView style={styles.mainContent}>
          {selectedWorkspace ? (
            <>
              <View style={styles.workspaceHeader}>
                <Text style={styles.workspaceTitle}>{selectedWorkspace.name}</Text>
                <Text style={styles.workspaceDescription}>
                  {selectedWorkspace.description}
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Members</Text>
                  <TouchableOpacity onPress={() => setShowInviteModal(true)}>
                    <Text style={styles.addButton}>+ Invite</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.membersContainer}>
                  {selectedWorkspace.members?.map((member, index) => (
                    <View key={index} style={styles.memberChip}>
                      <Text style={styles.memberText}>
                        {member.userId} ({member.role})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Tasks</Text>
                  <TouchableOpacity onPress={() => setShowTaskModal(true)}>
                    <Text style={styles.addButton}>+ Add Task</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={selectedWorkspace.tasks || []}
                  renderItem={renderTask}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No tasks yet</Text>
                  }
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <View style={styles.noteInput}>
                  <TextInput
                    style={styles.noteTextInput}
                    placeholder="Add a note..."
                    value={newNote}
                    onChangeText={setNewNote}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.noteButton}
                    onPress={handleAddNote}
                  >
                    <Text style={styles.noteButtonText}>Post</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={selectedWorkspace.notes || []}
                  renderItem={renderNote}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No notes yet</Text>
                  }
                />
              </View>
            </>
          ) : (
            <View style={styles.emptyWorkspace}>
              <Text style={styles.emptyWorkspaceText}>
                Select a workspace or create a new one
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Create Workspace Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Workspace</Text>
            <TextInput
              style={styles.input}
              placeholder="Workspace Name"
              value={newWorkspace.name}
              onChangeText={(text) => setNewWorkspace({ ...newWorkspace, name: text })}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={newWorkspace.description}
              onChangeText={(text) => setNewWorkspace({ ...newWorkspace, description: text })}
              multiline
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
                onPress={handleCreateWorkspace}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite Member Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Member</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={newInvite.email}
              onChangeText={(text) => setNewInvite({ ...newInvite, email: text })}
              keyboardType="email-address"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowInviteModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleInviteMember}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Send Invite
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal visible={showTaskModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Task</Text>
            <TextInput
              style={styles.input}
              placeholder="Task Title"
              value={newTask.title}
              onChangeText={(text) => setNewTask({ ...newTask, title: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Assigned To (User ID)"
              value={newTask.assignedTo}
              onChangeText={(text) => setNewTask({ ...newTask, assignedTo: text })}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowTaskModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCreateTask}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>
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
  workspaceCard: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  workspaceCardActive: {
    backgroundColor: '#e8f5e9'
  },
  workspaceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  workspaceMembers: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  },
  mainContent: {
    flex: 1,
    padding: 20
  },
  workspaceHeader: {
    marginBottom: 20
  },
  workspaceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  workspaceDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8
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
  membersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  memberChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8
  },
  memberText: {
    fontSize: 12,
    color: '#1976d2'
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
    fontSize: 16,
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
    fontSize: 12,
    fontWeight: 'bold'
  },
  taskMeta: {
    fontSize: 12,
    color: '#999'
  },
  noteInput: {
    flexDirection: 'row',
    marginBottom: 12
  },
  noteTextInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    minHeight: 60
  },
  noteButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center'
  },
  noteButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  noteCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10
  },
  noteContent: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6
  },
  noteMeta: {
    fontSize: 12,
    color: '#999'
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20
  },
  emptyWorkspace: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyWorkspaceText: {
    fontSize: 16,
    color: '#999'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15
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
    minHeight: 80
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
  }
});
