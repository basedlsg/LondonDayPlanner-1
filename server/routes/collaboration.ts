import { Router } from 'express';
import { z } from 'zod';
import { CollaborationService } from '../services/CollaborationService';
import { storage } from '../storage';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();
const collaborationService = new CollaborationService({ storage });

// Create a new collaboration for an itinerary
router.post('/itineraries/:id/share', requireAuth, async (req, res, next) => {
  try {
    const itineraryId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    const requestSchema = z.object({
      title: z.string().optional(),
      isPublic: z.boolean().optional(),
      allowEditing: z.boolean().optional(),
      allowComments: z.boolean().optional(),
      expiresInDays: z.number().optional(),
    });

    const { title, isPublic, allowEditing, allowComments, expiresInDays } = requestSchema.parse(req.body);
    
    // Calculate expiration date if provided
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const collaboration = await collaborationService.createCollaboration(
      itineraryId, 
      userId, 
      { title, isPublic, allowEditing, allowComments, expiresAt }
    );

    const shareUrl = collaborationService.generateShareUrl(
      collaboration.shareToken, 
      `${req.protocol}://${req.get('host')}`
    );

    res.json({
      collaboration,
      shareUrl,
      message: 'Collaboration created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Access a shared itinerary via share token
router.get('/collaborate/:shareToken', async (req, res, next) => {
  try {
    const { shareToken } = req.params;
    
    const collaboration = await collaborationService.getCollaborationByToken(shareToken);
    if (!collaboration) {
      return res.status(404).json({ error: 'Collaboration not found' });
    }

    // Check if expired
    if (collaborationService.isExpired(collaboration)) {
      return res.status(410).json({ error: 'Collaboration link has expired' });
    }

    // Get the itinerary
    const itinerary = await storage.getItinerary(collaboration.itineraryId);
    if (!itinerary) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }

    // Get collaborators and comments
    const collaborators = await collaborationService.getCollaborators(collaboration.id);
    const comments = await collaborationService.getComments(collaboration.itineraryId);
    const venueSummary = await collaborationService.getVenueSummary(collaboration.itineraryId);

    res.json({
      collaboration,
      itinerary,
      collaborators,
      comments,
      venueSummary,
    });
  } catch (error) {
    next(error);
  }
});

// Join a collaboration (for authenticated users)
router.post('/collaborate/:shareToken/join', requireAuth, async (req, res, next) => {
  try {
    const { shareToken } = req.params;
    const userId = req.user!.id;
    
    const collaboration = await collaborationService.getCollaborationByToken(shareToken);
    if (!collaboration) {
      return res.status(404).json({ error: 'Collaboration not found' });
    }

    // Check if expired
    if (collaborationService.isExpired(collaboration)) {
      return res.status(410).json({ error: 'Collaboration link has expired' });
    }

    // Add user as collaborator
    const collaborator = await collaborationService.addCollaborator(collaboration.id, {
      userId,
      role: 'collaborator'
    });

    res.json({
      collaborator,
      message: 'Successfully joined collaboration'
    });
  } catch (error) {
    next(error);
  }
});

// Add a comment to an itinerary
router.post('/collaborate/:shareToken/comments', async (req, res, next) => {
  try {
    const { shareToken } = req.params;
    
    const collaboration = await collaborationService.getCollaborationByToken(shareToken);
    if (!collaboration) {
      return res.status(404).json({ error: 'Collaboration not found' });
    }

    // Check permissions
    const userId = req.user?.id || null;
    const canComment = await collaborationService.checkPermission(collaboration.id, userId, 'comment');
    if (!canComment) {
      return res.status(403).json({ error: 'Not permitted to comment' });
    }

    const requestSchema = z.object({
      content: z.string().min(1),
      placeId: z.string().optional(),
      authorName: z.string().optional(), // For anonymous users
      type: z.enum(['comment', 'suggestion']).optional(),
      parentId: z.number().optional(),
    });

    const { content, placeId, authorName, type, parentId } = requestSchema.parse(req.body);

    const comment = await collaborationService.addComment(
      collaboration.itineraryId,
      collaboration.id,
      { userId, authorName, placeId, content, type, parentId }
    );

    res.json({
      comment,
      message: 'Comment added successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Vote on a venue
router.post('/collaborate/:shareToken/venues/:placeId/vote', async (req, res, next) => {
  try {
    const { shareToken, placeId } = req.params;
    
    const collaboration = await collaborationService.getCollaborationByToken(shareToken);
    if (!collaboration) {
      return res.status(404).json({ error: 'Collaboration not found' });
    }

    const requestSchema = z.object({
      vote: z.enum(['thumbs_up', 'thumbs_down', 'heart', 'star']),
    });

    const { vote } = requestSchema.parse(req.body);
    const userId = req.user?.id || null;

    const venueVote = await collaborationService.voteOnVenue(
      collaboration.id,
      collaboration.itineraryId,
      placeId,
      userId,
      vote
    );

    // Get updated vote summary
    const venueSummary = await collaborationService.getVenueSummary(collaboration.itineraryId);

    res.json({
      vote: venueVote,
      venueSummary,
      message: 'Vote recorded successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get comments for an itinerary
router.get('/collaborate/:shareToken/comments', async (req, res, next) => {
  try {
    const { shareToken } = req.params;
    
    const collaboration = await collaborationService.getCollaborationByToken(shareToken);
    if (!collaboration) {
      return res.status(404).json({ error: 'Collaboration not found' });
    }

    const comments = await collaborationService.getComments(collaboration.itineraryId);
    res.json({ comments });
  } catch (error) {
    next(error);
  }
});

export { router as collaborationRoutes };