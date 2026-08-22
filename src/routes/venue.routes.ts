import { Router } from "express";
import {
  listVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue
} from "../controllers/venue.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.get("/", listVenues);
router.get("/:id", getVenueById);

router.post("/", authenticate, requireRole("VENUE_MANAGER"), createVenue);
router.put("/:id", authenticate, requireRole("VENUE_MANAGER"), updateVenue);
router.delete("/:id", authenticate, requireRole("VENUE_MANAGER"), deleteVenue);

export default router;
