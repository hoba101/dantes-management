import { Router } from "express";
import { register, login } from "../controllers/authController.js";
import { validateRegistration } from "../validators/auth.js";

const router = Router();

router.post("/register", validateRegistration, register);
router.post("/login", login);

export default router;
