# Pet Information System — Mobile API Documentation

**Version:** 1.0  
**Base URL:** `{APP_URL}/api/v1`  
**Format:** JSON  
**Authentication:** Laravel Sanctum Bearer token

---

## Phase 0 — Scope

This API provides **full clinic mobile** access for all roles:

| Role | Access |
|------|--------|
| `super_admin` | Full system |
| `veterinarian` | Clinical records, appointments, vaccinations |
| `receptionist` | Clients, scheduling, front desk |
| `groomer` | Grooming records |
| `cashier` | Billing, pet shop checkout |
| `customer` | Own pets, appointments, pet shop |

The existing **web app (Inertia)** continues to run unchanged. Mobile clients use this API only.

---

## Phase 1 — Authentication

### Register (customer)

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password",
  "password_confirmation": "password"
}
```

**Response `201`**

```json
{
  "message": "Registration successful.",
  "data": {
    "token": "1|...",
    "token_type": "Bearer",
    "user": { "id": 1, "name": "Jane Doe", "email": "jane@example.com", "role": "customer", "client_id": 1 }
  }
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "jane@example.com",
  "password": "password"
}
```

### Authenticated requests

```http
Authorization: Bearer {token}
Accept: application/json
```

### Current user

```http
GET /api/v1/auth/user
```

**Response `200`**

```json
{
  "message": "Success",
  "data": {
    "user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@petcare.test",
      "role": "super_admin",
      "client_id": null,
      "email_verified_at": "2026-05-20T07:26:09+00:00"
    }
  }
}
```

### Logout

```http
POST /api/v1/auth/logout
```

---

## Standard response format

**Success**

```json
{
  "message": "Success",
  "data": { ... }
}
```

**Validation error `422`**

```json
{
  "message": "The given data was invalid.",
  "errors": { "field": ["Error message"] }
}
```

**Unauthorized `401` / Forbidden `403`**

```json
{ "message": "You do not have permission to access this resource." }
```

---

## Phase 2–3 — Endpoints by module

### Dashboard

| Method | Path | Roles |
|--------|------|-------|
| GET | `/dashboard` | All authenticated |

Returns stats, medicine alerts (staff), upcoming appointments, due health events.

---

### Clients

| Method | Path | Roles |
|--------|------|-------|
| GET | `/clients` | super_admin, receptionist |
| POST | `/clients` | super_admin, receptionist |
| PUT | `/clients/{id}` | super_admin, receptionist |
| DELETE | `/clients/{id}` | super_admin, receptionist |

**Create body:** `name`, `contact`, `email?`, `address?`

---

### Pets

| Method | Path | Roles |
|--------|------|-------|
| GET | `/pets` | super_admin, veterinarian, receptionist, customer, cashier |
| POST | `/pets` | super_admin, veterinarian, receptionist, customer |
| GET | `/pets/{id}` | super_admin, veterinarian, receptionist, customer, cashier |
| PUT/POST | `/pets/{id}` | super_admin, veterinarian, receptionist, customer |
| DELETE | `/pets/{id}` | super_admin, veterinarian, receptionist, customer |
| GET | `/pets/{id}/client-record` | super_admin, veterinarian, receptionist, customer, cashier |

**Note:** Use `POST /pets/{id}` with `multipart/form-data` when uploading a photo from mobile.

**Create/update fields:** `client_id`, `pet_name`, `species`, `breed?`, `age?`, `gender?`, `birth_date?`, `weight?`, `color?`, `microchip_no?`, `vaccination_status?` (`up_to_date|partial|not_vaccinated|unknown`), `medical_history?`, `photo?` (file)

Customers are scoped to their linked `client_id` automatically.

---

### Health records (nested under pet)

| Method | Path | Roles |
|--------|------|-------|
| POST | `/pets/{pet}/health-records` | super_admin, veterinarian, receptionist |
| PUT/POST | `/pets/{pet}/health-records/{id}` | super_admin, veterinarian, receptionist |
| DELETE | `/pets/{pet}/health-records/{id}` | super_admin, veterinarian, receptionist |
| DELETE | `/pets/{pet}/health-records/{id}/sticker` | super_admin, veterinarian, receptionist |

**Types:** `consultation`, `vaccination`, `grooming`, `medication`, `surgery`, `boarding`, `emergency_care`

**Fields:** `type`, `title`, `description?`, `medicine_id?`, `medication_quantity?`, `medication_lines?[]`, `record_date`, `next_due_date?`, `unit_price?`, `quantity?`, `veterinarian_notes?`, `sticker_photo?` (vaccination only, multipart)

---

### Appointments

| Method | Path | Roles |
|--------|------|-------|
| GET | `/appointments` | super_admin, veterinarian, receptionist, cashier, customer |
| POST | `/appointments` | super_admin, veterinarian, receptionist, cashier, customer |
| PUT | `/appointments/{id}` | super_admin, veterinarian, receptionist, cashier, customer |
| DELETE | `/appointments/{id}` | super_admin, veterinarian, receptionist, cashier, customer |

**Types:** `checkup`, `vaccination`, `grooming`, `consultation`, `surgery`, `boarding`, `emergency_care`, `other`  
**Status:** `scheduled`, `completed`, `cancelled` (customers can only create `scheduled`; updates force `cancelled`)

---

### Medicines (inventory)

| Method | Path | Roles |
|--------|------|-------|
| GET | `/medicines` | super_admin, veterinarian, receptionist |
| POST | `/medicines` | super_admin, veterinarian, receptionist |
| PUT | `/medicines/{id}` | super_admin, veterinarian, receptionist |
| DELETE | `/medicines/{id}` | super_admin, veterinarian, receptionist |

**Categories:** `medicine`, `vaccine`, `supplement_vitamin`, `consumable_supply`, `parasite_control`, `grooming_hygiene`, `pet_food`

---

### Vaccinations

| Method | Path | Roles |
|--------|------|-------|
| GET | `/vaccinations` | super_admin, veterinarian, receptionist, cashier |
| POST | `/vaccinations` | super_admin, veterinarian, receptionist |
| PUT | `/vaccinations/{id}` | super_admin, veterinarian, receptionist |
| DELETE | `/vaccinations/{id}` | super_admin, veterinarian, receptionist |

---

### Grooming

| Method | Path | Roles |
|--------|------|-------|
| GET | `/grooming` | super_admin, groomer, receptionist, cashier, veterinarian |
| POST | `/grooming` | super_admin, groomer, receptionist |
| PUT | `/grooming/{id}` | super_admin, groomer, receptionist |
| DELETE | `/grooming/{id}` | super_admin, groomer, receptionist |

---

### Billing (clinic services)

| Method | Path | Roles |
|--------|------|-------|
| GET | `/billing` | super_admin, cashier, receptionist |
| GET | `/billing/{id}` | super_admin, cashier, receptionist |
| GET | `/billing/{id}/receipt` | super_admin, cashier, receptionist |
| POST | `/billing` | super_admin, cashier, receptionist |
| POST | `/billing/generate/{pet}` | super_admin, cashier, receptionist |
| PUT | `/billing/{id}` | super_admin, cashier, receptionist |
| DELETE | `/billing/{id}` | super_admin, cashier, receptionist |
| POST | `/billing/{id}/payments` | super_admin, cashier, receptionist |

**Payment methods:** `cash`, `card`, `gcash`, `maya`, `bank_transfer`  
**Invoice status:** `unpaid`, `partial`, `paid`, `cancelled`

---

### Pet shop

| Method | Path | Roles |
|--------|------|-------|
| GET | `/pet-shop` | super_admin, veterinarian, receptionist, customer, cashier |
| POST | `/pet-shop/checkout` | super_admin, cashier, receptionist, customer |
| POST | `/pet-shop/{medicine}` | super_admin (product update) |

**Checkout body:**

```json
{
  "client_id": 1,
  "items": [{ "medicine_id": 5, "quantity": 2 }],
  "notes": "Optional note"
}
```

---

### Pet shop billing

| Method | Path | Roles |
|--------|------|-------|
| GET | `/pet-shop-billing` | super_admin, cashier, receptionist |
| PUT | `/pet-shop-billing/{id}` | super_admin, cashier, receptionist |
| POST | `/pet-shop-billing/{id}/payments` | super_admin, cashier, receptionist |
| DELETE | `/pet-shop-billing/{id}` | super_admin, cashier, receptionist |

---

### Service catalog

| Method | Path | Roles |
|--------|------|-------|
| GET | `/service-catalog` | super_admin, veterinarian, receptionist, cashier |
| POST | `/service-catalog` | super_admin, veterinarian, receptionist, cashier |
| PUT | `/service-catalog/{id}` | super_admin, veterinarian, receptionist, cashier |
| DELETE | `/service-catalog/{id}` | super_admin, veterinarian, receptionist, cashier |

---

### Notifications

| Method | Path | Roles |
|--------|------|-------|
| GET | `/notifications` | super_admin, veterinarian, receptionist, cashier, customer |

Staff: inventory alerts + system notifications. Customers: appointments, due health/vaccination reminders.

---

### Reports

| Method | Path | Roles |
|--------|------|-------|
| GET | `/reports` | super_admin, veterinarian, receptionist, cashier |
| GET | `/reports/pets` | super_admin, veterinarian, receptionist, cashier |
| GET | `/reports/inventory` | super_admin, veterinarian, receptionist, cashier |
| GET | `/reports/pets/export` | super_admin, veterinarian, receptionist, cashier (CSV download) |
| GET | `/reports/inventory/export` | super_admin, veterinarian, receptionist, cashier (CSV download) |

---

### Admin users

| Method | Path | Roles |
|--------|------|-------|
| GET | `/admin/users` | super_admin |
| POST | `/admin/users` | super_admin |
| PUT | `/admin/users/{id}/role` | super_admin |
| DELETE | `/admin/users/{id}` | super_admin |

**Roles:** `super_admin`, `veterinarian`, `receptionist`, `groomer`, `customer`, `cashier`

---

### Nearby places

| Method | Path | Roles |
|--------|------|-------|
| GET | `/nearby-places` | All authenticated |
| POST | `/nearby-places/geocode` | All authenticated |
| POST | `/nearby-places/search` | All authenticated |

Requires `GEOAPIFY_API_KEY` in `.env` (see `config/services.php` → `geoapify.key`).

**Note:** Geocode and search responses are **not** wrapped in `{ message, data }`. They return JSON directly (or `{ message }` on error).

**Geocode** — `POST /api/v1/nearby-places/geocode`

```json
{ "place": "Quezon City, Philippines" }
```

**Response `200`**

```json
{
  "lat": 14.676,
  "lng": 121.0437,
  "label": "Quezon City, Philippines"
}
```

**Search** — `POST /api/v1/nearby-places/search`

```json
{
  "lat": 14.676,
  "lng": 121.0437,
  "type": "all",
  "radius": 5000
}
```

- `type` (optional): `all`, `vet`, `petshop`, `grooming` (default `all`)
- `radius` (optional): meters, 500–20000 (default `5000`)

**Response `200`:** JSON array of places (`name`, `address`, `distance_m`, `phone`, `website`, `lat`, `lng`, …).

**GET `/nearby-places`:** Returns `{ "message": "Success", "data": { "message": "Use geocode and search endpoints..." } }`.

---

### Survey

| Method | Path | Roles |
|--------|------|-------|
| GET | `/survey` | All authenticated (returns questions) |
| POST | `/survey` | All authenticated |
| GET | `/survey/results` | All authenticated |

**Submit:** `respondent_name?`, `q1`–`q10` (1–5), `comments?`

---

### Profile

| Method | Path | Roles |
|--------|------|-------|
| GET | `/profile` | All authenticated |
| PATCH | `/profile` | All authenticated (`name`, `email` only) |
| PUT | `/profile/password` | All authenticated |
| DELETE | `/profile` | All authenticated (requires `password`) |

**Update password** body: `current_password`, `password`, `password_confirmation`

**Delete account** body: `{ "password": "your-current-password" }`

---

## Phase 4 — OpenAPI & tooling

| Artifact | Location |
|----------|----------|
| OpenAPI 3.0 spec | `docs/openapi.yaml` (synced with `routes/api.php`) |
| This guide | `docs/MOBILE_API.md` (authoritative for request/response detail) |
| Route list | `php artisan route:list --path=api` |

Import `docs/openapi.yaml` into **Postman**, **Insomnia**, or **Swagger UI** for interactive testing. If the spec and this guide differ, prefer **`MOBILE_API.md`** and the live API.

### Quick test (curl)

```bash
# Login
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Dashboard
curl http://127.0.0.1:8000/api/v1/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

---

## Versioning policy

- Current version: **v1** (`/api/v1/...`)
- Breaking changes require a new prefix (`/api/v2/...`)
- Non-breaking additions (new optional fields/endpoints) may be added to v1

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `APP_URL` | Base URL for API |
| `SANCTUM_STATEFUL_DOMAINS` | Only needed for SPA cookie auth (not mobile tokens) |
| `AWS_*` | S3 for pet photos, vaccine stickers, shop images |
| `GEOAPIFY_API_KEY` | Nearby places search |
