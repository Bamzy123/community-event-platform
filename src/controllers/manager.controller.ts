import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function getApprovalQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    // Find all venues managed by this manager
    const managerVenues = await prisma.venueManager.findMany({
      where: { userId: req.user.id },
      select: { venueId: true }
    });

    const managedVenueIds = managerVenues.map((mv) => mv.venueId);

    if (managedVenueIds.length === 0) {
      res.status(200).json({
        message: "No venues currently assigned to this manager.",
        managedVenues: [],
        queue: []
      });
      return;
    }

    // Fetch pending events for managed venues
    const pendingEvents = await prisma.event.findMany({
      where: {
        venueId: { in: managedVenueIds },
        status: "PENDING"
      },
      include: {
        venue: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { votes: true } }
      }
    });

    // Sort by upvote count descending
    const sortedQueue = pendingEvents.sort((a, b) => b._count.votes - a._count.votes);

    res.status(200).json({
      queue: sortedQueue.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        proposedAt: event.proposedAt,
        status: event.status,
        venue: event.venue,
        creator: event.creator,
        voteCount: event._count.votes,
        createdAt: event.createdAt
      }))
    });
  } catch (error) {
    console.error("GetApprovalQueue error:", error);
    res.status(500).json({ error: "Failed to fetch approval queue." });
  }
}

export async function updateEventStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const eventId = Number(req.params.id);
    if (isNaN(eventId)) {
      res.status(400).json({ error: "Invalid event ID." });
      return;
    }

    const { status } = req.body;
    if (status !== "APPROVED" && status !== "REJECTED") {
      res.status(400).json({ error: "Status must be either 'APPROVED' or 'REJECTED'." });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { venue: { select: { id: true, name: true } } }
    });

    if (!event) {
      res.status(404).json({ error: "Event not found." });
      return;
    }

    // Authorization check: Verify user is a manager for this specific venue
    const isVenueManager = await prisma.venueManager.findUnique({
      where: {
        userId_venueId: {
          userId: req.user.id,
          venueId: event.venueId
        }
      }
    });

    if (!isVenueManager) {
      res.status(403).json({
        error: `Access denied. You do not manage venue '${event.venue.name}' (ID: ${event.venueId}).`
      });
      return;
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { status },
      include: {
        venue: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { votes: true } }
      }
    });

    res.status(200).json({
      message: `Event status successfully updated to ${status}.`,
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        description: updatedEvent.description,
        proposedAt: updatedEvent.proposedAt,
        status: updatedEvent.status,
        venue: updatedEvent.venue,
        creator: updatedEvent.creator,
        voteCount: updatedEvent._count.votes,
        updatedAt: updatedEvent.updatedAt
      }
    });
  } catch (error) {
    console.error("UpdateEventStatus error:", error);
    res.status(500).json({ error: "Failed to update event status." });
  }
}
