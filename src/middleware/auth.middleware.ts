import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../services/auth.service";
import { prisma } from "../lib/prisma";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: "CUSTOMER" | "VENUE_MANAGER";
    name: string;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required. Missing or invalid Bearer token." });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, name: true }
    });

    if (!user) {
      res.status(401).json({ error: "Invalid session token. User not found." });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired session token." });
    return;
  }
}

export async function optionalAuthenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, email: true, role: true, name: true }
      });
      if (user) {
        req.user = user;
      }
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

export function requireRole(...roles: Array<"CUSTOMER" | "VENUE_MANAGER">) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Action requires role: ${roles.join(" or ")}, but user is ${req.user.role}.`
      });
      return;
    }

    next();
  };
}
