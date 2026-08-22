# 🚀 Complete Postman & REST API Testing Guide

This guide contains step-by-step instructions, request URLs, HTTP methods, headers, JSON request bodies, and expected responses for **every single API endpoint** in the **Community Event Platform**.

---

## 🌐 Server Base URLs
- **Local Development:** `http://localhost:4000` *(or `http://localhost:3000`)*
- **Production (Render):** `https://community-event-platform-7dtn.onrender.com`

---

## 🔑 1. Authentication Endpoints (`/api/auth`)

### 1.1 Customer Signup
- **Method:** `POST`
- **URL:** `{{BASE_URL}}/api/auth/signup`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  {
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "password": "password123",
    "role": "CUSTOMER"
  }
  ```
- **Expected Status:** `201 Created`
- **Response:**
  ```json
  {
    "message": "Account created successfully.",
    "user": {
      "id": 1,
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "role": "CUSTOMER",
      "managedVenues": []
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5..."
  }
  ```

---

### 1.2 Venue Manager Signup
- **Method:** `POST`
- **URL:** `{{BASE_URL}}/api/auth/signup`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  {
    "name": "Bob Manager",
    "email": "bob@example.com",
    "password": "password123",
    "role": "VENUE_MANAGER"
  }
  ```
- **Expected Status:** `201 Created`

---

### 1.3 User Login
- **Method:** `POST`
- **URL:** `{{BASE_URL}}/api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  {
    "email": "alice@example.com",
    "password": "password123"
  }
  ```
- **Expected Status:** `200 OK`
- **Response:** Returns `token` and `user` object. Save this token for authenticated requests!

---

### 1.4 Get Current User Profile
- **Method:** `GET`
- **URL:** `{{BASE_URL}}/api/auth/me`
- **Headers:**
  - `Authorization: Bearer <CUSTOMER_OR_MANAGER_JWT_TOKEN>`
- **Expected Status:** `200 OK`

---

## 🏢 2. Venue Management Endpoints (`/api/venues`)

### 2.1 List All Venues (Public)
- **Method:** `GET`
- **URL:** `{{BASE_URL}}/api/venues`
- **Headers:** None required.
- **Expected Status:** `200 OK`
- **Response:**
  ```json
  [
    {
      "id": 1,
      "name": "Grand Community Hall",
      "address": "123 Main Street",
      "createdAt": "2026-08-22T00:00:00.000Z"
    }
  ]
  ```

---

### 2.2 Get Venue By ID (Public)
- **Method:** `GET`
- **URL:** `{{BASE_URL}}/api/venues/1`
- **Headers:** None required.
- **Expected Status:** `200 OK`

---

### 2.3 Create a Venue (`VENUE_MANAGER` Only)
- **Method:** `POST`
- **URL:** `{{BASE_URL}}/api/venues`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <VENUE_MANAGER_JWT_TOKEN>`
- **Body (raw JSON):**
  ```json
  {
    "name": "Riverside Amphitheater",
    "address": "456 Waterfront Way"
  }
  ```
- **Expected Status:** `201 Created`
- **Response:** Returns created venue object and automatically assigns the creator as venue manager.

---

### 2.4 Update a Venue (`VENUE_MANAGER` Only)
- **Method:** `PUT`
- **URL:** `{{BASE_URL}}/api/venues/1`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <VENUE_MANAGER_JWT_TOKEN>`
- **Body (raw JSON):**
  ```json
  {
    "name": "Grand Community Center & Park",
    "address": "123 Main Street, Suite 100"
  }
  ```
- **Expected Status:** `200 OK`

---

### 2.5 Delete a Venue (`VENUE_MANAGER` Only)
- **Method:** `DELETE`
- **URL:** `{{BASE_URL}}/api/venues/1`
- **Headers:**
  - `Authorization: Bearer <VENUE_MANAGER_JWT_TOKEN>`
- **Expected Status:** `200 OK`
- **Response:**
  ```json
  {
    "message": "Venue deleted successfully."
  }
  ```

---

## 📅 3. Event & Upvote Endpoints (`/api/events`)

### 3.1 Propose / Suggest a New Event (`CUSTOMER` Only)
- **Method:** `POST`
- **URL:** `{{BASE_URL}}/api/events`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <CUSTOMER_JWT_TOKEN>`
- **Body (raw JSON):**
  ```json
  {
    "title": "Summer Acoustic Music Concert",
    "description": "An outdoor evening of acoustic performances and local food trucks.",
    "proposedAt": "2026-09-15T18:00:00.000Z",
    "venueId": 1
  }
  ```
- **Expected Status:** `201 Created`
- **Response:** Returns created event object with initial status `PENDING`.

---

### 3.2 List All Approved Events (Public / Optional Auth)
- **Method:** `GET`
- **URL:** `{{BASE_URL}}/api/events`
- **Headers:** Optional `Authorization: Bearer <JWT_TOKEN>` (If provided, response indicates `hasUpvoted: true/false` for each event).
- **Expected Status:** `200 OK`
- **Response:** Returns array of events with `status: "APPROVED"`, `voteCount`, and venue details.

---

### 3.3 Upvote an Event (`CUSTOMER` Only)
- **Method:** `POST`
- **URL:** `{{BASE_URL}}/api/events/1/upvote`
- **Headers:**
  - `Authorization: Bearer <CUSTOMER_JWT_TOKEN>`
- **Body:** None required (empty body `{}`).
- **Expected Status:** `201 Created`
- **Response:**
  ```json
  {
    "message": "Upvote added successfully.",
    "voteCount": 1
  }
  ```
- *Note:* If you upvote the same event twice with the same user, Postman will return `409 Conflict` (`"You have already upvoted this event."`).

---

### 3.4 Remove Upvote from an Event (`CUSTOMER` Only)
- **Method:** `DELETE`
- **URL:** `{{BASE_URL}}/api/events/1/upvote`
- **Headers:**
  - `Authorization: Bearer <CUSTOMER_JWT_TOKEN>`
- **Expected Status:** `200 OK`
- **Response:**
  ```json
  {
    "message": "Upvote removed successfully.",
    "voteCount": 0
  }
  ```

---

## 🛡️ 4. Venue Manager Approval Queue Endpoints (`/api/manager`)

### 4.1 View Venue Approval Queue (`VENUE_MANAGER` Only)
- **Method:** `GET`
- **URL:** `{{BASE_URL}}/api/manager/queue`
- **Headers:**
  - `Authorization: Bearer <VENUE_MANAGER_JWT_TOKEN>`
- **Expected Status:** `200 OK`
- **Response:** Returns all `PENDING` events for venues assigned to this manager, sorted by popularity (`voteCount` descending).

---

### 4.2 Approve or Reject an Event (`VENUE_MANAGER` Only)
- **Method:** `PATCH`
- **URL:** `{{BASE_URL}}/api/manager/events/1/status`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <VENUE_MANAGER_JWT_TOKEN>`
- **Body (raw JSON) - To Approve:**
  ```json
  {
    "status": "APPROVED"
  }
  ```
- **Body (raw JSON) - To Reject:**
  ```json
  {
    "status": "REJECTED"
  }
  ```
- **Expected Status:** `200 OK`
- **Response:**
  ```json
  {
    "message": "Event status updated to APPROVED.",
    "event": {
      "id": 1,
      "title": "Summer Acoustic Music Concert",
      "status": "APPROVED"
    }
  }
  ```

---

## 🩺 5. System Health Check

### 5.1 Health Check
- **Method:** `GET`
- **URL:** `{{BASE_URL}}/api/health`
- **Headers:** None.
- **Expected Status:** `200 OK`
- **Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-08-22T08:14:00.000Z"
  }
  ```
