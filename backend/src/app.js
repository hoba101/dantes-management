import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import authRoutes from "./routes/auth.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";

const app = express();

// Serve static files from public directory
app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

// Helmet setup (adjusted for images if needed, but default is usually okay)
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
app.use(limiter);

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/providers", providerRoutes);

app.all("*", (_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

export default app;
