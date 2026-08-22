import { Router } from "express";
import { getApprovalQueue, updateEventStatus } from "../controllers/manager.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate, requireRole("VENUE_MANAGER"));

router.get("/queue", getApprovalQueue);
router.patch("/events/:id/status", updateEventStatus);

export default router;
