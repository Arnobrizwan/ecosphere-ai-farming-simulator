import { ResearchDataService } from './researchData.service';
import { CollaborationService } from './collaboration.service';
import { PublicationService } from './publication.service';
import { AcademicResourcesService } from './academicResources.service';
import { ProjectManagementService } from './projectManagement.service';
import { DataExportService } from './dataExport.service';

/**
 * Research Hub - Central coordination for all research features
 * Manages UC50-UC55 research and academic features
 */
export class ResearchHub {
  constructor() {
    this.currentUserId = null;
    this.researchDataService = null;
    this.collaborationService = null;
    this.publicationService = null;
    this.academicResourcesService = null;
    this.projectManagementService = null;
    this.dataExportService = null;
  }

  /**
   * Initialize research hub for user
   */
  async initialize(userId) {
    this.currentUserId = userId;

    // Initialize all services
    this.researchDataService = new ResearchDataService(userId);
    this.collaborationService = new CollaborationService(userId);
    this.publicationService = new PublicationService(userId);
    this.academicResourcesService = new AcademicResourcesService(userId);
    this.projectManagementService = new ProjectManagementService(userId);
    this.dataExportService = new DataExportService(userId);

    console.log('Research Hub initialized for user:', userId);
  }

  /**
   * Get research dashboard
   */
  async getDashboard() {
    const [datasets, workspaces, publications, projects] = await Promise.all([
      this.researchDataService.getRecentDatasets(),
      this.collaborationService.getUserWorkspaces(),
      this.publicationService.getUserPublications(),
      this.projectManagementService.getUserProjects()
    ]);

    return {
      datasets,
      workspaces,
      publications,
      projects,
      timestamp: Date.now()
    };
  }

  /**
   * Get current user ID
   */
  getCurrentUserId() {
    return this.currentUserId;
  }
}

export default ResearchHub;
