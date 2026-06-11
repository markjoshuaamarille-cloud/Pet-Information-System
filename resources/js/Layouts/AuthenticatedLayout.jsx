import ApplicationLogo from "@/Components/ApplicationLogo";
import AdminClinicMonitor from "@/Components/AdminClinicMonitor";
import Dropdown from "@/Components/Dropdown";
import NavLink from "@/Components/NavLink";
import ResponsiveNavLink from "@/Components/ResponsiveNavLink";
import { formatClinicDateTime } from "@/utils/formatDateTime";
import { Link, usePage, router } from "@inertiajs/react";
import { useState } from "react";

const severityStyle = {
    danger: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
};

const formatDate = (value) => {
    if (!value) {
        return null;
    }

    const iso = String(value);
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        return `${Number(month)}/${Number(day)}/${year}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toLocaleDateString();
};

function CustomerAlertButton({ label, count, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center justify-between border-l-4 border-transparent py-2 pe-4 ps-3 text-base font-medium text-gray-600 transition duration-150 ease-in-out hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 focus:border-gray-300 focus:bg-gray-50 focus:text-gray-800 focus:outline-none"
        >
            <span>{label}</span>
            {count > 0 && (
                <span className="ms-2 shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    {count}
                </span>
            )}
        </button>
    );
}

function CustomerAlertsModal({ type, alerts, appTimezone, onClose }) {
    const isAppointments = type === "appointments";
    const title = isAppointments
        ? "Upcoming Appointments"
        : "Health Monitoring (Due Soon)";
    const items = isAppointments
        ? alerts.upcomingAppointments
        : alerts.healthMonitoring;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b px-5 py-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {isAppointments
                                ? "Your scheduled visits and services."
                                : "Vaccines, medications, and follow-ups due within 30 days."}
                        </p>
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
                    {items.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            {isAppointments
                                ? "No upcoming appointments right now."
                                : "No health reminders due soon."}
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {items.map((item) => (
                                <li
                                    key={item.id}
                                    className={`rounded-lg border p-4 text-sm ${severityStyle[item.severity] ?? severityStyle.info}`}
                                >
                                    {item.title && (
                                        <p className="font-semibold">
                                            {item.title}
                                        </p>
                                    )}
                                    <p className="mt-1">{item.message}</p>
                                    {isAppointments && item.scheduled_at && (
                                        <p className="mt-2 text-xs opacity-80">
                                            {formatClinicDateTime(
                                                item.scheduled_at,
                                                appTimezone,
                                            )}
                                        </p>
                                    )}
                                    {!isAppointments && item.due_date && (
                                        <p className="mt-2 text-xs opacity-80">
                                            Due: {formatDate(item.due_date)}
                                            {item.is_overdue
                                                ? " (Overdue)"
                                                : ""}
                                        </p>
                                    )}
                                    {item.pet_id && (
                                        <Link
                                            href={route(
                                                "pets.show",
                                                item.pet_id,
                                            )}
                                            className="mt-2 inline-block text-sm font-medium underline"
                                            onClick={onClose}
                                        >
                                            View {item.pet_name ?? "pet"} record
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

const navItems = [
    { href: "dashboard", label: "Dashboard", roles: [], module: "dashboard" },
    {
        href: "clients.index",
        label: "Clients",
        roles: ["super_admin", "receptionist"],
    },
    {
        href: "pets.index",
        label: "Pets",
        roles: [
            "super_admin",
            "veterinarian",
            "receptionist",
            "customer",
            "cashier",
            "clinic_owner",
        ],
        module: "pets",
    },
    {
        href: "appointments.index",
        label: "Scheduling",
        roles: [
            "super_admin",
            "veterinarian",
            "receptionist",
            "customer",
            "clinic_owner",
        ],
        module: "scheduling",
    },
    {
        href: "vaccinations.index",
        label: "Vaccinations",
        roles: [
            "super_admin",
            "veterinarian",
            "receptionist",
            "cashier",
            "clinic_owner",
        ],
        module: "vaccinations",
    },
    {
        href: "grooming.index",
        label: "Grooming",
        roles: [
            "super_admin",
            "groomer",
            "receptionist",
            "cashier",
            "veterinarian",
            "clinic_owner",
        ],
        module: "grooming",
    },
    {
        href: "billing.index",
        label: "Billing",
        roles: ["super_admin", "cashier", "receptionist", "clinic_owner"],
        module: "billing",
    },
    {
        href: "pet-shop.index",
        label: "Pet Shop",
        roles: [
            "super_admin",
            "veterinarian",
            "receptionist",
            "customer",
            "cashier",
            "clinic_owner",
        ],
        module: "pet_shop",
    },
    {
        href: "pet-shop-billing.index",
        label: "Pet Shop Billing",
        roles: ["super_admin", "cashier", "receptionist", "clinic_owner"],
        module: "pet_shop_billing",
    },
    {
        href: "pet-shop-reports.index",
        label: "Shop Reports",
        roles: ["super_admin", "clinic_owner", "cashier", "receptionist"],
        module: "pet_shop",
    },
    {
        href: "service-catalog.index",
        label: "Service Catalog",
        roles: [
            "super_admin",
            "veterinarian",
            "receptionist",
            "cashier",
            "clinic_owner",
        ],
        module: "service_catalog",
    },
    {
        href: "medicines.index",
        label: "Inventory",
        roles: ["super_admin", "veterinarian", "receptionist", "clinic_owner"],
        module: "inventory",
    },
    {
        href: "notifications.index",
        label: "Notifications",
        roles: [
            "super_admin",
            "veterinarian",
            "receptionist",
            "cashier",
            "customer",
            "clinic_owner",
        ],
        module: "notifications",
    },
    {
        href: "reports.index",
        label: "Reports",
        roles: [
            "super_admin",
            "veterinarian",
            "receptionist",
            "cashier",
            "clinic_owner",
        ],
        module: "reports",
    },
    { href: "admin.users.index", label: "Admin Users", roles: ["super_admin"] },
    {
        href: "admin.clinics.index",
        label: "Clinic Management",
        roles: ["super_admin"],
    },
    {
        href: "nearby-places.index",
        label: "Nearby Clinics",
        roles: [
            "super_admin",
            "veterinarian",
            "receptionist",
            "customer",
            "cashier",
            "groomer",
        ],
    },
    {
        href: "clinic-registration.create",
        label: "Register My Clinic",
        roles: ["clinic_owner"],
    },
];

function filterNavItems(
    items,
    user,
    activeClinic,
    assignedClinics,
    hasDeactivatedClinicOnly = false,
) {
    const enabledModules = activeClinic?.enabled_modules ?? [];
    const isClinicOwner = user.role === "clinic_owner";
    const isClinicStaff = [
        "veterinarian",
        "receptionist",
        "groomer",
        "cashier",
        "clinic_owner",
    ].includes(user.role);
    const needsRegistration =
        isClinicOwner &&
        assignedClinics.length === 0 &&
        !hasDeactivatedClinicOnly;

    if (needsRegistration) {
        return items.filter(
            (item) => item.href === "clinic-registration.create",
        );
    }

    if (hasDeactivatedClinicOnly) {
        return items.filter((item) => item.href === "dashboard");
    }

    return items.filter((item) => {
        if (item.roles.length > 0 && !item.roles.includes(user.role)) {
            return false;
        }

        if (
            isClinicStaff &&
            item.module &&
            activeClinic &&
            !enabledModules.includes(item.module)
        ) {
            return false;
        }

        return true;
    });
}

function ClinicSwitcher({ activeClinic, assignedClinics, isPlatformAdmin }) {
    const switchClinic = (clinicId) => {
        router.post(
            route("clinic-context.store"),
            { clinic_id: clinicId || null },
            { preserveScroll: true },
        );
    };

    if (!isPlatformAdmin && assignedClinics.length <= 1) return null;

    return (
        <div className="hidden sm:flex sm:items-center sm:gap-2">
            <span className="text-xs font-medium text-gray-500">
                {isPlatformAdmin ? "Monitor:" : "Clinic:"}
            </span>
            <select
                className="rounded-md border-gray-300 py-1.5 text-xs text-gray-700 focus:ring-indigo-500"
                value={activeClinic?.id ?? ""}
                onChange={(e) => switchClinic(e.target.value)}
                title="Active clinic context"
            >
                {isPlatformAdmin && <option value="">All clinics</option>}
                {assignedClinics.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.name}
                        {c.status && c.status !== "active"
                            ? ` (${c.status})`
                            : ""}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function AuthenticatedLayout({ header, children }) {
    const page = usePage();
    const user = page.props.auth.user;
    const customerAlerts = page.props.customerAlerts;
    const upcomingAppointmentAlerts =
        customerAlerts?.upcomingAppointments ?? [];
    const healthMonitoringAlerts = customerAlerts?.healthMonitoring ?? [];
    const appTimezone = page.props.appTimezone ?? "Asia/Manila";
    const isCustomer = user.role === "customer";
    const activeClinic = page.props.activeClinic;
    const assignedClinics = page.props.assignedClinics ?? [];
    const isPlatformAdmin = page.props.isPlatformAdmin ?? false;
    const hasDeactivatedClinicOnly =
        page.props.hasDeactivatedClinicOnly ?? false;
    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);
    const [customerAlertModal, setCustomerAlertModal] = useState(null);
    const allowedNavItems = filterNavItems(
        navItems,
        user,
        activeClinic,
        assignedClinics,
        hasDeactivatedClinicOnly,
    );

    const openCustomerAlerts = (type) => {
        setCustomerAlertModal(type);
        setShowingNavigationDropdown(false);
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="border-b border-gray-100 bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex shrink-0 items-center">
                                <Link href="/">
                                    <ApplicationLogo className="block h-9 w-9 object-contain" />
                                </Link>
                            </div>

                            <div className="hidden space-x-4 sm:-my-px sm:ms-6 sm:flex sm:items-center">
                                {allowedNavItems.map((item) => (
                                    <NavLink
                                        key={item.href}
                                        href={route(item.href)}
                                        active={
                                            route().current(item.href) ||
                                            route().current(
                                                `${item.href.split(".")[0]}.*`,
                                            )
                                        }
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        </div>

                        <div className="hidden sm:ms-6 sm:flex sm:items-center">
                            <ClinicSwitcher
                                activeClinic={activeClinic}
                                assignedClinics={assignedClinics}
                                isPlatformAdmin={isPlatformAdmin}
                            />
                            <div className="relative ms-3">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none"
                                            >
                                                {user.name}
                                                <svg
                                                    className="-me-0.5 ms-2 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>
                                    <Dropdown.Content width="56">
                                        {isCustomer && customerAlerts && (
                                            <>
                                                <Dropdown.Button
                                                    onClick={() =>
                                                        openCustomerAlerts(
                                                            "appointments",
                                                        )
                                                    }
                                                >
                                                    <span>
                                                        Upcoming Appointments
                                                    </span>
                                                    {upcomingAppointmentAlerts.length >
                                                        0 && (
                                                        <span className="ms-2 shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                                            {
                                                                upcomingAppointmentAlerts.length
                                                            }
                                                        </span>
                                                    )}
                                                </Dropdown.Button>
                                                <Dropdown.Button
                                                    onClick={() =>
                                                        openCustomerAlerts(
                                                            "health",
                                                        )
                                                    }
                                                >
                                                    <span>
                                                        Health Monitoring
                                                    </span>
                                                    {healthMonitoringAlerts.length >
                                                        0 && (
                                                        <span className="ms-2 shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                                            {
                                                                healthMonitoringAlerts.length
                                                            }
                                                        </span>
                                                    )}
                                                </Dropdown.Button>
                                            </>
                                        )}
                                        <Dropdown.Link
                                            href={route("profile.edit")}
                                        >
                                            Profile
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route("logout")}
                                            method="post"
                                            as="button"
                                        >
                                            Log Out
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown((s) => !s)
                                }
                                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 transition duration-150 ease-in-out hover:bg-gray-100 hover:text-gray-500 focus:outline-none"
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={
                                            !showingNavigationDropdown
                                                ? "inline-flex"
                                                : "hidden"
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={
                                            showingNavigationDropdown
                                                ? "inline-flex"
                                                : "hidden"
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className={
                        (showingNavigationDropdown ? "block" : "hidden") +
                        " sm:hidden"
                    }
                >
                    <div className="space-y-1 pb-3 pt-2">
                        {isPlatformAdmin && assignedClinics.length > 0 && (
                            <div className="border-b border-gray-100 px-4 pb-3">
                                <label className="mb-1 block text-xs font-medium text-gray-500">
                                    Monitor clinic
                                </label>
                                <select
                                    className="w-full rounded-md border-gray-300 text-sm"
                                    value={activeClinic?.id ?? ""}
                                    onChange={(e) =>
                                        router.post(
                                            route("clinic-context.store"),
                                            {
                                                clinic_id:
                                                    e.target.value || null,
                                            },
                                        )
                                    }
                                >
                                    <option value="">
                                        All registered clinics
                                    </option>
                                    {assignedClinics.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {allowedNavItems.map((item) => (
                            <ResponsiveNavLink
                                key={item.href}
                                href={route(item.href)}
                            >
                                {item.label}
                            </ResponsiveNavLink>
                        ))}
                    </div>
                    <div className="border-t border-gray-200 pb-1 pt-4">
                        <div className="px-4">
                            <div className="text-base font-medium text-gray-800">
                                {user.name}
                            </div>
                            <div className="text-sm font-medium text-gray-500">
                                {user.email}
                            </div>
                        </div>
                        <div className="mt-3 space-y-1">
                            {isCustomer && customerAlerts && (
                                <>
                                    <CustomerAlertButton
                                        label="Upcoming Appointments"
                                        count={upcomingAppointmentAlerts.length}
                                        onClick={() =>
                                            openCustomerAlerts("appointments")
                                        }
                                    />
                                    <CustomerAlertButton
                                        label="Health Monitoring"
                                        count={healthMonitoringAlerts.length}
                                        onClick={() =>
                                            openCustomerAlerts("health")
                                        }
                                    />
                                </>
                            )}
                            <ResponsiveNavLink href={route("profile.edit")}>
                                Profile
                            </ResponsiveNavLink>
                            <ResponsiveNavLink
                                method="post"
                                href={route("logout")}
                                as="button"
                            >
                                Log Out
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            <AdminClinicMonitor />

            {hasDeactivatedClinicOnly && (
                <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 sm:px-6 lg:px-8">
                    Your assigned clinic has been deactivated by the
                    administrator. Appointments, transactions, and other clinic
                    activity are disabled until it is reactivated.
                </div>
            )}

            {header && (
                <header className="bg-white shadow">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main>{children}</main>

            {isCustomer && customerAlerts && customerAlertModal && (
                <CustomerAlertsModal
                    type={customerAlertModal}
                    alerts={customerAlerts}
                    appTimezone={appTimezone}
                    onClose={() => setCustomerAlertModal(null)}
                />
            )}
        </div>
    );
}
