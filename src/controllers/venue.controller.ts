import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { parseNumericId, formatDate } from "../utils/helpers";

export const listVenues = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const venues = await prisma.venue.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      managers: { select: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { events: true } }
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
});

export const getVenueById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const venueId = parseNumericId(req.params.id);
  if (!venueId) {
    res.status(400).json({ error: "Invalid venue ID." });
    return;
  }

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: {
      id: true,
      name: true,
      address: true,
      managers: { select: { user: { select: { id: true, name: true, email: true } } } },
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
        proposedAt: formatDate(e.proposedAt),
        status: e.status,
        voteCount: e._count.votes
      })),
      eventCount: venue._count.events
    }
  });
});

export const createVenue = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      managers: { create: { userId: req.user.id } }
    },
    select: {
      id: true,
      name: true,
      address: true,
      managers: { select: { user: { select: { id: true, name: true, email: true } } } }
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
});

export const updateVenue = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const venueId = parseNumericId(req.params.id);
  if (!venueId) {
    res.status(400).json({ error: "Invalid venue ID." });
    return;
  }

  const existingVenue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!existingVenue) {
    res.status(404).json({ error: "Venue not found." });
    return;
  }

  const isManager = await prisma.venueManager.findUnique({
    where: { userId_venueId: { userId: req.user.id, venueId } }
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
      managers: { select: { user: { select: { id: true, name: true, email: true } } } }
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
});

export const deleteVenue = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const venueId = parseNumericId(req.params.id);
  if (!venueId) {
    res.status(400).json({ error: "Invalid venue ID." });
    return;
  }

  const existingVenue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!existingVenue) {
    res.status(404).json({ error: "Venue not found." });
    return;
  }

  const isManager = await prisma.venueManager.findUnique({
    where: { userId_venueId: { userId: req.user.id, venueId } }
  });

  if (!isManager) {
    res.status(403).json({ error: "Access denied. You are not a manager for this venue." });
    return;
  }

  await prisma.venue.delete({ where: { id: venueId } });

  res.status(200).json({ message: "Venue deleted successfully." });
});
