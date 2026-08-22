import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { parseNumericId, formatDate } from "../utils/helpers";

export const createEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const { title, description, proposedAt, venueId } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "Event title is required." });
    return;
  }

  if (!description || typeof description !== "string" || !description.trim()) {
    res.status(400).json({ error: "Event description is required." });
    return;
  }

  if (!proposedAt) {
    res.status(400).json({ error: "Proposed date/time is required." });
    return;
  }

  let proposedDate: Date;
  if (typeof proposedAt === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(proposedAt.trim())) {
    const [day, month, year] = proposedAt.trim().split("/").map(Number);
    proposedDate = new Date(year, month - 1, day);
  } else {
    proposedDate = new Date(proposedAt);
  }

  if (isNaN(proposedDate.getTime())) {
    res.status(400).json({ error: "Invalid proposed date/time format." });
    return;
  }

  const parsedVenueId = parseNumericId(venueId);
  if (!parsedVenueId) {
    res.status(400).json({ error: "Valid venueId is required." });
    return;
  }

  const venueExists = await prisma.venue.findUnique({ where: { id: parsedVenueId } });
  if (!venueExists) {
    res.status(404).json({ error: "Specified venue does not exist." });
    return;
  }

  const newEvent = await prisma.event.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      proposedAt: proposedDate,
      venueId: parsedVenueId,
      creatorId: req.user.id,
      status: "PENDING"
    },
    include: {
      venue: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, email: true } },
      _count: { select: { votes: true } }
    }
  });

  res.status(201).json({
    message: "Event suggestion created and submitted to venue manager queue.",
    event: {
      id: newEvent.id,
      title: newEvent.title,
      description: newEvent.description,
      proposedAt: formatDate(newEvent.proposedAt),
      status: newEvent.status,
      venue: newEvent.venue,
      creator: newEvent.creator,
      voteCount: newEvent._count.votes,
      createdAt: formatDate(newEvent.createdAt)
    }
  });
});

export const listEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { venueId, status } = req.query;

  const whereClause: any = {};
  if (venueId) {
    const parsedVId = parseNumericId(String(venueId));
    if (parsedVId) whereClause.venueId = parsedVId;
  }
  if (status && typeof status === "string") {
    whereClause.status = status.toUpperCase();
  }

  const events = await prisma.event.findMany({
    where: whereClause,
    include: {
      venue: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      votes: userId ? { where: { userId } } : false,
      _count: { select: { votes: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  res.status(200).json({
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      proposedAt: formatDate(event.proposedAt),
      status: event.status,
      venue: event.venue,
      creator: event.creator,
      voteCount: event._count.votes,
      hasUpvoted: userId ? Array.isArray(event.votes) && event.votes.length > 0 : false,
      createdAt: formatDate(event.createdAt)
    }))
  });
});

export const upvoteEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const eventId = parseNumericId(req.params.id);
  if (!eventId) {
    res.status(400).json({ error: "Invalid event ID." });
    return;
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    res.status(404).json({ error: "Event not found." });
    return;
  }

  const existingVote = await prisma.vote.findUnique({
    where: { userId_eventId: { userId: req.user.id, eventId } }
  });

  if (existingVote) {
    res.status(409).json({ error: "You have already upvoted this event." });
    return;
  }

  await prisma.vote.create({
    data: { userId: req.user.id, eventId }
  });

  const updatedVoteCount = await prisma.vote.count({ where: { eventId } });

  res.status(200).json({
    message: "Event upvoted successfully.",
    eventId,
    voteCount: updatedVoteCount,
    hasUpvoted: true
  });
});

export const removeUpvote = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const eventId = parseNumericId(req.params.id);
  if (!eventId) {
    res.status(400).json({ error: "Invalid event ID." });
    return;
  }

  const existingVote = await prisma.vote.findUnique({
    where: { userId_eventId: { userId: req.user.id, eventId } }
  });

  if (!existingVote) {
    res.status(404).json({ error: "Upvote record not found." });
    return;
  }

  await prisma.vote.delete({
    where: { userId_eventId: { userId: req.user.id, eventId } }
  });

  const updatedVoteCount = await prisma.vote.count({ where: { eventId } });

  res.status(200).json({
    message: "Upvote removed successfully.",
    eventId,
    voteCount: updatedVoteCount,
    hasUpvoted: false
  });
});
