# 📘 ACS Energy CRM — API Documentation

> **Base URL:** `https://server-nine-olive-75.vercel.app`  
> **Version:** 1.0  
> **Auth:** JWT Bearer Token (via `Authorization: Bearer <token>` header)

---

## Table of Contents

| # | Section | Auth Required |
|---|---------|:---:|
| 1 | [Health & Status](#1-health--status) | ❌ |
| 2 | [Authentication](#2-authentication) | ❌ |
| 3 | [Leads — Public](#3-leads--public) | ❌ |
| 4 | [Leads — Protected](#4-leads--protected) | ✅ |
| 5 | [Lead Activities](#5-lead-activities) | ✅ |
| 6 | [Lead Follow-ups](#6-lead-follow-ups) | ✅ |
| 7 | [Reports](#7-reports) | ✅ |
| 8 | [Users (Admin only)](#8-users-admin-only) | ✅ 🔒 |
| 9 | [Data Models](#9-data-models) | — |
| 10 | [Error Codes](#10-error-codes) | — |

---

## 1. Health & Status

### `GET /`

Returns server status.

**Response:**
```json
{ "message": "ACS Energy CRM API is running" }
```

---

### `GET /api/health`

Health check with timestamp.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-26T18:06:21.171Z"
}
```

---

## 2. Authentication

### `POST /api/auth/seed-admin`

Seeds the default admin account. If an admin already exists, returns its email.

**Request Body:**
```json
{
  "password": "admin123"     // optional, defaults to "admin123"
}
```

**Response (201 — created):**
```json
{
  "message": "Admin created",
  "admin": { "email": "admin@acs.local" }
}
```

**Response (200 — already exists):**
```json
{
  "message": "Admin already exists",
  "admin": { "email": "admin@acs.local" }
}
```

---

### `POST /api/auth/login`

Authenticates a user and returns a JWT token.

**Request Body:**
```json
{
  "email": "admin@acs.local",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "69a08ba97625288836cbd37a",
    "name": "ACS Admin",
    "role": "admin",
    "email": "admin@acs.local"
  }
}
```

**Errors:**
| Code | Message |
|------|---------|
| 400 | `Email and password required` |
| 401 | `Invalid credentials` |

---

## 3. Leads — Public

### `POST /api/leads/public`

Create a new lead (no auth required). Automatically calculates lead score and checks for duplicates.

**Request Body:**
```json
{
  "leadType": "CHS",                        // required — CHS | Hotel | Corporate | Developer | Other
  "name": "Rohan Mehta",                    // required — contact name
  "phone": "+919876543210",                 // required
  "email": "rohan@example.com",             // optional
  "area": "Powai",                          // required
  "locality": "Hiranandani Gardens",        // optional — property name
  "propertySizeFlats": 150,                 // optional
  "parkingType": "basement",                // optional — open | basement | mixed
  "currentEvCount": 5,                      // optional
  "chargerInterest": ["3.3", "7.4"],        // optional — kW values
  "notes": "Interested in 10 chargers",     // optional
  "consent": true,                          // optional
  "decisionMakerKnown": false               // optional
}
```

**Response (201):**
```json
{
  "leadId": "ACS-288836-d37a",
  "id": "69a08ba97625288836cbd37a",
  "duplicate": false
}
```

---

## 4. Leads — Protected

> 🔑 All endpoints below require `Authorization: Bearer <token>`

### `GET /api/leads`

Fetch all leads with optional filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Full-text search (name, phone, email, area, locality) |
| `area` | string | Filter by area (regex, case-insensitive) |
| `leadType` | string | Filter by lead type |
| `stage` | string | Filter by pipeline stage |
| `owner` | string | Filter by owner user ID |
| `fromDate` | ISO date | Created after this date |
| `toDate` | ISO date | Created before this date |
| `limit` | number | Max results (default: 50) |

**Response (200):** Array of Lead objects
```json
[
  {
    "_id": "69a08ba976252888...",
    "leadId": "ACS-288836-d37a",
    "leadType": "CHS",
    "name": "Rohan Mehta",
    "phone": "+919876543210",
    "area": "Powai",
    "stage": "New",
    "leadScore": 7,
    "createdAt": "2026-02-26T18:00:00.000Z",
    ...
  }
]
```

---

### `GET /api/leads/:id`

Get lead details including activities and follow-ups.

**Response (200):**
```json
{
  "lead": { /* Lead object */ },
  "activities": [
    {
      "_id": "...",
      "type": "call",
      "description": "Initial outreach",
      "user": { "name": "ACS Admin", "role": "admin" },
      "createdAt": "..."
    }
  ],
  "followups": [
    {
      "_id": "...",
      "dueDate": "2026-03-01T00:00:00.000Z",
      "status": "pending",
      "notes": "Schedule site visit"
    }
  ]
}
```

---

### `PUT /api/leads/:id`

Update a lead. Any field from the Lead model can be updated.

**Request Body (partial update):**
```json
{
  "stage": "Qualified",
  "notes": "Committee approved EV charger installation"
}
```

**Response (200):** Updated Lead object

---

### `DELETE /api/leads/:id`

Delete a lead and all its related activities and follow-ups.

**Response (200):**
```json
{ "message": "Lead and related records deleted" }
```

---

### `GET /api/leads/export/csv/all`

Export all leads as a CSV file download.

**Response:** CSV file with headers:  
`leadId, leadType, name, phone, email, area, locality, propertySizeFlats, parkingType, currentEvCount, chargerInterest, stage, leadScore, createdAt`

---

## 5. Lead Activities

### `POST /api/leads/:id/activities`

Log an activity against a lead.

**Request Body:**
```json
{
  "type": "call",                    // required — call | whatsapp | email | meeting | note | other
  "description": "Follow-up call",   // required
  "attachmentUrl": "https://..."     // optional
}
```

**Response (201):** Activity object

---

## 6. Lead Follow-ups

### `POST /api/leads/:id/followups`

Schedule a follow-up for a lead. Also updates the lead's `nextFollowUpDate`.

**Request Body:**
```json
{
  "dueDate": "2026-03-05T10:00:00Z",        // required
  "notes": "Site visit at Hiranandani"       // optional
}
```

**Response (201):** Followup object

---

## 7. Reports

### `GET /api/reports/summary`

Get a dashboard summary. Sales users only see their own leads; admins see all.

**Response (200):**
```json
{
  "newLeadsThisWeek": 12,
  "stageCounts": {
    "New": 25,
    "Qualified": 10,
    "Meeting Booked": 5,
    "Proposal Sent": 3,
    "Won": 2,
    "Lost": 1
  },
  "conversionNewToMeeting": 20,
  "topLocalities": [
    { "area": "Powai", "locality": "Hiranandani", "count": 8 },
    { "area": "Andheri", "locality": "JVLR", "count": 5 }
  ],
  "rawNewToMeetingAgg": [
    { "_id": "New", "count": 25 },
    { "_id": "Meeting Booked", "count": 5 }
  ]
}
```

---

## 8. Users (Admin only)

> 🔒 Requires `admin` role

### `GET /api/users`

List all users (password hashes excluded).

**Response (200):**
```json
[
  {
    "_id": "...",
    "name": "ACS Admin",
    "email": "admin@acs.local",
    "role": "admin",
    "isActive": true,
    "createdAt": "..."
  }
]
```

---

### `POST /api/users`

Create a new user.

**Request Body:**
```json
{
  "name": "Priya Sales",          // required
  "email": "priya@acs.local",     // required
  "password": "securepass",       // required
  "phone": "+919876543210",       // optional
  "role": "sales"                 // optional — admin | sales (default: sales)
}
```

**Response (201):**
```json
{
  "id": "...",
  "name": "Priya Sales",
  "email": "priya@acs.local",
  "phone": "+919876543210",
  "role": "sales"
}
```

**Errors:**
| Code | Message |
|------|---------|
| 400 | `Name, email and password are required` |
| 409 | `User with this email already exists` |

---

### `DELETE /api/users/:id`

Remove a user. Cannot delete yourself or the last admin.

**Response (200):**
```json
{ "message": "User removed" }
```

**Errors:**
| Code | Message |
|------|---------|
| 400 | `You cannot remove your own account` |
| 400 | `At least one admin must remain` |
| 404 | `User not found` |

---

## 9. Data Models

### Lead
| Field | Type | Required | Notes |
|-------|------|:---:|-------|
| `leadId` | String | Auto | Format: `ACS-XXXXXX-XXXX` |
| `leadType` | Enum | ✅ | `CHS`, `Hotel`, `Corporate`, `Developer`, `Other` |
| `name` | String | ✅ | Contact name |
| `phone` | String | ✅ | |
| `email` | String | | |
| `area` | String | ✅ | Locality area |
| `locality` | String | | Property or campus name |
| `propertySizeFlats` | Number | | Approximate flat/slot count |
| `parkingType` | Enum | | `open`, `basement`, `mixed` |
| `currentEvCount` | Number | | Current EVs on site |
| `chargerInterest` | String[] | | kW values e.g. `["3.3","7.4"]` |
| `notes` | String | | |
| `consent` | Boolean | | Default: `false` |
| `stage` | Enum | | `New`, `Qualified`, `Meeting Booked`, `Proposal Sent`, `Won`, `Lost` |
| `owner` | ObjectId → User | | Assigned sales user |
| `leadScore` | Number | | Auto-calculated 0–10 |
| `nextFollowUpDate` | Date | | |
| `decisionMakerKnown` | Boolean | | Default: `false` |
| `duplicateOf` | ObjectId → Lead | | If duplicate detected |

### User
| Field | Type | Required | Notes |
|-------|------|:---:|-------|
| `name` | String | ✅ | |
| `email` | String | ✅ | Unique, lowercase |
| `phone` | String | | |
| `role` | Enum | | `admin`, `sales` (default: `sales`) |
| `isActive` | Boolean | | Default: `true` |

### Activity
| Field | Type | Required | Notes |
|-------|------|:---:|-------|
| `lead` | ObjectId → Lead | ✅ | |
| `user` | ObjectId → User | ✅ | |
| `type` | Enum | ✅ | `call`, `whatsapp`, `email`, `meeting`, `note`, `other` |
| `description` | String | ✅ | |
| `attachmentUrl` | String | | |

### Followup
| Field | Type | Required | Notes |
|-------|------|:---:|-------|
| `lead` | ObjectId → Lead | ✅ | |
| `user` | ObjectId → User | ✅ | |
| `dueDate` | Date | ✅ | |
| `status` | Enum | | `pending`, `completed`, `skipped` |
| `notes` | String | | |

---

## 10. Error Codes

| HTTP Code | Meaning |
|-----------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / validation error |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — insufficient role |
| `404` | Resource not found |
| `409` | Conflict — duplicate resource |
| `500` | Internal server error |

---

## Quick Test with cURL

```bash
# Health check
curl https://server-nine-olive-75.vercel.app/api/health

# Seed admin
curl -X POST https://server-nine-olive-75.vercel.app/api/auth/seed-admin \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}'

# Login
curl -X POST https://server-nine-olive-75.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acs.local","password":"admin123"}'

# Get leads (use token from login response)
curl https://server-nine-olive-75.vercel.app/api/leads \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

> **Built by ACS Energy · v1.0**
