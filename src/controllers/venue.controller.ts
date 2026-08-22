import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function listVenues(req: Request, res: Response): Promise<void> {
  try {
    const venues = await prisma.venue.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        managers: {
          select: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        _count: {
          select: { events: true }
        }
      },
      orderBy: { name: "asc" }
    });

    res.status(200).json({
      venues: venues.map((v) => ({
        id: v.id,
        name: v.name,
        address: v.address,
        managers: v.managers.map((m) => m.user),
        eventCount: v._count.events
      }))
    });
  } catch (error) {
    console.error("ListVenues error:", error);
    res.status(500).json({ error: "Failed to fetch venues." });
  }
}

export async function getVenueById(req: Request, res: Response): Promise<void> {
  try {
    const venueId = Number(req.params.id);
    if (isNaN(venueId)) {
      res.status(400).json({ error: "Invalid venue ID." });
      return;
    }

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        name: true,
        address: true,
        managers: {
          select: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        events: {
          select: {
            id: true,
            title: true,
            description: true,
            proposedAt: true,
            status: true,
            _count: { select: { votes: true } }
          },
          orderBy: { createdAt: "desc" }
        },
        _count: { select: { events: true } }
      }
    });

    if (!venue) {
      res.status(404).json({ error: "Venue not found." });
      return;
    }

    res.status(200).json({
      venue: {
        id: venue.id,
        name: venue.name,
        address: venue.address,
        managers: venue.managers.map((m) => m.user),
        events: venue.events.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          proposedAt: e.proposedAt,
          status: e.status,
          voteCount: e._count.votes
        })),
        eventCount: venue._count.events
      }
    });
  } catch (error) {
    console.error("GetVenueById error:", error);
    res.status(500).json({ error: "Failed to fetch venue details." });
  }
}

export async function createVenue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const { name, address } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Venue name is required." });
      return;
    }

    const venue = await prisma.venue.create({
      data: {
        name: name.trim(),
        address: address && typeof address === "string" ? address.trim() : null,
        managers: {
          create: {
            userId: req.user.id
          }
        }
      },
      select: {
        id: true,
        name: true,
        address: true,
        managers: {
          select: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    res.status(201).json({
      message: "Venue created successfully.",
      venue: {
        id: venue.id,
        name: venue.name,
        address: venue.address,
        managers: venue.managers.map((m) => m.user)
      }
    });
  } catch (error) {
    console.error("CreateVenue error:", error);
    res.status(500).json({ error: "Failed to create venue." });
  }
}

export async function updateVenue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const venueId = Number(req.params.id);
    if (isNaN(venueId)) {
      res.status(400).json({ error: "Invalid venue ID." });
      return;
    }

    const existingVenue = await prisma.venue.findUnique({
      where: { id: venueId }
    });

    if (!existingVenue) {
      res.status(404).json({ error: "Venue not found." });
      return;
    }

    const isManager = await prisma.venueManager.findUnique({
      where: {
        userId_venueId: {
          userId: req.user.id,
          venueId
        }
      }
    });

    if (!isManager) {
      res.status(403).json({ error: "Access denied. You are not a manager for this venue." });
      return;
    }

    const { name, address } = req.body;
    const updateData: { name?: string; address?: string | null } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "Venue name cannot be empty." });
        return;
      }
      updateData.name = name.trim();
    }

    if (address !== undefined) {
      updateData.address = typeof address === "string" ? address.trim() : null;
    }

    const updatedVenue = await prisma.venue.update({
      where: { id: venueId },
      data: updateData,
      select: {
        id: true,
        name: true,
        address: true,
        managers: {
          select: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    res.status(200).json({
      message: "Venue updated successfully.",
      venue: {
        id: updatedVenue.id,
        name: updatedVenue.name,
        address: updatedVenue.address,
        managers: updatedVenue.managers.map((m) => m.user)
      }
    });
  } catch (error) {
    console.error("UpdateVenue error:", error);
    res.status(500).json({ error: "Failed to update venue." });
  }
}

export async function deleteVenue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const venueId = Number(req.params.id);
    if (isNaN(venueId)) {
      res.status(400).json({ error: "Invalid venue ID." });
      return;
    }

    const existingVenue = await prisma.venue.findUnique({
      where: { id: venueId }
    });

    if (!existingVenue) {
      res.status(404).json({ error: "Venue not found." });
      return;
    }

    const isManager = await prisma.venueManager.findUnique({
      where: {
        userId_venueId: {
          userId: req.user.id,
          venueId
        }
      }
    });

    if (!isManager) {
      res.status(403).json({ error: "Access denied. You are not a manager for this venue." });
      return;
    }

    await prisma.venue.delete({
      where: { id: venueId }
    });

    res.status(200).json({ message: "Venue deleted successfully." });
  } catch (error) {
    console.error("DeleteVenue error:", error);
    res.status(500).json({ error: "Failed to delete venue." });
  }
}
