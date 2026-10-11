import { Router } from "express";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";
import {
  updateProfile,
  createCaseRequest,
  listMyCaseRequests,
  updateCaseRequest,
  deleteCaseRequest,
} from "../controllers/studentController.js";
import { upload } from "../../middlewares/uploadMiddleware.js";
import { uploadAvatar, uploadPortfolioImage } from "../controllers/profileController.js";

const router = Router();

router.use(authMiddleware, requireRole("student"));

router.put("/profile", updateProfile);
router.get("/cases", listMyCaseRequests);
router.post("/cases", createCaseRequest);
router.put("/cases/:offeringId", updateCaseRequest);
router.delete("/cases/:offeringId", deleteCaseRequest);

// Image Uploads
router.post("/profile/avatar", upload.single("image"), uploadAvatar);
router.post("/profile/portfolio", upload.single("image"), uploadPortfolioImage);

export default router;
