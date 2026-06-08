import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { formatClinicDateTime } from "@/utils/formatDateTime";
import FlashMessage from "@/Components/FlashMessage";
import ListDisplayControls from "@/Components/ListDisplayControls";
import useListDisplayLimit from "@/hooks/useListDisplayLimit";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";
import { clinicScopeSubtitle, clinicScopeTitle } from "@/utils/clinicScope";

const formatDate = (value) => {
    if (!value) {
        return "—";
    }

    const iso = String(value);
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        return `${Number(month)}/${Number(day)}/${year}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString();
};

const categoryStyles = {
    vaccine: "bg-sky-100 text-sky-800",
    vaccination: "bg-blue-100 text-blue-800",
    medication: "bg-purple-100 text-purple-800",
    consultation: "bg-gray-100 text-gray-800",
    grooming: "bg-emerald-100 text-emerald-800",
    surgery: "bg-rose-100 text-rose-800",
    boarding: "bg-amber-100 text-amber-800",
    emergency_care: "bg-red-100 text-red-800",
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

function StatRecordsModal({ title, description, onClose, children }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b px-5 py-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-sm text-gray-500">{description}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md px-2 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                        Close
                    </button>
                </div>
                <div className="max-h-[calc(85vh-5rem)] overflow-y-auto px-5 py-4">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function Dashboard({
    stats,
    statPets = [],
    statClients = [],
    statAppointments = [],
    statMedicines = [],
    expiredMedicines,
    criticalMedicines,
    expiringSoon,
    upcomingAppointments,
    appointmentHistory = [],
    dueHealthRecords,
    appointmentsSectionTitle = "Upcoming Appointments",
    appointmentsStatLabel = "Upcoming Appointments",
    canManageAppointmentStatus = false,
    canDeleteOverdueHealthRecords = false,
}) {
    const page = usePage();
    const isCustomer = page.props.auth.user?.role === "customer";
    const activeClinic = page.props.activeClinic;
    const isPlatformAdmin = page.props.isPlatformAdmin ?? false;
    const appTimezone = page.props.appTimezone ?? "Asia/Manila";
    const [activeStatModal, setActiveStatModal] = useState(null);

    const sortedAppointments = useMemo(
        () =>
            [...upcomingAppointments].sort(
                (a, b) =>
                    new Date(b.scheduled_at).getTime() -
                    new Date(a.scheduled_at).getTime(),
            ),
        [upcomingAppointments],
    );

    const sortedAppointmentHistory = useMemo(
        () =>
            [...appointmentHistory].sort(
                (a, b) =>
                    new Date(b.scheduled_at).getTime() -
                    new Date(a.scheduled_at).getTime(),
            ),
        [appointmentHistory],
    );

    const sortedDueHealthRecords = useMemo(
        () =>
            [...dueHealthRecords].sort(
                (a, b) =>
                    new Date(b.due_date).getTime() -
                    new Date(a.due_date).getTime(),
            ),
        [dueHealthRecords],
    );

    const {
        visibleItems: visibleDueHealthRecords,
        displayLimit,
        setDisplayLimit,
        totalCount: dueHealthListCount,
        showingCount: dueHealthShowingCount,
    } = useListDisplayLimit(sortedDueHealthRecords);

    const deleteOverdueEvent = (event) => {
        if (!confirm("Delete this overdue record? This cannot be undone.")) {
            return;
        }

        if (
            event.source === "health_record" &&
            event.pet_id &&
            event.record_id
        ) {
            router.delete(
                route("health-records.destroy", [
                    event.pet_id,
                    event.record_id,
                ]),
                { preserveScroll: true },
            );
            return;
        }

        if (event.source === "vaccination" && event.record_id) {
            router.delete(route("vaccinations.destroy", event.record_id), {
                preserveScroll: true,
            });
        }
    };

    const statCards = [
        {
            key: "pets",
            label: "Pets",
            value: stats.pets,
        },
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
                  ? `Pets with records or visits at ${activeClinic.name}.`
                  : "All pets across clinics.",
        },
        clients: {
            title: "Clients",
            description: activeClinic
                ? `Clients linked to ${activeClinic.name}.`
                : "Registered pet owners.",
        },
        appointments: {
            title: appointmentsStatLabel,
            description: isCustomer
                ? "Today's and recent pending appointments."
                : activeClinic
                  ? `Today's and recent appointments at ${activeClinic.name}.`
                  : "Today's and recent pending clinic appointments.",
        },
        medicines: {
            title: "Medicines & Supplies",
            description: activeClinic
                ? `Inventory for ${activeClinic.name}.`
                : "Inventory items on record.",
        },
        appointmentHistory: {
            title: "Appointments History",
            description:
                "Recent completed, cancelled, and past appointments.",
        },
    };

    const renderStatModalContent = () => {
        switch (activeStatModal) {
            case "pets":
                if (statPets.length === 0) {
                    return (
                        <p className="text-sm text-gray-500">No pets found.</p>
                    );
                }
                return (
                    <ul className="space-y-3 text-sm">
                        {statPets.map((pet) => (
                            <li
                                key={pet.id}
                                className="rounded-lg border border-gray-200 p-4"
                            >
                                <p className="font-medium text-gray-900">
                                    {pet.pet_name}
                                </p>
                                <p className="mt-1 text-gray-600">
                                    {pet.species}
                                    {pet.breed ? ` · ${pet.breed}` : ""}
                                    {pet.client?.name
                                        ? ` · Owner: ${pet.client.name}`
                                        : ""}
                                </p>
                                <Link
                                    href={route("pets.show", pet.id)}
                                    className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline"
                                    onClick={() => setActiveStatModal(null)}
                                >
                                    View pet record
                                </Link>
                            </li>
                        ))}
                    </ul>
                );
            case "clients":
                if (statClients.length === 0) {
                    return (
                        <p className="text-sm text-gray-500">
                            No clients found.
                        </p>
                    );
                }
                return (
                    <ul className="space-y-3 text-sm">
                        {statClients.map((client) => (
                            <li
                                key={client.id}
                                className="rounded-lg border border-gray-200 p-4"
                            >
                                <p className="font-medium text-gray-900">
                                    {client.name}
                                </p>
                                <p className="mt-1 text-gray-600">
                                    {client.contact || "—"}
                                    {client.email ? ` · ${client.email}` : ""}
                                </p>
                                {client.address && (
                                    <p className="mt-1 text-gray-500">
                                        {client.address}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                );
            case "appointments":
                if (statAppointments.length === 0) {
                    return (
                        <p className="text-sm text-gray-500">
                            No appointments in this period.
                        </p>
                    );
                }
                return (
                    <ul className="space-y-3 text-sm">
                        {statAppointments.map((a) => (
                            <li
                                key={a.id}
                                className="rounded-lg border border-gray-200 p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {a.pet?.pet_name ?? "Unknown pet"}
                                        </p>
                                        <p className="text-gray-600">
                                            {serviceLabels[a.type] ?? a.type}
                                            {!isCustomer && a.client?.name
                                                ? ` · ${a.client.name}`
                                                : ""}
                                        </p>
                                    </div>
                                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-gray-700">
                                        {a.status}
                                    </span>
                                </div>
                                <p className="mt-2 text-gray-500">
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
                if (statMedicines.length === 0) {
                    return (
                        <p className="text-sm text-gray-500">
                            No medicines found.
                        </p>
                    );
                }
                return (
                    <ul className="space-y-3 text-sm">
                        {statMedicines.map((medicine) => (
                            <li
                                key={medicine.id}
                                className="rounded-lg border border-gray-200 p-4"
                            >
                                <p className="font-medium text-gray-900">
                                    {medicine.name}
                                </p>
                                <p className="mt-1 text-gray-600">
                                    {medicine.category || "Uncategorized"} ·{" "}
                                    {medicine.quantity} {medicine.unit}
                                    {medicine.unit_price != null
                                        ? ` · ₱${Number(medicine.unit_price).toFixed(2)}`
                                        : ""}
                                </p>
                                {medicine.expiry_date && (
                                    <p className="mt-1 text-gray-500">
                                        Expires:{" "}
                                        {formatDate(medicine.expiry_date)}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                );
            case "appointmentHistory":
                if (sortedAppointmentHistory.length === 0) {
                    return (
                        <p className="text-sm text-gray-500">
                            No appointment history yet.
                        </p>
                    );
                }
                return (
                    <ul className="space-y-3 text-sm">
                        {sortedAppointmentHistory.map((a) => (
                            <li
                                key={a.id}
                                className="rounded-lg border border-gray-200 p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {a.pet?.pet_name ?? "Unknown pet"}
                                        </p>
                                        <p className="text-gray-600">
                                            {serviceLabels[a.type] ?? a.type}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${
                                            a.status === "completed"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : a.status === "cancelled"
                                                  ? "bg-red-100 text-red-800"
                                                  : "bg-gray-100 text-gray-800"
                                        }`}
                                    >
                                        {a.status}
                                    </span>
                                </div>
                                <p className="mt-2 text-gray-500">
                                    {formatClinicDateTime(
                                        a.scheduled_at,
                                        appTimezone,
                                    )}
                                </p>
                                {a.notes && (
                                    <p className="mt-2 text-gray-600">
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
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                        {clinicScopeTitle("Pet Care Management Dashboard", activeClinic, isPlatformAdmin)}
                    </h2>
                    {clinicScopeSubtitle(activeClinic, isPlatformAdmin) && (
                        <p className="mt-1 text-sm text-gray-500">
                            {clinicScopeSubtitle(activeClinic, isPlatformAdmin)}
                        </p>
                    )}
                </div>
            }
        >
            <Head title="Dashboard" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <div
                        className={`grid gap-3 sm:grid-cols-2 ${isCustomer ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
                    >
                        {statCards.map((s) => (
                            <button
                                key={s.key}
                                type="button"
                                onClick={() => setActiveStatModal(s.key)}
                                className="rounded-xl border border-gray-100 bg-white p-3.5 text-left shadow-sm transition hover:border-indigo-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-1"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-1 shrink-0 rounded-full bg-indigo-500/70" />
                                    <div className="min-w-0">
                                        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                            {s.label}
                                        </p>
                                        <p className="mt-0.5 text-2xl font-semibold tabular-nums text-indigo-600">
                                            {s.value}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {activeStatModal && statModalMeta[activeStatModal] && (
                        <StatRecordsModal
                            title={statModalMeta[activeStatModal].title}
                            description={statModalMeta[activeStatModal].description}
                            onClose={() => setActiveStatModal(null)}
                        >
                            {renderStatModalContent()}
                        </StatRecordsModal>
                    )}

                    {(expiredMedicines.length > 0 ||
                        criticalMedicines.length > 0) && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                            <h3 className="font-semibold text-red-800">
                                Stock Alerts
                            </h3>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                                {expiredMedicines.map((m) => (
                                    <li key={`exp-${m.id}`}>
                                        {m.name} — expired ({m.expiry_date})
                                    </li>
                                ))}
                                {criticalMedicines.map((m) => (
                                    <li key={`crit-${m.id}`}>
                                        {m.name} — critical stock ({m.quantity}{" "}
                                        {m.unit})
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href={route("notifications.index")}
                                className="mt-2 inline-block text-sm font-medium text-red-800 underline"
                            >
                                View all notifications
                            </Link>
                        </div>
                    )}

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-lg bg-white p-5 shadow">
                            <h3 className="mb-3 font-semibold">
                                {appointmentsSectionTitle}
                            </h3>
                            {upcomingAppointments.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No upcoming appointments.
                                </p>
                            ) : (
                                <ul className="space-y-2 text-sm">
                                    {sortedAppointments.map((a) => (
                                        <li
                                            key={a.id}
                                            className="border-b pb-2"
                                        >
                                            <strong>{a.pet?.pet_name}</strong> —{" "}
                                            {serviceLabels[a.type] ?? a.type}{" "}
                                            with {a.client?.name}
                                            <br />
                                            <span className="text-gray-500">
                                                {formatClinicDateTime(
                                                    a.scheduled_at,
                                                    appTimezone,
                                                )}
                                            </span>
                                            <span className="ml-2 text-xs font-medium uppercase text-gray-600">
                                                [{a.status}]
                                            </span>
                                            {canManageAppointmentStatus &&
                                                a.status !== "completed" && (
                                                    <button
                                                        type="button"
                                                        className="ml-3 text-xs font-medium text-emerald-700 hover:underline"
                                                        onClick={() =>
                                                            router.put(
                                                                route(
                                                                    "appointments.update",
                                                                    a.id,
                                                                ),
                                                                {
                                                                    pet_id: a.pet_id,
                                                                    client_id:
                                                                        a.client_id,
                                                                    scheduled_at:
                                                                        a.scheduled_at,
                                                                    type: a.type,
                                                                    status: "completed",
                                                                    notes:
                                                                        a.notes ??
                                                                        "",
                                                                },
                                                            )
                                                        }
                                                    >
                                                        Mark completed
                                                    </button>
                                                )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="rounded-lg bg-white p-5 shadow">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold">
                                        Health Monitoring (Due Soon)
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Vaccines, medications, and follow-ups
                                        within 30 days
                                    </p>
                                </div>
                                <Link
                                    href={route("notifications.index")}
                                    className="text-xs font-medium text-indigo-600 hover:underline"
                                >
                                    All alerts
                                </Link>
                            </div>
                            {dueHealthRecords.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No upcoming due dates.
                                </p>
                            ) : (
                                <>
                                    <ul className="space-y-3 text-sm">
                                        {visibleDueHealthRecords.map(
                                            (event) => (
                                                <li
                                                    key={event.id}
                                                    className="border-b pb-3 last:border-b-0 last:pb-0"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span
                                                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                                                                categoryStyles[
                                                                    event
                                                                        .category
                                                                ] ??
                                                                "bg-gray-100 text-gray-800"
                                                            }`}
                                                        >
                                                            {
                                                                event.category_label
                                                            }
                                                        </span>
                                                        {event.is_overdue && (
                                                            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                                                                Overdue
                                                            </span>
                                                        )}
                                                        {/* {event.is_overdue &&
                                                    canDeleteOverdueHealthRecords && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                deleteOverdueEvent(
                                                                    event,
                                                                )
                                                            }
                                                            className="text-xs font-medium text-red-600 hover:underline"
                                                        >
                                                            Delete
                                                        </button>
                                                    )} */}
                                                    </div>
                                                    <p className="mt-1">
                                                        {event.pet_id ? (
                                                            <Link
                                                                href={route(
                                                                    "pets.show",
                                                                    event.pet_id,
                                                                )}
                                                                className="font-medium text-indigo-600 hover:underline"
                                                            >
                                                                {event.pet_name ??
                                                                    "Unknown pet"}
                                                            </Link>
                                                        ) : (
                                                            <strong>
                                                                {event.pet_name ??
                                                                    "Unknown pet"}
                                                            </strong>
                                                        )}
                                                        {" — "}
                                                        {event.title}
                                                        {event.detail && (
                                                            <span className="text-gray-600">
                                                                {" "}
                                                                ({event.detail})
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-gray-500">
                                                        Due:{" "}
                                                        {formatDate(
                                                            event.due_date,
                                                        )}
                                                    </p>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                    <ListDisplayControls
                                        totalCount={dueHealthListCount}
                                        showingCount={dueHealthShowingCount}
                                        displayLimit={displayLimit}
                                        onLimitChange={setDisplayLimit}
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {expiringSoon.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            <strong>Expiring within 30 days:</strong>{" "}
                            {expiringSoon.map((m) => m.name).join(", ")}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
