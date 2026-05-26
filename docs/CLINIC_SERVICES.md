# Clinic Services Guide

This document explains how **Surgery**, **Boarding / Hotel**, and **Emergency Care** work in the Pet Information System today, and suggested future improvements.

## Services Supported

| Service | Appointment type | Primary module |
|--------|------------------|----------------|
| Checkup | `checkup` | Appointments → Health Records |
| Vaccination | `vaccination` | Appointments → Vaccinations |
| Grooming | `grooming` | Appointments → Grooming |
| Consultation | `consultation` | Appointments → Health Records |
| **Surgery** | `surgery` | Appointments → Health Records → Billing |
| **Boarding / Hotel** | `boarding` | Appointments → Health Records → Billing |
| **Emergency Care** | `emergency_care` | Appointments → Health Records → Billing |

---

## Surgery — Step-by-step process

1. **Register the pet** (if new) under **Pets** with owner/client details.
2. **Schedule appointment** under **Appointments** → Type: **Surgery** → set date/time and notes (procedure, fasting instructions).
3. **Pre-op health record** (optional): Open **Pets → View** → Add Health Record → Type: **Surgery** → title e.g. "Pre-operative assessment" → set **Next Due** for post-op checkup.
4. **Day of surgery**: Staff marks appointment **Complete** on Appointments or Dashboard.
5. **Post-op documentation**: Add Health Record → Type: **Surgery** → notes, medication if any, **Next Due** for suture removal or follow-up.
6. **Billing**: **Billing** → link invoice to the surgery appointment → record payment.
7. **Customer visibility**: Owner sees appointment on Dashboard/Notifications and health history on the pet profile.

---

## Boarding / Hotel — Step-by-step process

1. **Verify pet profile** is up to date (vaccination status, medical history, emergency contact).
2. **Schedule appointment** → Type: **Boarding / Hotel** → set **check-in date/time** in scheduled_at; use notes for check-out date, room/cage, feeding instructions.
3. **Check-in**: Reception confirms arrival and marks appointment **Complete** when stay begins (or keep scheduled until check-out—clinic policy).
4. **During stay**: Add Health Record → Type: **Boarding** for daily logs (feeding, behavior, medication given).
5. **Check-out & billing**: Create **Billing** invoice linked to boarding appointment (daily rate × nights + extras).
6. **Reminders**: Set **Next Due** on health record if a follow-up grooming or checkup is recommended after boarding.

---

## Emergency Care — Step-by-step process

1. **Walk-in or phone triage**: Reception creates appointment immediately → Type: **Emergency Care** → nearest available `scheduled_at`.
2. **Triage notes**: Use appointment **Notes** for chief complaint, vitals, urgency level.
3. **Treatment**: Veterinarian adds Health Record → Type: **Emergency Care** → diagnosis, treatment, medicines used.
4. **Inventory**: If medication is used, record via Health Record **Medication** type or link to medicine inventory.
5. **Stabilization / referral**: Document outcome in health record notes; set **Next Due** for recheck.
6. **Billing**: Create urgent invoice linked to emergency appointment; collect payment (cash, GCash, etc.).
7. **Notifications**: Customer sees the visit on **Personal Notifications** and pet health history.

---

## General workflow (all services)

```
Client & Pet registered
        ↓
Appointment scheduled (service type selected)
        ↓
Service delivered → Appointment marked Complete
        ↓
Clinical record created (Health / Vaccination / Grooming module)
        ↓
Invoice & payment (Billing)
        ↓
Optional: Next due date → Dashboard & Notifications reminders
```

---

## Future improvements

### Surgery
- Dedicated **Surgery module** with pre-op checklist, anesthesia log, surgeon assignment, and consent form upload.
- Link surgery to **operating room schedule** and **instrument sterilization** tracking.
- Automatic post-op reminder notifications (3-day, 7-day, 14-day).

### Boarding / Hotel
- **Boarding module** with kennel map, occupancy calendar, check-in/check-out timestamps (separate from single appointment datetime).
- Daily care log template (meals, walks, medications).
- Vaccination requirement validation before accepting boarding booking.
- Nightly rate calculator on billing (auto-compute nights).

### Emergency Care
- **Emergency queue** dashboard with triage priority (critical / urgent / stable).
- SMS/push alert to on-call veterinarian.
- Fast-track billing template for emergency fee + procedures.
- Integration with after-hours roster.

### Cross-cutting
- **Customer self-booking** filtered by service type and availability.
- **Service-specific staff roles** (e.g. surgeon, boarding attendant).
- **Reports** breakdown per service type (volume, revenue).
- **PDF service summary** on pet profile (export surgery history, boarding stays).
- **Online payment** for deposits (boarding) and emergency copays.

---

## Running the database update

After pulling these changes, run:

```bash
php artisan migrate
```

This adds `surgery`, `boarding`, and `emergency_care` to appointment and health record types.
