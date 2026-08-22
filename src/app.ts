import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import venueRoutes from "./routes/venue.routes";
import eventRoutes from "./routes/event.routes";
import managerRoutes from "./routes/manager.routes";

const app = express();

app.use(cors());
app.use(express.json());

// API Health Check
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
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
