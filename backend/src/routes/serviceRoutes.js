import { Router } from "express";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";
import {
  listMyServices,
  addService,
  updateServicePrice,
  removeService,
  listCatalog,
} from "../controllers/serviceController.js";

const router = Router();

router.get("/catalog", listCatalog);

router.use(authMiddleware, requireRole("doctor"));

router.get("/my", listMyServices);
router.post("/", addService);
router.put("/:priceId", updateServicePrice);
router.delete("/:priceId", removeService);

export default router;
