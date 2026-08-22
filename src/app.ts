import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import venueRoutes from "./routes/venue.routes";
import eventRoutes from "./routes/event.routes";
import managerRoutes from "./routes/manager.routes";

import { formatDate } from "./utils/helpers";

const ALLOWED_ORIGINS = [
  "https://community-event-platform-frontend.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4000"
];

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., Postman, curl, server-to-server)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: Origin '${origin}' is not allowed.`));
    }
  },
  credentials: true
}));
app.use(express.json());

// API Health Check
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: formatDate(new Date()) });
});

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/manager", managerRoutes);

// Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Application Error:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "An internal server error occurred."
  });
});

export default app;
