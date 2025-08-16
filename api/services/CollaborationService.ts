// @ts-nocheck
import crypto from 'crypto';
import { type IStorage } from '../storage';
import { 
  type Collaboration, 
  type InsertCollaboration,
  type Collaborator,
  type InsertCollaborator,
  type ItineraryComment,
  type InsertItineraryComment,
  type VenueVote,
  type InsertVenueVote,
  type Itinerary 
} from '../shared/schema';

export interface CollaborationServiceOptions {
  storage: IStorage;
}

export class CollaborationService {
  private storage: IStorage;

  constructor({ storage }: CollaborationServiceOptions) {
    this.storage = storage;
  }

  // Generate a unique share token
  private generateShareToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create a new collaboration for an itinerary
  async createCollaboration(
    itineraryId: number,
    ownerId: string,
    options: {
      title?: string;
      isPublic?: boolean;
      allowEditing?: boolean;
      allowComments?: boolean;
      expiresAt?: Date;
    } = {}
  ): Promise<Collaboration> {
    const shareToken = this.generateShareToken();
    
    const collaboration: InsertCollaboration = {
      itineraryId,
      ownerId,
      shareToken,
      title: options.title || `Shared Itinerary`,
      isPublic: options.isPublic || false,
      allowEditing: options.allowEditing !== false, // Default true
      allowComments: options.allowComments !== false, // Default true
      expiresAt: options.expiresAt || null,
    };

    return await this.storage.createCollaboration(collaboration);
  }

  // Get collaboration by share token
  async getCollaborationByToken(shareToken: string): Promise<Collaboration | null> {
    return await this.storage.getCollaborationByToken(shareToken);
  }

  // Add a collaborator to an existing collaboration
  async addCollaborator(
    collaborationId: number,
    userInfo: {
      userId?: string;
      email?: string;
      role?: 'owner' | 'editor' | 'viewer' | 'collaborator';
    }
  ): Promise<Collaborator> {
    const collaborator: InsertCollaborator = {
      collaborationId,
      userId: userInfo.userId || null,
      email: userInfo.email || null,
      role: userInfo.role || 'collaborator',
    };

    return await this.storage.createCollaborator(collaborator);
  }

  // Get all collaborators for a collaboration
  async getCollaborators(collaborationId: number): Promise<Collaborator[]> {
    return await this.storage.getCollaborators(collaborationId);
  }

  // Check if user has permission to perform an action
  async checkPermission(
    collaborationId: number,
    userId: string | null,
    action: 'view' | 'edit' | 'comment'
  ): Promise<boolean> {
    const collaboration = await this.storage.getCollaboration(collaborationId);
    if (!collaboration) return false;

    // Owner always has all permissions
    if (userId && collaboration.ownerId === userId) return true;

    // Check if collaboration allows the action
    switch (action) {
      case 'view':
        return true; // Anyone with link can view
      case 'edit':
        return collaboration.allowEditing;
      case 'comment':
        return collaboration.allowComments;
      default:
        return false;
    }
  }

  // Add a comment to an itinerary
  async addComment(
    itineraryId: number,
    collaborationId: number | null,
    comment: {
      userId?: string;
      authorName?: string;
      placeId?: string;
      content: string;
      type?: 'comment' | 'suggestion';
      parentId?: number;
    }
  ): Promise<ItineraryComment> {
    const newComment: InsertItineraryComment = {
      itineraryId,
      collaborationId: collaborationId || null,
      userId: comment.userId || null,
      authorName: comment.authorName || null,
      placeId: comment.placeId || null,
      content: comment.content,
      type: comment.type || 'comment',
      parentId: comment.parentId || null,
      votes: {},
    };

    return await this.storage.createComment(newComment);
  }

  // Get comments for an itinerary
  async getComments(itineraryId: number): Promise<ItineraryComment[]> {
    return await this.storage.getComments(itineraryId);
  }

  // Vote on a venue
  async voteOnVenue(
    collaborationId: number,
    itineraryId: number,
    placeId: string,
    userId: string | null,
    vote: 'thumbs_up' | 'thumbs_down' | 'heart' | 'star'
  ): Promise<VenueVote> {
    // Remove any existing vote by this user for this venue
    if (userId) {
      await this.storage.removeVenueVote(collaborationId, placeId, userId);
    }

    const venueVote: InsertVenueVote = {
      collaborationId,
      itineraryId,
      placeId,
      userId: userId || null,
      vote,
    };

    return await this.storage.createVenueVote(venueVote);
  }

  // Get vote summary for venues in an itinerary
  async getVenueSummary(itineraryId: number): Promise<Record<string, any>> {
    return await this.storage.getVenueSummary(itineraryId);
  }

  // Generate shareable URL
  generateShareUrl(shareToken: string, baseUrl: string): string {
    return `${baseUrl}/collaborate/${shareToken}`;
  }

  // Check if collaboration is expired
  isExpired(collaboration: Collaboration): boolean {
    if (!collaboration.expiresAt) return false;
    return new Date() > new Date(collaboration.expiresAt);
  }
}