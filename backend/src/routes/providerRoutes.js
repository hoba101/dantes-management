import { Router } from "express";
import { getProviderById } from "../controllers/providerController.js";

const router = Router();

router.get("/:id", getProviderById);

export default router;
