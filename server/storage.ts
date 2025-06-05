import { 
  type Place, 
  type InsertPlace, 
  type Itinerary, 
  type InsertItinerary, 
  type UserItinerary,
  type Trip,
  type InsertTrip,
  type TripDay,
  type InsertTripDay,
  type Collaboration,
  type InsertCollaboration,
  type Collaborator,
  type InsertCollaborator,
  type ItineraryComment,
  type InsertItineraryComment,
  type VenueVote,
  type InsertVenueVote,
} from "@shared/schema";
import { db } from './db';
import { itineraries, places, userItineraries, trips, tripDays, collaborations, collaborators, itineraryComments, venueVotes } from '@shared/schema';
import { eq, desc, or, sql } from 'drizzle-orm';
import { dbOptimizer } from './lib/dbOptimizer';

// Configure in-memory fallback for development
const USE_IN_MEMORY_FALLBACK = process.env.NODE_ENV === 'development';
const inMemoryStorage = {
  places: new Map<string, Place>(),
  itineraries: new Map<number, Itinerary>(),
  userItineraries: new Map<string, number[]>(),
  nextPlaceId: 1,
  nextItineraryId: 1
};

export interface IStorage {
  // Place operations
  getPlace(placeId: string): Promise<Place | undefined>;
  getPlaceByPlaceId(placeId: string): Promise<Place | undefined>;
  createPlace(place: InsertPlace): Promise<Place>;
  
  // Itinerary operations
  createItinerary(itinerary: InsertItinerary, anonymousIdentifier?: string): Promise<Itinerary>;
  getItinerary(id: number): Promise<Itinerary | undefined>;
  getUserItineraries(anonymousIdentifier: string): Promise<Itinerary[]>;
  
  // Trip operations
  createTrip(trip: InsertTrip): Promise<Trip>;
  getTrip(id: number): Promise<Trip | undefined>;
  createTripDay(tripDay: InsertTripDay): Promise<TripDay>;
  getTripDays(tripId: number): Promise<TripDay[]>;
  
  // Collaboration operations
  createCollaboration(collaboration: InsertCollaboration): Promise<Collaboration>;
  getCollaboration(id: number): Promise<Collaboration | undefined>;
  getCollaborationByToken(shareToken: string): Promise<Collaboration | undefined>;
  createCollaborator(collaborator: InsertCollaborator): Promise<Collaborator>;
  getCollaborators(collaborationId: number): Promise<Collaborator[]>;
  createComment(comment: InsertItineraryComment): Promise<ItineraryComment>;
  getComments(itineraryId: number): Promise<ItineraryComment[]>;
  createVenueVote(vote: InsertVenueVote): Promise<VenueVote>;
  removeVenueVote(collaborationId: number, placeId: string, userId: string): Promise<void>;
  getVenueSummary(itineraryId: number): Promise<Record<string, any>>;
}

// Database-backed storage implementation
export class DbStorage implements IStorage {
  async getPlace(placeId: string): Promise<Place | undefined> {
    return await dbOptimizer.monitorQuery(
      'getPlace',
      async () => {
        const results = await db.select().from(places).where(eq(places.placeId, placeId)).limit(1);
        return results.length > 0 ? results[0] : undefined;
      },
      1
    );
  }
  
  // This method is an alias to getPlace for better semantic meaning and compatibility
  async getPlaceByPlaceId(placeId: string): Promise<Place | undefined> {
    return this.getPlace(placeId);
  }

  async createPlace(insertPlace: InsertPlace): Promise<Place> {
    try {
      const existingPlace = await db.select().from(places).where(eq(places.placeId, insertPlace.placeId)).limit(1);
      if (existingPlace.length > 0) {
        const existing = existingPlace[0];
        // If existing place lacks details but we have new details, update it
        if ((!existing.details || Object.keys(existing.details).length === 0) && insertPlace.details) {
          console.log(`🔄 [DB] Updating existing place "${insertPlace.name}" with missing details`);
          try {
            const [updatedPlace] = await db.update(places)
              .set({ 
                details: insertPlace.details,
                alternatives: insertPlace.alternatives
              })
              .where(eq(places.placeId, insertPlace.placeId))
              .returning();
            return updatedPlace;
          } catch (updateError) {
            console.warn(`⚠️ [DB] Failed to update place details:`, updateError);
          }
        }
        return existing;
      }
      const [place] = await db.insert(places).values(insertPlace).returning();
      return place;
    } catch (error: any) {
      if (error.code === '23505') { 
        const existingPlace = await db.select().from(places).where(eq(places.placeId, insertPlace.placeId)).limit(1);
        if (existingPlace.length > 0) {
          const existing = existingPlace[0];
          // If existing place lacks details but we have new details, update it
          if ((!existing.details || Object.keys(existing.details).length === 0) && insertPlace.details) {
            try {
              const [updatedPlace] = await db.update(places)
                .set({ 
                  details: insertPlace.details,
                  alternatives: insertPlace.alternatives
                })
                .where(eq(places.placeId, insertPlace.placeId))
                .returning();
              return updatedPlace;
            } catch (updateError) {
              console.warn(`⚠️ [DB] Failed to update place details in catch:`, updateError);
            }
          }
          return existing;
        }
      }
      throw error;
    }
  }

  async createItinerary(insertItinerary: InsertItinerary, anonymousIdentifier?: string): Promise<Itinerary> {
    // Neon HTTP driver doesn't support transactions, so we'll do sequential operations
    try {
      const valuesToInsert = {
        ...insertItinerary,
        title: insertItinerary.title ?? null,
        description: insertItinerary.description ?? null,
        planDate: insertItinerary.planDate ? new Date(insertItinerary.planDate) : null,
      };
      const [itinerary] = await db.insert(itineraries)
        .values(valuesToInsert)
        .returning();
      
      if (anonymousIdentifier) {
        await db.insert(userItineraries)
          .values({
            userId: anonymousIdentifier as any, // UUID type
            itineraryId: itinerary.id
          });
      }
      return itinerary;
    } catch (error) {
      // If the second insert fails, we should ideally rollback the first
      // but without transactions, we'll just throw the error
      throw error;
    }
  }

  async getItinerary(id: number): Promise<Itinerary | undefined> {
    const results = await db.select().from(itineraries).where(eq(itineraries.id, id)).limit(1);
    return results.length > 0 ? results[0] : undefined;
  }
  
  async getUserItineraries(anonymousIdentifier: string): Promise<Itinerary[]> {
    const userItineraryAssociations = await db.select({ itineraryId: userItineraries.itineraryId })
      .from(userItineraries)
      .where(eq(userItineraries.userId, anonymousIdentifier as any));
    
    const itineraryIds = userItineraryAssociations.map(assoc => assoc.itineraryId);
    if (itineraryIds.length === 0) return [];
    
    // Ensure all fields for Itinerary type are selected
    return await db.select({
      id: itineraries.id,
      title: itineraries.title,
      description: itineraries.description,
      planDate: itineraries.planDate,
      query: itineraries.query,
      places: itineraries.places,
      travelTimes: itineraries.travelTimes,
      created: itineraries.created
    })
      .from(itineraries)
      .where(or(...itineraryIds.map(id => eq(itineraries.id, id))))
      .orderBy(desc(itineraries.created));
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const [trip] = await db.insert(trips).values(insertTrip).returning();
    return trip;
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    const results = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
    return results.length > 0 ? results[0] : undefined;
  }

  async createTripDay(insertTripDay: InsertTripDay): Promise<TripDay> {
    const [tripDay] = await db.insert(tripDays).values(insertTripDay).returning();
    return tripDay;
  }

  async getTripDays(tripId: number): Promise<TripDay[]> {
    return await db.select()
      .from(tripDays)
      .where(eq(tripDays.tripId, tripId))
      .orderBy(tripDays.dayNumber);
  }

  // Collaboration methods
  async createCollaboration(collaboration: InsertCollaboration): Promise<Collaboration> {
    const [result] = await db.insert(collaborations).values(collaboration).returning();
    return result;
  }

  async getCollaboration(id: number): Promise<Collaboration | undefined> {
    const results = await db.select().from(collaborations).where(eq(collaborations.id, id)).limit(1);
    return results.length > 0 ? results[0] : undefined;
  }

  async getCollaborationByToken(shareToken: string): Promise<Collaboration | undefined> {
    const results = await db.select().from(collaborations).where(eq(collaborations.shareToken, shareToken)).limit(1);
    return results.length > 0 ? results[0] : undefined;
  }

  async createCollaborator(collaborator: InsertCollaborator): Promise<Collaborator> {
    const [result] = await db.insert(collaborators).values(collaborator).returning();
    return result;
  }

  async getCollaborators(collaborationId: number): Promise<Collaborator[]> {
    return await db.select()
      .from(collaborators)
      .where(eq(collaborators.collaborationId, collaborationId))
      .orderBy(collaborators.created);
  }

  async createComment(comment: InsertItineraryComment): Promise<ItineraryComment> {
    const [result] = await db.insert(itineraryComments).values(comment).returning();
    return result;
  }

  async getComments(itineraryId: number): Promise<ItineraryComment[]> {
    return await db.select()
      .from(itineraryComments)
      .where(eq(itineraryComments.itineraryId, itineraryId))
      .orderBy(itineraryComments.created);
  }

  async createVenueVote(vote: InsertVenueVote): Promise<VenueVote> {
    const [result] = await db.insert(venueVotes).values(vote).returning();
    return result;
  }

  async removeVenueVote(collaborationId: number, placeId: string, userId: string): Promise<void> {
    await db.delete(venueVotes)
      .where(
        sql`${venueVotes.collaborationId} = ${collaborationId} AND ${venueVotes.placeId} = ${placeId} AND ${venueVotes.userId} = ${userId}`
      );
  }

  async getVenueSummary(itineraryId: number): Promise<Record<string, any>> {
    // This would typically be a more complex query aggregating votes by venue
    // For now, return a simple structure
    const votes = await db.select()
      .from(venueVotes)
      .where(eq(venueVotes.itineraryId, itineraryId));
      
    const summary: Record<string, any> = {};
    votes.forEach(vote => {
      if (!summary[vote.placeId]) {
        summary[vote.placeId] = { thumbs_up: 0, thumbs_down: 0, heart: 0, star: 0 };
      }
      summary[vote.placeId][vote.vote]++;
    });
    
    return summary;
  }
}

// Memory-based storage implementation for compatibility
export class MemStorage implements IStorage {
  private places: Map<string, Place>;
  private itineraries: Map<number, Itinerary>;
  private userItineraryMap: Map<string, number[]>;
  private currentPlaceId: number;
  private currentItineraryId: number;

  constructor() {
    this.places = new Map();
    this.itineraries = new Map();
    this.userItineraryMap = new Map();
    this.currentPlaceId = 1;
    this.currentItineraryId = 1;
  }

  async getPlace(placeId: string): Promise<Place | undefined> {
    return this.places.get(placeId);
  }
  
  // This method is an alias to getPlace for better semantic meaning and compatibility
  async getPlaceByPlaceId(placeId: string): Promise<Place | undefined> {
    return this.getPlace(placeId);
  }

  async createPlace(insertPlace: InsertPlace): Promise<Place> {
    // Check if place already exists
    const existingPlace = this.places.get(insertPlace.placeId);
    if (existingPlace) {
      console.log(`🔍 [MEM] Existing place "${insertPlace.name}" details check:`, {
        hasDetails: !!existingPlace.details,
        detailsType: typeof existingPlace.details,
        detailsKeys: existingPlace.details ? Object.keys(existingPlace.details) : [],
        rating: existingPlace.details?.rating,
        types: existingPlace.details?.types
      });
      
      // If existing place lacks details but we have new details, update it
      if ((!existingPlace.details || Object.keys(existingPlace.details).length === 0) && insertPlace.details) {
        console.log(`🔄 [MEM] Updating existing place "${insertPlace.name}" with missing details`);
        const updatedPlace: Place = {
          ...existingPlace,
          details: insertPlace.details,
          alternatives: insertPlace.alternatives ?? existingPlace.alternatives
        };
        this.places.set(insertPlace.placeId, updatedPlace);
        console.log(`✅ [MEM] Successfully updated place details for "${insertPlace.name}"`);
        return updatedPlace;
      }
      
      console.log(`Place "${insertPlace.name}" already exists, returning existing record`);
      return existingPlace;
    }
    
    const id = this.currentPlaceId++;
    const place: Place = {
      ...insertPlace,
      id,
      scheduledTime: insertPlace.scheduledTime ?? null,
      alternatives: insertPlace.alternatives ?? null
    };
    this.places.set(insertPlace.placeId, place);
    console.log(`🆕 [MEM] Created new place "${insertPlace.name}" with details`);
    return place;
  }

  async createItinerary(insertItinerary: InsertItinerary, anonymousIdentifier?: string): Promise<Itinerary> {
    const id = this.currentItineraryId++;
    const itinerary: Itinerary = {
      ...insertItinerary,
      id,
      title: insertItinerary.title ?? null,
      description: insertItinerary.description ?? null,
      planDate: insertItinerary.planDate ? new Date(insertItinerary.planDate) : null,
      created: new Date(),
    };
    this.itineraries.set(id, itinerary);
    
    // If anonymousIdentifier provided, associate with user
    if (anonymousIdentifier) {
      console.log(`MemStorage: Associating itinerary #${id} with identifier ${anonymousIdentifier}`);
      const userItinerariesList = this.userItineraryMap.get(anonymousIdentifier) || [];
      userItinerariesList.push(id);
      this.userItineraryMap.set(anonymousIdentifier, userItinerariesList);
      console.log(`MemStorage: Identifier ${anonymousIdentifier} now has ${userItinerariesList.length} itineraries`);
    } else {
      console.log(`MemStorage: Created anonymous itinerary #${id} (no identifier association)`);
    }
    
    return itinerary;
  }

  async getItinerary(id: number): Promise<Itinerary | undefined> {
    return this.itineraries.get(id);
  }
  
  async getUserItineraries(anonymousIdentifier: string): Promise<Itinerary[]> {
    console.log(`MemStorage: Getting itineraries for identifier ${anonymousIdentifier}`);
    const itineraryIds = this.userItineraryMap.get(anonymousIdentifier) || [];
    console.log(`MemStorage: Found ${itineraryIds.length} itinerary IDs for identifier ${anonymousIdentifier}: ${JSON.stringify(itineraryIds)}`);
    
    // Debug all itineraries in memory (optional)
    // console.log(`MemStorage: Total itineraries in memory: ${this.itineraries.size}`);
    
    const userItinerariesResult = itineraryIds
      .map(id => this.itineraries.get(id))
      .filter((itinerary): itinerary is Itinerary => itinerary !== undefined)
      .sort((a, b) => b.created.getTime() - a.created.getTime());
    
    console.log(`MemStorage: Returning ${userItinerariesResult.length} itineraries for identifier ${anonymousIdentifier}`);
    return userItinerariesResult;
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    // For MemStorage, we'll just return a mock trip object
    const trip: Trip = {
      id: this.currentItineraryId++,
      userId: insertTrip.userId || null,
      title: insertTrip.title,
      city: insertTrip.city,
      startDate: insertTrip.startDate,
      endDate: insertTrip.endDate,
      totalDays: insertTrip.totalDays,
      accommodations: insertTrip.accommodations || [],
      created: new Date()
    };
    return trip;
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    // MemStorage doesn't actually store trips, return undefined
    return undefined;
  }

  async createTripDay(insertTripDay: InsertTripDay): Promise<TripDay> {
    // For MemStorage, return a mock trip day
    const tripDay: TripDay = {
      id: this.currentItineraryId++,
      tripId: insertTripDay.tripId,
      dayNumber: insertTripDay.dayNumber,
      date: insertTripDay.date,
      itineraryId: insertTripDay.itineraryId,
      created: new Date()
    };
    return tripDay;
  }

  async getTripDays(tripId: number): Promise<TripDay[]> {
    // MemStorage doesn't actually store trip days, return empty array
    return [];
  }

  // Collaboration methods (MemStorage stubs)
  async createCollaboration(collaboration: InsertCollaboration): Promise<Collaboration> {
    throw new Error('Collaboration not supported in memory storage');
  }

  async getCollaboration(id: number): Promise<Collaboration | undefined> {
    return undefined;
  }

  async getCollaborationByToken(shareToken: string): Promise<Collaboration | undefined> {
    return undefined;
  }

  async createCollaborator(collaborator: InsertCollaborator): Promise<Collaborator> {
    throw new Error('Collaboration not supported in memory storage');
  }

  async getCollaborators(collaborationId: number): Promise<Collaborator[]> {
    return [];
  }

  async createComment(comment: InsertItineraryComment): Promise<ItineraryComment> {
    throw new Error('Comments not supported in memory storage');
  }

  async getComments(itineraryId: number): Promise<ItineraryComment[]> {
    return [];
  }

  async createVenueVote(vote: InsertVenueVote): Promise<VenueVote> {
    throw new Error('Voting not supported in memory storage');
  }

  async removeVenueVote(collaborationId: number, placeId: string, userId: string): Promise<void> {
    // No-op for memory storage
  }

  async getVenueSummary(itineraryId: number): Promise<Record<string, any>> {
    return {};
  }
}

// Add debug logging to the DbStorage implementation
// With fallback to in-memory storage when database operations fail in development
export class DbStorageWithLogging extends DbStorage {
  async createPlace(insertPlace: InsertPlace): Promise<Place> {
    try {
      // First try to see if this is a duplicate place
      if (insertPlace.placeId) {
        try {
          // Check if this place already exists by placeId
          const existingPlace = await db.select()
            .from(places)
            .where(eq(places.placeId, insertPlace.placeId))
            .limit(1);
          
          // If place already exists, check if it has proper details
          if (existingPlace.length > 0) {
            const existing = existingPlace[0];
            console.log(`🔍 [STORAGE] Existing place "${insertPlace.name}" details check:`, {
              hasDetails: !!existing.details,
              detailsType: typeof existing.details,
              detailsKeys: existing.details ? Object.keys(existing.details) : [],
              rating: existing.details?.rating,
              types: existing.details?.types
            });
            
            // If existing place lacks details but we have new details, update it
            if ((!existing.details || Object.keys(existing.details).length === 0) && insertPlace.details) {
              console.log(`🔄 [STORAGE] Updating existing place "${insertPlace.name}" with missing details`);
              try {
                const [updatedPlace] = await db.update(places)
                  .set({ 
                    details: insertPlace.details,
                    alternatives: insertPlace.alternatives
                  })
                  .where(eq(places.placeId, insertPlace.placeId))
                  .returning();
                console.log(`✅ [STORAGE] Successfully updated place details for "${insertPlace.name}"`);
                return updatedPlace;
              } catch (updateError) {
                console.warn(`⚠️ [STORAGE] Failed to update place details for "${insertPlace.name}":`, updateError);
                // Fall back to returning existing place even without details
              }
            }
            
            console.log(`Place "${insertPlace.name}" already exists, returning existing record`);
            return existing;
          }
        } catch (checkError) {
          console.warn("Error checking for existing place:", checkError);
          // Continue to creating the place
        }
      }
      
      // If we reach here, try creating the place
      const result = await super.createPlace(insertPlace);
      return result;
    } catch (error: any) {
      // Special handling for duplicate key errors
      if (error.code === '23505') { // PostgreSQL duplicate key error
        try {
          console.log(`Handling duplicate key error for place "${insertPlace.name}"`);
          // Retrieve the existing place
          const existingPlace = await db.select()
            .from(places)
            .where(eq(places.placeId, insertPlace.placeId))
            .limit(1);
          
          if (existingPlace.length > 0) {
            console.log(`Recovered existing place "${insertPlace.name}" after duplicate key error`);
            return existingPlace[0];
          }
        } catch (innerError) {
          console.error("Error retrieving existing place:", innerError);
        }
      }
      
      // Fall back to in-memory storage if enabled
      if (USE_IN_MEMORY_FALLBACK) {
        console.warn("Database error in createPlace, using in-memory fallback:", error.message);
        
        // Use in-memory storage as fallback
        const id = inMemoryStorage.nextPlaceId || 1;
        inMemoryStorage.nextPlaceId = (inMemoryStorage.nextPlaceId || 1) + 1;
        
        // Check if place already exists in memory and update details if needed
        const existingPlace = inMemoryStorage.places.get(insertPlace.placeId);
        if (existingPlace) {
          console.log(`🔍 [MEM-FALLBACK] Existing place "${insertPlace.name}" details check:`, {
            hasDetails: !!existingPlace.details,
            detailsType: typeof existingPlace.details,
            detailsKeys: existingPlace.details ? Object.keys(existingPlace.details) : [],
            rating: existingPlace.details?.rating,
            types: existingPlace.details?.types
          });
          
          // If existing place lacks details but we have new details, update it
          if ((!existingPlace.details || Object.keys(existingPlace.details).length === 0) && insertPlace.details) {
            console.log(`🔄 [MEM-FALLBACK] Updating existing place "${insertPlace.name}" with missing details`);
            const updatedPlace: Place = {
              ...existingPlace,
              details: insertPlace.details,
              alternatives: insertPlace.alternatives ?? existingPlace.alternatives
            };
            inMemoryStorage.places.set(insertPlace.placeId, updatedPlace);
            console.log(`✅ [MEM-FALLBACK] Successfully updated place details for "${insertPlace.name}"`);
            return updatedPlace;
          }
          
          console.log(`Place "${insertPlace.name}" already exists, returning existing record`);
          return existingPlace;
        }

        const place: Place = {
          ...insertPlace,
          id,
          scheduledTime: insertPlace.scheduledTime || null,
          alternatives: insertPlace.alternatives || null
        };
        inMemoryStorage.places.set(insertPlace.placeId, place);
        console.log(`🆕 [MEM-FALLBACK] Created new place "${insertPlace.name}" with details`);
        return place;
      }
      throw error;
    }
  }
  
  async getPlace(placeId: string): Promise<Place | undefined> {
    try {
      return await super.getPlace(placeId);
    } catch (error: any) {
      if (USE_IN_MEMORY_FALLBACK) {
        console.warn("Database error in getPlace, using in-memory fallback:", error.message);
        return inMemoryStorage.places.get(placeId);
      }
      throw error;
    }
  }
  
  async getPlaceByPlaceId(placeId: string): Promise<Place | undefined> {
    try {
      return await super.getPlaceByPlaceId(placeId);
    } catch (error: any) {
      if (USE_IN_MEMORY_FALLBACK) {
        console.warn("Database error in getPlaceByPlaceId, using in-memory fallback:", error.message);
        return inMemoryStorage.places.get(placeId);
      }
      throw error;
    }
  }

  async createItinerary(insertItinerary: InsertItinerary, anonymousIdentifier?: string): Promise<Itinerary> {
    console.log(`DbStorage (with logging): Creating itinerary ${anonymousIdentifier ? 'for identifier ' + anonymousIdentifier : '(anonymous)'}`);
    try {
      // Ensure values are compatible with DB schema (nulls for optionals, Date for timestamp)
      const valuesToInsert = {
        ...insertItinerary,
        title: insertItinerary.title ?? null,
        description: insertItinerary.description ?? null,
        planDate: insertItinerary.planDate ? new Date(insertItinerary.planDate) : null,
      };
      // Call super.createItinerary with the processed values. 
      // However, super.createItinerary itself will do this processing again. 
      // It's better to rely on the base class method to handle the conversion.
      const result = await super.createItinerary(insertItinerary, anonymousIdentifier); 
      console.log(`DbStorage (with logging): Created itinerary #${result.id} successfully`);
      return result;
    } catch (error: any) {
      console.error(`DbStorage (with logging): Error creating itinerary:`, error);
      if (USE_IN_MEMORY_FALLBACK) {
        console.warn("Using in-memory fallback for createItinerary due to database error");
        const id = inMemoryStorage.nextItineraryId++;
        const itinerary: Itinerary = {
          ...insertItinerary,
          id,
          title: insertItinerary.title ?? null,
          description: insertItinerary.description ?? null,
          planDate: insertItinerary.planDate ? new Date(insertItinerary.planDate) : null,
          created: new Date()
        };
        inMemoryStorage.itineraries.set(id, itinerary);
        if (anonymousIdentifier) {
          const userItinerariesList = inMemoryStorage.userItineraries.get(anonymousIdentifier) || [];
          userItinerariesList.push(id);
          inMemoryStorage.userItineraries.set(anonymousIdentifier, userItinerariesList);
        }
        return itinerary;
      }
      throw error;
    }
  }

  async getItinerary(id: number): Promise<Itinerary | undefined> {
    try {
      return await super.getItinerary(id);
    } catch (err) {
      if (USE_IN_MEMORY_FALLBACK) {
        const error = err as Error;
        console.warn("Database error in getItinerary, using in-memory fallback:", error.message || 'Unknown error');
        return inMemoryStorage.itineraries.get(id);
      }
      throw err;
    }
  }

  async getUserItineraries(userId: string): Promise<Itinerary[]> {
    console.log(`DbStorage (with logging): Getting itineraries for user ${userId}`);
    try {
      const result = await super.getUserItineraries(userId);
      console.log(`DbStorage (with logging): Found ${result.length} itineraries for user ${userId}`);
      return result;
    } catch (err) {
      const error = err as Error;
      console.error(`DbStorage (with logging): Error getting user itineraries:`, error);
      
      if (USE_IN_MEMORY_FALLBACK) {
        console.warn("Using in-memory fallback for getUserItineraries due to database error");
        
        const itineraryIds = inMemoryStorage.userItineraries.get(userId) || [];
        
        // Get and filter the itineraries
        const userItineraries = itineraryIds
          .map(id => inMemoryStorage.itineraries.get(id))
          .filter((itinerary): itinerary is Itinerary => itinerary !== undefined)
          .sort((a, b) => b.created.getTime() - a.created.getTime());
        
        return userItineraries;
      }
      
      throw err; // Use err instead of error
    }
  }
}

// Use the database storage implementation
export const storage = new DbStorageWithLogging();

// Export inMemoryStorage for debugging purposes
export { inMemoryStorage };