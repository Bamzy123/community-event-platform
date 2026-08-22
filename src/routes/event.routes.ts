import { Router } from "express";
import { createEvent, listEvents, upvoteEvent, removeUpvote } from "../controllers/event.controller";
import { authenticate, optionalAuthenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuthenticate, listEvents);
router.post("/", authenticate, requireRole("CUSTOMER"), createEvent);
router.post("/:id/upvote", authenticate, requireRole("CUSTOMER"), upvoteEvent);
router.delete("/:id/upvote", authenticate, requireRole("CUSTOMER"), removeUpvote);

export default router;
