# Pet Information System — Mobile API Documentation

**Version:** 1.0  
**Base URL:** `{APP_URL}/api/v1`  
**Format:** JSON  
**Authentication:** Laravel Sanctum Bearer token

One shared API for all roles. Access is controlled per endpoint via the user's `role` (returned at login). Customers use a subset of endpoints only.

---

## Phase 0 — Scope

| Role | Mobile API access |
|------|-------------------|
| `super_admin` | Full system |
| `veterinarian` | Clinical records, appointments, vaccinations, grooming (read) |
| `receptionist` | Clients, scheduling, front desk, grooming |
| `groomer` | Grooming records |
| `cashier` | Billing, pet shop checkout |
| `customer` | Own pets, appointments, pet shop, notifications |
| `clinic_owner` | Primarily **web app**; most mobile endpoints return `403` |

The existing **web app (Inertia)** continues to run unchanged. Mobile clients use this API.

---

## Customer mobile endpoints (quick reference)

| Endpoint | Customer notes |
|----------|----------------|
| `POST /auth/register` | Address + coordinates required (see Register below) |
| `POST /auth/login` | Same login as all roles |
| `GET /dashboard` | Own pets/appointments stats; no inventory alerts |
| `GET/POST/PUT/DELETE /pets` | Auto-scoped to `client_id`; `client_id` optional on write |
| `GET /pets/{id}/client-record` | Read-only health view |
| `GET/POST/PUT/DELETE /appointments` | Own data only; create forces `scheduled`; update forces `cancelled` |
| `GET /pet-shop` | Returns `customer_client_id`, `can_checkout` |
| `POST /pet-shop/checkout` | `client_id` must match logged-in customer's `client_id` |
| `GET /notifications` | Returns `{ notifications, is_customer: true }` |
| `GET/POST /nearby-places/*` | All authenticated |
| `GET/PATCH /profile` | All authenticated |

---

## Phase 1 — Authentication

### Register (customer)

Creates a `users` row with `role: customer` and links a `clients` record automatically. **`contact` is set server-side (`N/A`)** — unlike web registration, which requires `contact`.

**Required fields:** `name`, `email`, `password`, `password_confirmation`, `address_line1`, `barangay`, `city`, `province`, `latitude`, `longitude`

**Optional fields:** `address_line2`, `postal_code`, `country`, `address`, `address_formatted`, `geoapify_place_id`, `geoapify_label`

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password",
  "password_confirmation": "password",
  "address_line1": "123 Main St",
  "barangay": "Barangay Central",
  "city": "Quezon City",
  "province": "Metro Manila",
  "postal_code": "1100",
  "country": "Philippines",
  "latitude": 14.676,
  "longitude": 121.0437
}
```

**Response `201`**

```json
{
  "message": "Registration successful.",
  "data": {
    "token": "1|...",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "customer",
      "client_id": 1,
      "email_verified_at": null
    }
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

**Customer response `data` keys:** `stats` (pets, clients, appointments_today, medicines=0), `upcoming_appointments`, `due_health_records`, `appointments_section_title`, `can_manage_appointment_status` (false), empty `expired_medicines`, `critical_medicines`, `expiring_soon`.

**Staff response `data` keys:** `stats`, `expired_medicines`, `critical_medicines`, `expiring_soon`, `upcoming_appointments`, `due_health_records`, `can_manage_appointment_status`.

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

**Index response `data` keys:** `pets`, `clients`, `can_manage_records`.

**Note:** Use `POST /pets/{id}` with `multipart/form-data` when uploading a photo from mobile.

**Create/update fields:** `client_id`, `pet_name`, `species`, `breed?`, `age?`, `gender?`, `birth_date?`, `weight?`, `color?`, `microchip_no?`, `vaccination_status?` (`up_to_date|partial|not_vaccinated|unknown`), `medical_history?`, `photo?` (file)

Customers are scoped to their linked `client_id` automatically; `client_id` is optional on create/update for customers.

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

**Index response `data` keys:** `appointments`, `pets`, `clients`, `can_manage_status`, `service_types`.

**Types:** `checkup`, `vaccination`, `grooming`, `consultation`, `surgery`, `boarding`, `emergency_care`, `other`  
**Status:** `scheduled`, `completed`, `cancelled`

**Customer rules:** On create, server forces `status: scheduled` and sets `client_id` from the logged-in user. On update, server forces `status: cancelled`. Customers cannot set `completed`. Inactive pets cannot be scheduled.

**Body fields:** `pet_id`, `client_id` (optional for customers), `scheduled_at`, `type`, `status`, `notes?`

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

**Index response `data` keys:** `products`, `categories`, `clients` (staff only), `can_manage_products`, `can_checkout`, `can_select_client`, `customer_client_id`.

**Checkout body:**

```json
{
  "client_id": 1,
  "items": [{ "medicine_id": 5, "quantity": 2 }],
  "notes": "Optional note"
}
```

Customers must use their own `client_id` (from `GET /auth/user` or `customer_client_id` on pet-shop index).

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

**Response `data` keys:** `notifications`, `is_customer`.

- **Customers:** upcoming appointments and due health/vaccination reminders.
- **Staff:** inventory expiry, critical stock, and expiring-soon alerts.

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

**Assignable roles (admin API):** `super_admin`, `veterinarian`, `receptionist`, `groomer`, `customer`, `cashier`  
(`clinic_owner` is not assignable via this API.)

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

## Web-only features (not in API v1)

These exist on the **web app** but are **not** available in `routes/api.php`:

| Feature | Web route |
|---------|-----------|
| Appointment rating | `POST /appointments/{id}/rating` |
| Pet activate/deactivate toggle | `PATCH /pets/{id}/toggle-active` |
| Grooming slot availability | `POST /appointments/grooming-slot-availability` |
| Unified billing checkout from appointments | `POST /billing/checkout` |
| Pet shop reports & CSV export | `/pet-shop-reports` |
| Clinic billing reports & CSV export | `GET /billing/export` |
| Customer appointment `clinic_id` | Required on web; **not accepted** by mobile API appointments yet |

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
