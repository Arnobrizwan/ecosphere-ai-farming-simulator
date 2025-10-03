import { PostService } from './post.service';
import { KnowledgeService } from './knowledge.service';
import { ConnectionService } from './connection.service';
import { ExpertService } from './expert.service';
import { GroupService } from './group.service';
import { DiscussionService } from './discussion.service';
import { SuccessStoryService } from './successStory.service';

/**
 * Community Hub - Central coordination for all community features
 * Manages UC26-UC32 community platform
 */
export class CommunityHub {
  constructor() {
    this.currentUserId = null;
    this.postService = null;
    this.knowledgeService = null;
    this.connectionService = null;
    this.expertService = null;
    this.groupService = null;
    this.discussionService = null;
    this.successStoryService = null;
  }

  /**
   * Initialize community hub for user
   */
  async initialize(userId) {
    this.currentUserId = userId;

    // Initialize all services
    this.postService = new PostService(userId);
    this.knowledgeService = new KnowledgeService(userId);
    this.connectionService = new ConnectionService(userId);
    this.expertService = new ExpertService(userId);
    this.groupService = new GroupService(userId);
    this.discussionService = new DiscussionService(userId);
    this.successStoryService = new SuccessStoryService(userId);

    console.log('Community Hub initialized for user:', userId);
  }

  /**
   * Get user's community feed
   */
  async getFeed(options = {}) {
    const {
      page = 1,
      limit = 20,
      filter = 'all' // all, connections, groups
    } = options;

    let posts = [];

    if (filter === 'connections') {
      // Get posts from connections
      const connections = await this.connectionService.getConnections();
      const connectionIds = connections.map(c => c.userId);
      posts = await this.postService.getPostsByAuthors(connectionIds, { page, limit });
    } else if (filter === 'groups') {
      // Get posts from user's groups
      const groups = await this.groupService.getUserGroups();
      const groupIds = groups.map(g => g.id);
      posts = await this.postService.getPostsByGroups(groupIds, { page, limit });
    } else {
      // Get all public posts
      posts = await this.postService.getPublicPosts({ page, limit });
    }

    return posts;
  }

  /**
   * Get user's notifications
   */
  async getNotifications() {
    const notifications = [];

    // Connection requests
    const requests = await this.connectionService.getPendingRequests();
    requests.forEach(req => {
      notifications.push({
        type: 'connection_request',
        message: `${req.userName} sent you a connection request`,
        data: req,
        timestamp: req.createdAt
      });
    });

    // Group invitations
    const invitations = await this.groupService.getPendingInvitations();
    invitations.forEach(inv => {
      notifications.push({
        type: 'group_invitation',
        message: `You've been invited to join ${inv.groupName}`,
        data: inv,
        timestamp: inv.createdAt
      });
    });

    // Expert responses
    const consultations = await this.expertService.getConsultationUpdates();
    consultations.forEach(cons => {
      notifications.push({
        type: 'expert_response',
        message: `${cons.expertName} responded to your consultation`,
        data: cons,
        timestamp: cons.updatedAt
      });
    });

    // Sort by timestamp
    return notifications.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Search across community
   */
  async search(query, options = {}) {
    const {
      type = 'all', // all, posts, knowledge, users, groups
      filters = {}
    } = options;

    const results = {
      posts: [],
      knowledge: [],
      users: [],
      groups: []
    };

    if (type === 'all' || type === 'posts') {
      results.posts = await this.postService.searchPosts(query, filters);
    }

    if (type === 'all' || type === 'knowledge') {
      results.knowledge = await this.knowledgeService.searchResources(query, filters);
    }

    if (type === 'all' || type === 'users') {
      results.users = await this.connectionService.searchUsers(query, filters);
    }

    if (type === 'all' || type === 'groups') {
      results.groups = await this.groupService.searchGroups(query, filters);
    }

    return results;
  }

  /**
   * Get user's community statistics
   */
  async getStatistics() {
    const [
      postCount,
      connectionCount,
      groupCount,
      knowledgeCount,
      storyCount
    ] = await Promise.all([
      this.postService.getUserPostCount(),
      this.connectionService.getConnectionCount(),
      this.groupService.getUserGroupCount(),
      this.knowledgeService.getUserResourceCount(),
      this.successStoryService.getUserStoryCount()
    ]);

    return {
      posts: postCount,
      connections: connectionCount,
      groups: groupCount,
      knowledgeShared: knowledgeCount,
      successStories: storyCount
    };
  }

  /**
   * Get trending content
   */
  async getTrending(options = {}) {
    const { period = '7d', limit = 10 } = options;

    const [trendingPosts, trendingKnowledge, trendingStories] = await Promise.all([
      this.postService.getTrendingPosts({ period, limit }),
      this.knowledgeService.getTrendingResources({ period, limit }),
      this.successStoryService.getTrendingStories({ period, limit })
    ]);

    return {
      posts: trendingPosts,
      knowledge: trendingKnowledge,
      stories: trendingStories
    };
  }

  /**
   * Get current user ID
   */
  getCurrentUserId() {
    return this.currentUserId;
  }
}

export default CommunityHub;
