import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword, comparePassword, generateToken } from "../services/auth.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, role, venueIds } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Name is required." });
      return;
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Valid email address is required." });
      return;
    }

    if (!password || typeof password !== "string" || password.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters long." });
      return;
    }

    if (role !== "CUSTOMER" && role !== "VENUE_MANAGER") {
      res.status(400).json({ error: "Role must be either 'CUSTOMER' or 'VENUE_MANAGER'." });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role,
        venues: role === "VENUE_MANAGER" && Array.isArray(venueIds) && venueIds.length > 0
          ? {
              create: venueIds.map((vId: number) => ({ venueId: vId }))
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        venues: {
          select: {
            venue: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role as "CUSTOMER" | "VENUE_MANAGER"
    });

    res.status(201).json({
      message: "Account created successfully.",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        managedVenues: newUser.venues.map((v) => v.venue)
      },
      token
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "An unexpected error occurred during signup." });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        venues: {
          select: {
            venue: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role as "CUSTOMER" | "VENUE_MANAGER"
    });

    res.status(200).json({
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        managedVenues: user.venues.map((v) => v.venue)
      },
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An unexpected error occurred during login." });
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        venues: {
          select: {
            venue: {
              select: { id: true, name: true, address: true }
            }
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        managedVenues: user.venues.map((v) => v.venue)
      }
    });
  } catch (error) {
    console.error("GetCurrentUser error:", error);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
}
