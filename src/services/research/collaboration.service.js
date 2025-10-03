import { db } from '../firebase.config';
import { collection, addDoc, updateDoc, query, where, getDocs, doc, arrayUnion } from 'firebase/firestore';

/**
 * Collaboration Service (UC51) - Create/join research workspaces
 * Supports inviting members, sharing notes/data, tracking tasks
 */
export class CollaborationService {
  constructor(userId) {
    this.userId = userId;
    this.workspacesCollection = collection(db, 'research_workspaces');
    this.invitationsCollection = collection(db, 'workspace_invitations');
  }

  async createWorkspace(workspaceData) {
    const workspace = {
      name: workspaceData.name,
      description: workspaceData.description,
      ownerId: this.userId,
      members: [{
        userId: this.userId,
        role: 'owner',
        joinedAt: Date.now()
      }],
      notes: [],
      tasks: [],
      files: [],
      discussions: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const docRef = await addDoc(this.workspacesCollection, workspace);

    return {
      id: docRef.id,
      ...workspace
    };
  }

  async inviteMember(workspaceId, invitation) {
    const { email, role = 'member' } = invitation;

    // Find user by email (mock)
    const invitedUserId = `user_${email.split('@')[0]}`;

    const workspaceRef = doc(db, 'research_workspaces', workspaceId);
    
    await updateDoc(workspaceRef, {
      members: arrayUnion({
        userId: invitedUserId,
        role,
        joinedAt: Date.now()
      }),
      updatedAt: Date.now()
    });

    // Send invitation notification
    console.log(`Invitation sent to ${email}`);

    return {
      invited: true,
      userId: invitedUserId,
      role
    };
  }

  async addNote(workspaceId, noteData) {
    const note = {
      id: `note_${Date.now()}`,
      authorId: this.userId,
      content: noteData.content,
      attachments: noteData.attachments || [],
      createdAt: Date.now()
    };

    const workspaceRef = doc(db, 'research_workspaces', workspaceId);
    
    await updateDoc(workspaceRef, {
      notes: arrayUnion(note),
      updatedAt: Date.now()
    });

    return note;
  }

  async createTask(workspaceId, taskData) {
    const task = {
      id: `task_${Date.now()}`,
      title: taskData.title,
      assignedTo: taskData.assignedTo,
      status: 'todo',
      dueDate: taskData.dueDate,
      createdAt: Date.now()
    };

    const workspaceRef = doc(db, 'research_workspaces', workspaceId);
    
    await updateDoc(workspaceRef, {
      tasks: arrayUnion(task),
      updatedAt: Date.now()
    });

    return task;
  }

  async updateTaskStatus(workspaceId, taskId, status) {
    const workspace = await this.getWorkspace(workspaceId);
    const tasks = workspace.tasks.map(task => 
      task.id === taskId ? { ...task, status } : task
    );

    const workspaceRef = doc(db, 'research_workspaces', workspaceId);
    await updateDoc(workspaceRef, {
      tasks,
      updatedAt: Date.now()
    });

    return { updated: true, taskId, status };
  }

  async shareFile(workspaceId, fileData) {
    const file = {
      id: `file_${Date.now()}`,
      name: fileData.name,
      url: fileData.url,
      uploadedBy: this.userId,
      uploadedAt: Date.now()
    };

    const workspaceRef = doc(db, 'research_workspaces', workspaceId);
    
    await updateDoc(workspaceRef, {
      files: arrayUnion(file),
      updatedAt: Date.now()
    });

    return file;
  }

  async startDiscussion(workspaceId, topic) {
    const discussion = {
      id: `discussion_${Date.now()}`,
      topic,
      messages: [],
      createdBy: this.userId,
      createdAt: Date.now()
    };

    const workspaceRef = doc(db, 'research_workspaces', workspaceId);
    
    await updateDoc(workspaceRef, {
      discussions: arrayUnion(discussion),
      updatedAt: Date.now()
    });

    return discussion;
  }

  async getUserWorkspaces() {
    const q = query(
      this.workspacesCollection,
      where('members', 'array-contains', { userId: this.userId })
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getWorkspace(workspaceId) {
    const workspaces = await this.getUserWorkspaces();
    return workspaces.find(ws => ws.id === workspaceId);
  }

  async joinWorkspace(invitationId) {
    // Accept invitation and join workspace
    const invitations = await getDocs(
      query(this.invitationsCollection, where('id', '==', invitationId))
    );

    if (!invitations.empty) {
      const invitation = invitations.docs[0].data();
      const workspaceRef = doc(db, 'research_workspaces', invitation.workspaceId);

      await updateDoc(workspaceRef, {
        members: arrayUnion({
          userId: this.userId,
          role: invitation.role || 'member',
          joinedAt: Date.now()
        }),
        updatedAt: Date.now()
      });

      return { joined: true, workspaceId: invitation.workspaceId };
    }

    return { joined: false, error: 'Invitation not found' };
  }

  async getWorkspaceActivity(workspaceId) {
    const workspace = await this.getWorkspace(workspaceId);

    // Combine all activities
    const activities = [];

    workspace.notes.forEach(note => {
      activities.push({
        type: 'note',
        timestamp: note.createdAt,
        userId: note.authorId,
        content: note.content
      });
    });

    workspace.files.forEach(file => {
      activities.push({
        type: 'file',
        timestamp: file.uploadedAt,
        userId: file.uploadedBy,
        name: file.name
      });
    });

    workspace.tasks.forEach(task => {
      activities.push({
        type: 'task',
        timestamp: task.createdAt,
        title: task.title,
        status: task.status
      });
    });

    // Sort by most recent
    activities.sort((a, b) => b.timestamp - a.timestamp);

    return activities.slice(0, 20);
  }
}

export default CollaborationService;
