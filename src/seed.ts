import { prisma } from "./lib/prisma";
import { hashPassword } from "./services/auth.service";

async function main() {
  console.log("Starting Community Event Platform data seeding...");

  // Clean existing database records
  await prisma.vote.deleteMany();
  await prisma.event.deleteMany();
  await prisma.venueManager.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleared existing database records.");

  // Default hashed password for demo users
  const defaultPassword = await hashPassword("password123");

  // 1. Create Venues
  const venue1 = await prisma.venue.create({
    data: {
      name: "Grand Symphony Hall",
      address: "123 Music Row, Downtown"
    }
  });

  const venue2 = await prisma.venue.create({
    data: {
      name: "Riverside Outdoor Amphitheater",
      address: "456 Riverfront Park, Westside"
    }
  });

  console.log(`Created 2 venues: '${venue1.name}', '${venue2.name}'.`);

  // 2. Create Venue Managers
  const manager1 = await prisma.user.create({
    data: {
      name: "Manager Mark",
      email: "manager1@platform.com",
      password: defaultPassword,
      role: "VENUE_MANAGER",
      venues: {
        create: { venueId: venue1.id }
      }
    }
  });

  const manager2 = await prisma.user.create({
    data: {
      name: "Manager Sarah",
      email: "manager2@platform.com",
      password: defaultPassword,
      role: "VENUE_MANAGER",
      venues: {
        create: { venueId: venue2.id }
      }
    }
  });

  console.log(`Created 2 venue managers: '${manager1.email}', '${manager2.email}'.`);

  // 3. Create Customers
  const customer1 = await prisma.user.create({
    data: {
      name: "Alice Johnson",
      email: "alice@customer.com",
      password: defaultPassword,
      role: "CUSTOMER"
    }
  });

  const customer2 = await prisma.user.create({
    data: {
      name: "Bob Smith",
      email: "bob@customer.com",
      password: defaultPassword,
      role: "CUSTOMER"
    }
  });

  const customer3 = await prisma.user.create({
    data: {
      name: "Charlie Brown",
      email: "charlie@customer.com",
      password: defaultPassword,
      role: "CUSTOMER"
    }
  });

  console.log(`Created 3 customers: '${customer1.email}', '${customer2.email}', '${customer3.email}'.`);

  // 4. Create Events in Mixed States
  const event1 = await prisma.event.create({
    data: {
      title: "Acoustic Jazz Night",
      description: "An evening of smooth acoustic jazz featuring local high school talent and guest soloists.",
      proposedAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
      status: "PENDING",
      venueId: venue1.id,
      creatorId: customer1.id
    }
  });

  const event2 = await prisma.event.create({
    data: {
      title: "Community Indie Rock Showcase",
      description: "Local independent rock bands battle it out for the annual regional community cup.",
      proposedAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: "APPROVED",
      venueId: venue1.id,
      creatorId: customer2.id
    }
  });

  const event3 = await prisma.event.create({
    data: {
      title: "Midnight Heavy Metal Jam",
      description: "Extreme loud noise session starting at midnight.",
      proposedAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: "REJECTED",
      venueId: venue1.id,
      creatorId: customer3.id
    }
  });

  const event4 = await prisma.event.create({
    data: {
      title: "Sunset Symphony & Classical Picnic",
      description: "Open-air orchestra performance with food trucks and family activities under the stars.",
      proposedAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: "PENDING",
      venueId: venue2.id,
      creatorId: customer1.id
    }
  });

  const event5 = await prisma.event.create({
    data: {
      title: "Local Artisan Farmers & Crafts Market",
      description: "Fresh organic produce, handmade crafts, and live acoustic buskers.",
      proposedAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: "APPROVED",
      venueId: venue2.id,
      creatorId: customer2.id
    }
  });

  console.log("Created 5 events in mixed states (PENDING, APPROVED, REJECTED).");

  // 5. Create Upvotes
  await prisma.vote.createMany({
    data: [
      // Event 1 (Acoustic Jazz) -> 2 votes (Alice, Bob)
      { userId: customer1.id, eventId: event1.id },
      { userId: customer2.id, eventId: event1.id },

      // Event 2 (Indie Rock) -> 3 votes (Alice, Bob, Charlie)
      { userId: customer1.id, eventId: event2.id },
      { userId: customer2.id, eventId: event2.id },
      { userId: customer3.id, eventId: event2.id },

      // Event 3 (Metal) -> 1 vote (Charlie)
      { userId: customer3.id, eventId: event3.id },

      // Event 4 (Sunset Symphony) -> 3 votes (Alice, Bob, Charlie)
      { userId: customer1.id, eventId: event4.id },
      { userId: customer2.id, eventId: event4.id },
      { userId: customer3.id, eventId: event4.id },

      // Event 5 (Farmers Market) -> 1 vote (Bob)
      { userId: customer2.id, eventId: event5.id }
    ]
  });

  console.log("Created sample upvotes.");
  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
