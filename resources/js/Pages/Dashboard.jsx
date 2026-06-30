import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import StoreDownloadBadges from "@/Components/StoreDownloadBadges";
import { formatClinicDateTime } from "@/utils/formatDateTime";
import FlashMessage from "@/Components/FlashMessage";
import { Head, Link, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";

const formatDate = (value) => {
    if (!value) return "—";
    const iso = String(value);
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        return `${Number(month)}/${Number(day)}/${year}`;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
};

const serviceLabels = {
    checkup: "Checkup",
    vaccination: "Vaccination",
    grooming: "Grooming",
    consultation: "Consultation",
    surgery: "Surgery",
    boarding: "Boarding / Hotel",
    emergency_care: "Emergency Care",
    other: "Other",
};

const STAT_THEMES = {
    pets: {
        gradient: "from-violet-500 to-fuchsia-400",
        image: "/images/logos/registered-pet.png",
        imageAlt: "Registered pet",
        label_color: "text-violet-100",
    },
    clients: {
        gradient: "from-orange-400 to-amber-300",
        image: "/images/logos/clients.webp",
        imageAlt: "Pet owner with dog",
        label_color: "text-orange-100",
    },
    appointments: {
        gradient: "from-rose-500 to-pink-400",
        image: "/images/logos/upcoming-event.webp",
        imageAlt: "Veterinary appointment",
        label_color: "text-rose-100",
    },
    medicines: {
        gradient: "from-teal-500 to-cyan-400",
        image: "/images/logos/medicine-logo.jpg",
        imageAlt: "Pet care supplies",
        label_color: "text-teal-100",
    },
    appointmentHistory: {
        gradient: "from-indigo-500 to-blue-400",
        image: "/images/dashboard/grooming-dog2.png",
        imageAlt: "Past appointment",
        label_color: "text-indigo-100",
    },
};

const CLINIC_CARD_GRADIENTS = [
    {
        from: "from-violet-500",
        to: "to-fuchsia-400",
        light: "bg-violet-50",
        text: "text-violet-700",
    },
    {
        from: "from-orange-400",
        to: "to-amber-300",
        light: "bg-orange-50",
        text: "text-orange-700",
    },
    {
        from: "from-pink-500",
        to: "to-rose-400",
        light: "bg-pink-50",
        text: "text-pink-700",
    },
    {
        from: "from-teal-500",
        to: "to-cyan-400",
        light: "bg-teal-50",
        text: "text-teal-700",
    },
    {
        from: "from-emerald-500",
        to: "to-lime-400",
        light: "bg-emerald-50",
        text: "text-emerald-700",
    },
    {
        from: "from-indigo-500",
        to: "to-blue-400",
        light: "bg-indigo-50",
        text: "text-indigo-700",
    },
];

const SERVICE_PILL = {
    veterinary: "bg-blue-500 text-white",
    vaccination: "bg-sky-500 text-white",
    consultation: "bg-indigo-500 text-white",
    surgery: "bg-rose-500 text-white",
    grooming: "bg-purple-500 text-white",
    pet_shop: "bg-emerald-500 text-white",
};

/* ── Stat modal ── */
function StatRecordsModal({ title, description, onClose, children }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-sm text-gray-500">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
                    >
                        Close
                    </button>
                </div>
                <div className="max-h-[calc(85vh-5rem)] overflow-y-auto px-6 py-4">
                    {children}
                </div>
            </div>
        </div>
    );
}

/* ── Stat card ── */
function StatCard({ label, value, themeKey, onClick }) {
    const t = STAT_THEMES[themeKey] ?? STAT_THEMES.pets;
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-left text-white shadow-md transition hover:-translate-y-1 hover:shadow-xl focus:outline-none ${t.gradient}`}
        >
            {/* decorative blobs */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20" />
            <div className="pointer-events-none absolute -bottom-10 left-2 h-24 w-24 rounded-full bg-white/10" />

            <div className="relative h-16 w-16 overflow-hidden rounded-2xl border-2 border-white/50 shadow-lg ring-2 ring-white/20">
                <img
                    src={t.image}
                    alt={t.imageAlt}
                    className="h-full w-full object-cover"
                />
            </div>
            <p className="relative mt-4 text-5xl font-extrabold tabular-nums">
                {value}
            </p>
            <p
                className={`relative mt-2 text-sm font-semibold tracking-wide ${t.label_color}`}
            >
                {label}
            </p>
            <span className="relative mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/90 transition group-hover:bg-white/30">
                Tap to view →
            </span>
        </button>
    );
}

/* ── Hero photo tile ── */
function PhotoTile({ src, alt, badge, shape, borderColor = "border-white" }) {
    const shapeClass =
        shape === "circle"
            ? "rounded-full"
            : shape === "arch"
              ? "rounded-t-[9999px] rounded-b-3xl"
              : "rounded-3xl";
    return (
        <div
            className={`relative overflow-hidden border-4 ${borderColor} shadow-xl ${shapeClass}`}
            style={{ width: 148, height: 172 }}
        >
            <img src={src} alt={alt} className="h-full w-full object-cover" />
            {badge && (
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 backdrop-blur px-3 py-1 text-[11px] font-bold text-gray-800 shadow-md">
                    {badge}
                </span>
            )}
        </div>
    );
}

/* ── Clinic service card ── */
function ClinicCard({ clinic, index }) {
    const theme = CLINIC_CARD_GRADIENTS[index % CLINIC_CARD_GRADIENTS.length];
    return (
        <div className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-1 hover:shadow-xl">
            {/* coloured header */}
            <div
                className={`relative bg-gradient-to-br ${theme.from} ${theme.to} px-6 py-5 text-white`}
            >
                <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/15" />
                <div className="pointer-events-none absolute bottom-0 left-10 h-16 w-16 rounded-full bg-white/10" />
                <h4 className="relative text-base font-bold leading-snug">
                    {clinic.name}
                </h4>
                {clinic.address && (
                    <p className="relative mt-1 text-xs text-white/80">
                        {clinic.address}
                    </p>
                )}
                {clinic.contact && (
                    <p className="relative mt-0.5 text-xs text-white/70">
                        {clinic.contact}
                    </p>
                )}
            </div>

            {/* services */}
            <div className="px-5 pb-5 pt-4">
                <div className="flex flex-wrap gap-2">
                    {(clinic.services ?? []).map((s) => (
                        <span
                            key={s.key}
                            className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${SERVICE_PILL[s.key] ?? "bg-gray-600 text-white"}`}
                        >
                            {s.label}
                        </span>
                    ))}
                    {(clinic.services ?? []).length === 0 && (
                        <span className="text-sm text-gray-400">
                            Services coming soon
                        </span>
                    )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    {clinic.has_veterinary && (
                        <span
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${theme.light} ${theme.text}`}
                        >
                            Veterinary Clinic
                        </span>
                    )}
                    {clinic.has_grooming && (
                        <span
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${theme.light} ${theme.text}`}
                        >
                            Grooming Salon
                        </span>
                    )}
                    {clinic.has_pet_shop && (
                        <span
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${theme.light} ${theme.text}`}
                        >
                            Pet Shop
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════ MAIN ══════════════════════════════════════════ */
export default function Dashboard({
    stats,
    statPets = [],
    statClients = [],
    statAppointments = [],
    statMedicines = [],
    expiredMedicines = [],
    criticalMedicines = [],
    expiringSoon = [],
    appointmentHistory = [],
    appointmentsStatLabel = "Upcoming Appointments",
    clinicDirectory = [],
}) {
    const page = usePage();
    const user = page.props.auth.user;
    const isCustomer = user?.role === "customer";
    const activeClinic = page.props.activeClinic;
    const appTimezone = page.props.appTimezone ?? "Asia/Manila";
    const [activeStatModal, setActiveStatModal] = useState(null);

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        return h < 12
            ? "Good morning"
            : h < 17
              ? "Good afternoon"
              : "Good evening";
    }, []);

    const firstName = user?.name?.split(" ")[0] ?? "there";

    const sortedHistory = useMemo(
        () =>
            [...appointmentHistory].sort(
                (a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at),
            ),
        [appointmentHistory],
    );

    const statCards = [
        { key: "pets", label: "Registered Pets", value: stats.pets },
        ...(isCustomer
            ? []
            : [{ key: "clients", label: "Clients", value: stats.clients }]),
        {
            key: "appointments",
            label: appointmentsStatLabel,
            value: stats.appointments_today,
        },
        ...(isCustomer
            ? [
                  {
                      key: "appointmentHistory",
                      label: "Appointments History",
                      value: stats.appointments_history ?? 0,
                  },
              ]
            : [
                  {
                      key: "medicines",
                      label: "Medicines & Supplies",
                      value: stats.medicines,
                  },
              ]),
    ];

    const statModalMeta = {
        pets: {
            title: "Pets",
            description: isCustomer
                ? "Your registered pets."
                : activeClinic
                  ? `Pets at ${activeClinic.name}.`
                  : "All pets.",
        },
        clients: {
            title: "Clients",
            description: activeClinic
                ? `Clients at ${activeClinic.name}.`
                : "Registered pet owners.",
        },
        appointments: {
            title: appointmentsStatLabel,
            description: isCustomer
                ? "Today's appointments."
                : "Today's clinic appointments.",
        },
        medicines: {
            title: "Medicines & Supplies",
            description: activeClinic
                ? `Inventory for ${activeClinic.name}.`
                : "All inventory.",
        },
        appointmentHistory: {
            title: "Appointments History",
            description: "Recent completed & cancelled appointments.",
        },
    };

    const renderModalContent = () => {
        switch (activeStatModal) {
            case "pets":
                if (!statPets.length)
                    return (
                        <p className="text-sm text-gray-500">No pets found.</p>
                    );
                return (
                    <ul className="space-y-3 text-sm">
                        {statPets.map((p) => (
                            <li
                                key={p.id}
                                className="rounded-xl border border-gray-100 p-4"
                            >
                                <p className="font-semibold text-gray-900">
                                    {p.pet_name}
                                </p>
                                <p className="text-gray-500">
                                    {p.species}
                                    {p.breed ? ` · ${p.breed}` : ""}
                                    {p.client?.name
                                        ? ` · ${p.client.name}`
                                        : ""}
                                </p>
                                <Link
                                    href={route("pets.show", p.id)}
                                    className="mt-2 inline-block text-sm font-medium text-violet-600 hover:underline"
                                    onClick={() => setActiveStatModal(null)}
                                >
                                    View pet record
                                </Link>
                            </li>
                        ))}
                    </ul>
                );
            case "clients":
                if (!statClients.length)
                    return (
                        <p className="text-sm text-gray-500">
                            No clients found.
                        </p>
                    );
                return (
                    <ul className="space-y-3 text-sm">
                        {statClients.map((c) => (
                            <li
                                key={c.id}
                                className="rounded-xl border border-gray-100 p-4"
                            >
                                <p className="font-semibold text-gray-900">
                                    {c.name}
                                </p>
                                <p className="text-gray-500">
                                    {c.contact || "—"}
                                    {c.email ? ` · ${c.email}` : ""}
                                </p>
                                {c.address && (
                                    <p className="text-gray-400">{c.address}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                );
            case "appointments":
                if (!statAppointments.length)
                    return (
                        <p className="text-sm text-gray-500">
                            No appointments.
                        </p>
                    );
                return (
                    <ul className="space-y-3 text-sm">
                        {statAppointments.map((a) => (
                            <li
                                key={a.id}
                                className="rounded-xl border border-gray-100 p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-gray-900">
                                            {a.pet?.pet_name ?? "Unknown pet"}
                                        </p>
                                        <p className="text-gray-500">
                                            {serviceLabels[a.type] ?? a.type}
                                            {!isCustomer && a.client?.name
                                                ? ` · ${a.client.name}`
                                                : ""}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium uppercase text-gray-700">
                                        {a.status}
                                    </span>
                                </div>
                                <p className="mt-2 text-gray-400">
                                    {formatClinicDateTime(
                                        a.scheduled_at,
                                        appTimezone,
                                    )}
                                </p>
                            </li>
                        ))}
                    </ul>
                );
            case "medicines":
                if (!statMedicines.length)
                    return (
                        <p className="text-sm text-gray-500">
                            No medicines found.
                        </p>
                    );
                return (
                    <ul className="space-y-3 text-sm">
                        {statMedicines.map((m) => (
                            <li
                                key={m.id}
                                className="rounded-xl border border-gray-100 p-4"
                            >
                                <p className="font-semibold text-gray-900">
                                    {m.name}
                                </p>
                                <p className="text-gray-500">
                                    {m.category || "Uncategorized"} ·{" "}
                                    {m.quantity} {m.unit}
                                    {m.unit_price != null
                                        ? ` · ₱${Number(m.unit_price).toFixed(2)}`
                                        : ""}
                                </p>
                                {m.expiry_date && (
                                    <p className="text-gray-400">
                                        Expires: {formatDate(m.expiry_date)}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                );
            case "appointmentHistory":
                if (!sortedHistory.length)
                    return (
                        <p className="text-sm text-gray-500">No history yet.</p>
                    );
                return (
                    <ul className="space-y-3 text-sm">
                        {sortedHistory.map((a) => (
                            <li
                                key={a.id}
                                className="rounded-xl border border-gray-100 p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-gray-900">
                                            {a.pet?.pet_name ?? "Unknown pet"}
                                        </p>
                                        <p className="text-gray-500">
                                            {serviceLabels[a.type] ?? a.type}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${a.status === "completed" ? "bg-emerald-100 text-emerald-800" : a.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}
                                    >
                                        {a.status}
                                    </span>
                                </div>
                                <p className="mt-1 text-gray-400">
                                    {formatClinicDateTime(
                                        a.scheduled_at,
                                        appTimezone,
                                    )}
                                </p>
                                {a.notes && (
                                    <p className="mt-1 text-gray-500">
                                        Notes: {a.notes}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                );
            default:
                return null;
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            {/* ─────────────────── HERO BANNER ─────────────────── */}
            <div className="relative pb-0 pt-10">
                <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-6 lg:flex-row lg:items-end lg:px-8">
                    {/* ── Left copy ── */}
                    <div className="flex-1 pb-10 pt-4 lg:pb-14">
                        <p className="inline-block rounded-full bg-violet-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-violet-600">
                            {greeting}, {firstName}
                        </p>

                        <h1 className="mt-5 text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl lg:text-6xl">
                            Healthy{" "}
                            <span className="relative inline-block">
                                <span className="relative z-10 text-violet-600">
                                    Pets
                                </span>
                                <span
                                    aria-hidden
                                    className="absolute -right-4 -top-2 h-5 w-5 rounded-full bg-amber-400"
                                />
                            </span>
                            , <br className="hidden sm:block" />
                            Happy{" "}
                            <span className="relative inline-block">
                                <span className="relative z-10 text-orange-500">
                                    Lives
                                </span>
                                <span
                                    aria-hidden
                                    className="absolute -left-4 -top-2 h-5 w-5 rounded-full bg-fuchsia-400"
                                />
                            </span>
                            .
                        </h1>

                        <p className="mt-5 max-w-md text-base text-gray-600">
                            Ensure your pets are fully prepared and cared for.
                            Manage appointments, track health, and explore
                            clinic services — all in one place.
                        </p>

                        <div className="mt-8 flex flex-col items-start gap-5">
                            <div className="flex flex-wrap items-center gap-4">
                                <Link
                                    href={route("appointments.index")}
                                    className="rounded-full bg-violet-600 px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-violet-700 hover:shadow-violet-300"
                                >
                                    {isCustomer
                                        ? "Book a Visit"
                                        : "Open Scheduling"}
                                </Link>
                                <Link
                                    href={route("pets.index")}
                                    className="text-sm font-semibold text-gray-700 underline-offset-4 hover:text-violet-600 hover:underline"
                                >
                                    {isCustomer
                                        ? "View My Pets →"
                                        : "Patient records →"}
                                </Link>
                            </div>
                            <StoreDownloadBadges />
                        </div>

                        {/* floating badge */}
                        <div className="mt-10 flex items-center gap-3">
                            <div className="flex h-15 w-15 items-center justify-center rounded-full bg-white shadow-md text-xl">
                                <img
                                    src="/images/dashboard/kitten.png"
                                    alt="Adorable kitten"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-800">
                                    Pet Health Hub
                                </p>
                                <div className="mt-0.5 h-1.5 w-24 rounded-full bg-violet-200">
                                    <div className="h-1.5 w-16 rounded-full bg-violet-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right photo collage ── */}
                    <div className="relative hidden w-full max-w-sm flex-shrink-0 self-end lg:block pb-6">
                        {/* top row */}
                        <div className="flex items-end justify-center gap-4">
                            <PhotoTile
                                src="/images/dashboard/grooming-dog.png"
                                alt="Dog being groomed"
                                shape="circle"
                                borderColor="border-violet-200"
                            />
                            <PhotoTile
                                src="/images/dashboard/vet-cat.png"
                                alt="Cat at vet"
                                shape="arch"
                                badge="Pet Health"
                                borderColor="border-orange-200"
                            />
                        </div>
                        {/* bottom row */}
                        <div className="mt-4 flex items-start justify-center gap-4">
                            <PhotoTile
                                src="/images/dashboard/grooming-dog2.png"
                                alt="Dog grooming session"
                                shape="arch"
                                badge="Pet Care"
                                borderColor="border-pink-200"
                            />
                            <PhotoTile
                                src="/images/dashboard/kitten.png"
                                alt="Adorable kitten"
                                shape="circle"
                                borderColor="border-fuchsia-200"
                            />
                        </div>
                        {/* floating clinic badge */}
                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 shadow-xl">
                            <div>
                                <p className="text-[11px] font-bold text-gray-800">
                                    Veterinary Clinic
                                </p>
                                <p className="text-[10px] text-gray-500">
                                    Licensed &amp; Trusted
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─────────────────── BODY ─────────────────── */}
            <div>
                <FlashMessage />

                {/* stock alerts */}
                {(expiredMedicines.length > 0 ||
                    criticalMedicines.length > 0 ||
                    expiringSoon.length > 0) && (
                    <div className="mx-auto max-w-7xl space-y-3 px-4 pt-6 sm:px-6 lg:px-8">
                        {(expiredMedicines.length > 0 ||
                            criticalMedicines.length > 0) && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                                <h3 className="font-bold text-red-800">
                                    ⚠️ Stock Alerts
                                </h3>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                                    {expiredMedicines.map((m) => (
                                        <li key={`exp-${m.id}`}>
                                            {m.name} — expired ({m.expiry_date})
                                        </li>
                                    ))}
                                    {criticalMedicines.map((m) => (
                                        <li key={`crit-${m.id}`}>
                                            {m.name} — critical stock (
                                            {m.quantity} {m.unit})
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={route("notifications.index")}
                                    className="mt-2 inline-block text-sm font-semibold text-red-800 underline"
                                >
                                    View all notifications
                                </Link>
                            </div>
                        )}
                        {expiringSoon.length > 0 && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                <strong>Expiring within 30 days:</strong>{" "}
                                {expiringSoon.map((m) => m.name).join(", ")}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Stat cards ── */}
                <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                    <p className="mb-5 text-xs font-bold uppercase tracking-widest text-gray-400">
                        Overview
                    </p>
                    <div
                        className={`grid gap-5 sm:grid-cols-2 ${isCustomer ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
                    >
                        {statCards.map((s) => (
                            <StatCard
                                key={s.key}
                                label={s.label}
                                value={s.value}
                                themeKey={s.key}
                                onClick={() => setActiveStatModal(s.key)}
                            />
                        ))}
                    </div>
                </section>

                {activeStatModal && statModalMeta[activeStatModal] && (
                    <StatRecordsModal
                        title={statModalMeta[activeStatModal].title}
                        description={statModalMeta[activeStatModal].description}
                        onClose={() => setActiveStatModal(null)}
                    >
                        {renderModalContent()}
                    </StatRecordsModal>
                )}

                {/* ── Activity placeholder ── */}
                {/* <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
                    <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-violet-50/60 to-orange-50/60 p-10 text-center">
                        <h3 className="mt-4 text-lg font-bold text-gray-900">
                            Activity &amp; Insights
                        </h3>
                        <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">
                            This area is reserved for upcoming analytics —
                            appointment timelines, revenue summaries, health
                            monitoring, and daily clinic activity feeds.
                        </p>
                    </div>
                </section> */}
            </div>

            {/* ─────────────────── "HOW CAN WE HELP" / CLINIC DIRECTORY ─────────────────── */}
            <div>
                <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                                Services Network
                            </p>
                            <h2 className="mt-2 text-3xl font-extrabold text-gray-900">
                                How can we help you
                            </h2>
                            <p className="mt-2 max-w-xl text-sm text-gray-600">
                                Explore every registered clinic and pet shop in
                                the network — their services, locations, and
                                what they offer your furry companions.
                            </p>
                        </div>
                        {!isCustomer && (
                            <Link
                                href={route("appointments.index")}
                                className="rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-violet-700 hover:shadow-violet-300"
                            >
                                Book a Clinic Visit
                            </Link>
                        )}
                    </div>

                    {clinicDirectory.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-amber-200 bg-white p-14 text-center text-sm text-gray-500">
                            No active clinics or shops registered yet.
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {clinicDirectory.map((clinic, i) => (
                                <ClinicCard
                                    key={clinic.id}
                                    clinic={clinic}
                                    index={i}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
