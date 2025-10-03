import { db } from '../firebase.config';
import { collection, addDoc, updateDoc, query, where, getDocs, doc, arrayUnion } from 'firebase/firestore';

/**
 * Project Management Service (UC54) - Manage research projects
 */
export class ProjectManagementService {
  constructor(userId) {
    this.userId = userId;
    this.projectsCollection = collection(db, 'research_projects');
  }

  async createProject(projectData) {
    const project = {
      title: projectData.title,
      description: projectData.description,
      leadResearcherId: this.userId,
      teamMembers: projectData.teamMembers || [],
      objectives: projectData.objectives || [],
      methodology: projectData.methodology || '',
      timeline: projectData.timeline,
      milestones: [],
      tasks: [],
      risks: [],
      budget: projectData.budget || { allocated: 0, spent: 0, currency: 'USD' },
      status: 'planning',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const docRef = await addDoc(this.projectsCollection, project);

    return {
      id: docRef.id,
      ...project
    };
  }

  async addMilestone(projectId, milestoneData) {
    const milestone = {
      id: `milestone_${Date.now()}`,
      title: milestoneData.title,
      dueDate: milestoneData.dueDate,
      status: 'pending',
      deliverables: milestoneData.deliverables || [],
      createdAt: Date.now()
    };

    const projectRef = doc(db, 'research_projects', projectId);
    await updateDoc(projectRef, {
      milestones: arrayUnion(milestone),
      updatedAt: Date.now()
    });

    return milestone;
  }

  async updateMilestoneStatus(projectId, milestoneId, status) {
    const project = await this.getProject(projectId);
    const milestones = project.milestones.map(m =>
      m.id === milestoneId ? { ...m, status } : m
    );

    const projectRef = doc(db, 'research_projects', projectId);
    await updateDoc(projectRef, {
      milestones,
      updatedAt: Date.now()
    });

    // Update project progress
    await this.updateProgress(projectId);

    return { updated: true, milestoneId, status };
  }

  async addTask(projectId, taskData) {
    const task = {
      id: `task_${Date.now()}`,
      title: taskData.title,
      assignedTo: taskData.assignedTo,
      status: 'pending',
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate,
      createdAt: Date.now()
    };

    const projectRef = doc(db, 'research_projects', projectId);
    await updateDoc(projectRef, {
      tasks: arrayUnion(task),
      updatedAt: Date.now()
    });

    return task;
  }

  async addRisk(projectId, riskData) {
    const risk = {
      id: `risk_${Date.now()}`,
      description: riskData.description,
      severity: riskData.severity,
      mitigation: riskData.mitigation,
      status: 'identified',
      identifiedAt: Date.now()
    };

    const projectRef = doc(db, 'research_projects', projectId);
    await updateDoc(projectRef, {
      risks: arrayUnion(risk),
      updatedAt: Date.now()
    });

    return risk;
  }

  async updateProgress(projectId) {
    const project = await this.getProject(projectId);
    
    const completedMilestones = project.milestones.filter(m => m.status === 'completed').length;
    const totalMilestones = project.milestones.length;
    
    const progress = totalMilestones > 0 
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

    const projectRef = doc(db, 'research_projects', projectId);
    await updateDoc(projectRef, {
      progress,
      updatedAt: Date.now()
    });

    return progress;
  }

  async updateBudget(projectId, spent) {
    const project = await this.getProject(projectId);
    const newSpent = project.budget.spent + spent;

    const projectRef = doc(db, 'research_projects', projectId);
    await updateDoc(projectRef, {
      'budget.spent': newSpent,
      updatedAt: Date.now()
    });

    return {
      allocated: project.budget.allocated,
      spent: newSpent,
      remaining: project.budget.allocated - newSpent
    };
  }

  async generateReport(projectId) {
    const project = await this.getProject(projectId);

    const report = {
      projectId,
      title: project.title,
      status: project.status,
      progress: project.progress,
      timeline: {
        start: project.timeline.startDate,
        end: project.timeline.endDate,
        duration: project.timeline.endDate - project.timeline.startDate
      },
      milestones: {
        total: project.milestones.length,
        completed: project.milestones.filter(m => m.status === 'completed').length,
        pending: project.milestones.filter(m => m.status === 'pending').length
      },
      tasks: {
        total: project.tasks.length,
        completed: project.tasks.filter(t => t.status === 'completed').length
      },
      risks: {
        total: project.risks.length,
        high: project.risks.filter(r => r.severity === 'high').length,
        mitigated: project.risks.filter(r => r.status === 'mitigated').length
      },
      budget: project.budget,
      generatedAt: Date.now()
    };

    return report;
  }

  async getUserProjects() {
    const q = query(
      this.projectsCollection,
      where('leadResearcherId', '==', this.userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getProject(projectId) {
    const projects = await this.getUserProjects();
    return projects.find(p => p.id === projectId);
  }
}

export default ProjectManagementService;
