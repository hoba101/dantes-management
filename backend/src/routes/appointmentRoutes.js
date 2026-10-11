import { Router } from "express";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";
import {
  bookAppointment,
  getMyAppointments,
  updateAppointmentStatus,
} from "../controllers/appointmentController.js";

const router = Router();

router.use(authMiddleware);

router.post("/", requireRole("patient"), bookAppointment);
router.get("/", getMyAppointments);
router.patch("/:appointmentId/status", requireRole("doctor", "student"), updateAppointmentStatus);

export default router;
