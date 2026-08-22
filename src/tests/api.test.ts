import http from "http";
import app from "../app";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../services/auth.service";

async function runTests() {
  console.log("Starting Automated API Integration & Security Tests...\n");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3099, resolve));
  const baseUrl = "http://localhost:3099/api";

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`PASS: ${testName}`);
      passed++;
    } else {
      console.error(`FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  try {
    // 1. Seed data for test environment
    await prisma.vote.deleteMany();
    await prisma.event.deleteMany();
    await prisma.venueManager.deleteMany();
    await prisma.venue.deleteMany();
    await prisma.user.deleteMany();

    const hashedPwd = await hashPassword("password123");
    const v1 = await prisma.venue.create({ data: { name: "Test Venue Alpha", address: "1 Alpha St" } });
    const v2 = await prisma.venue.create({ data: { name: "Test Venue Beta", address: "2 Beta St" } });

    const mgr1 = await prisma.user.create({
      data: { name: "Manager One", email: "mgr1@test.com", password: hashedPwd, role: "VENUE_MANAGER", venues: { create: { venueId: v1.id } } }
    });
    const mgr2 = await prisma.user.create({
      data: { name: "Manager Two", email: "mgr2@test.com", password: hashedPwd, role: "VENUE_MANAGER", venues: { create: { venueId: v2.id } } }
    });

    const cust1 = await prisma.user.create({
      data: { name: "Customer Alice", email: "alice@test.com", password: hashedPwd, role: "CUSTOMER" }
    });
    const cust2 = await prisma.user.create({
      data: { name: "Customer Bob", email: "bob@test.com", password: hashedPwd, role: "CUSTOMER" }
    });

    // Test 1: Customer Signup
    const signupRes = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Customer Charlie", email: "charlie@test.com", password: "password123", role: "CUSTOMER" })
    });
    const signupData = await signupRes.json();
    assert(signupRes.status === 201 && !!signupData.token, "Customer Signup returns 201 and JWT token");

    // Test 2: Login as Customer
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@test.com", password: "password123" })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && !!loginData.token, "Customer Login returns 200 and token");
    const aliceToken = loginData.token;

    // Test 3: Login as Manager 1 & Manager 2
    const mgr1Login = await (await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "mgr1@test.com", password: "password123" })
    })).json();
    const mgr1Token = mgr1Login.token;

    const mgr2Login = await (await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "mgr2@test.com", password: "password123" })
    })).json();
    const mgr2Token = mgr2Login.token;

    // Test 4: Suggest Event (Customer)
    const createEventRes = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        title: "Community Board Game Night",
        description: "Fun board games evening for all ages.",
        proposedAt: new Date(Date.now() + 86400000).toISOString(),
        venueId: v1.id
      })
    });
    const createEventData = await createEventRes.json();
    assert(createEventRes.status === 201 && createEventData.event.status === "PENDING", "Customer can suggest an event (status=PENDING)");
    const createdEventId = createEventData.event.id;

    // Test 5: Upvote Event & Prevent Duplicate Upvote
    const upvoteRes1 = await fetch(`${baseUrl}/events/${createdEventId}/upvote`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${aliceToken}` }
    });
    const upvoteData1 = await upvoteRes1.json();
    assert(upvoteRes1.status === 200 && upvoteData1.voteCount === 1, "Customer can upvote event (voteCount=1)");

    const upvoteRes2 = await fetch(`${baseUrl}/events/${createdEventId}/upvote`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${aliceToken}` }
    });
    assert(upvoteRes2.status === 409, "Duplicate upvote from same user is rejected (409 Conflict)");

    // Test 6: Role Authorization - Customer cannot access Manager Queue
    const forbiddenQueueRes = await fetch(`${baseUrl}/manager/queue`, {
      headers: { "Authorization": `Bearer ${aliceToken}` }
    });
    assert(forbiddenQueueRes.status === 403, "Customer attempting manager queue access returns 403 Forbidden");

    // Test 7: Manager 1 views approval queue
    const queueRes1 = await fetch(`${baseUrl}/manager/queue`, {
      headers: { "Authorization": `Bearer ${mgr1Token}` }
    });
    const queueData1 = await queueRes1.json();
    assert(queueRes1.status === 200 && queueData1.queue.length === 1 && queueData1.queue[0].id === createdEventId, "Manager 1 sees event in venue queue");

    // Test 8: Manager 2 attempts to approve Manager 1's venue event (Venue Scoping)
    const unauthorizedApproveRes = await fetch(`${baseUrl}/manager/events/${createdEventId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mgr2Token}`
      },
      body: JSON.stringify({ status: "APPROVED" })
    });
    assert(unauthorizedApproveRes.status === 403, "Manager 2 approving event for unassigned venue returns 403 Forbidden");

    // Test 9: Manager 1 approves event
    const approveRes = await fetch(`${baseUrl}/manager/events/${createdEventId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mgr1Token}`
      },
      body: JSON.stringify({ status: "APPROVED" })
    });
    const approveData = await approveRes.json();
    assert(approveRes.status === 200 && approveData.event.status === "APPROVED", "Manager 1 approves event successfully");

    // Test 10: Customer browses events and sees status updated to APPROVED
    const listRes = await fetch(`${baseUrl}/events`, {
      headers: { "Authorization": `Bearer ${aliceToken}` }
    });
    const listData = await listRes.json();
    const targetEvent = listData.events.find((e: any) => e.id === createdEventId);
    assert(listRes.status === 200 && targetEvent?.status === "APPROVED" && targetEvent?.hasUpvoted === true, "Customer sees updated APPROVED status & upvote state");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    server.close();
    await prisma.$disconnect();
    console.log(`\n========================================`);
    console.log(`Test Summary: ${passed} passed, ${failed} failed.`);
    console.log(`========================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
