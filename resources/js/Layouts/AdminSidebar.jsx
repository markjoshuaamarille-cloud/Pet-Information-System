import ApplicationLogo from '@/Components/ApplicationLogo';
import SidebarNavLink from '@/Components/SidebarNavLink';
import { Link, router } from '@inertiajs/react';

const ADMIN_SIDEBAR_GROUPS = [
    {
        label: 'Overview',
        hrefs: ['dashboard'],
    },
    {
        label: 'Clinical',
        hrefs: [
            'clients.index',
            'pets.index',
            'appointments.index',
            'vaccinations.index',
            'grooming.index',
        ],
    },
    {
        label: 'Finance & Inventory',
        hrefs: [
            'billing.index',
            'pet-shop.index',
            'pet-shop-billing.index',
            'pet-shop-reports.index',
            'service-catalog.index',
            'medicines.index',
        ],
    },
    {
        label: 'System',
        hrefs: ['notifications.index', 'reports.index', 'nearby-places.index'],
    },
    {
        label: 'Platform Admin',
        hrefs: [
            'admin.users.index',
            'admin.clinics.index',
            'admin.platform-activity.index',
            'admin.platform-commissions.index',
        ],
    },
];

function isNavItemActive(href) {
    return (
        route().current(href) ||
        route().current(`${href.split('.')[0]}.*`)
    );
}

function ClinicSwitcher({ activeClinic, assignedClinics }) {
    const switchClinic = (clinicId) => {
        router.post(
            route('clinic-context.store'),
            { clinic_id: clinicId || null },
            { preserveScroll: true },
        );
    };

    if (assignedClinics.length === 0) {
        return null;
    }

    return (
        <div className="px-3 py-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Monitor clinic
            </label>
            <select
                className="w-full rounded-md border-gray-300 py-2 text-sm text-gray-700 focus:ring-indigo-500"
                value={activeClinic?.id ?? ''}
                onChange={(e) => switchClinic(e.target.value)}
                title="Active clinic context"
            >
                <option value="">All clinics</option>
                {assignedClinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                        {clinic.status && clinic.status !== 'active'
                            ? ` (${clinic.status})`
                            : ''}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function AdminSidebar({
    allowedNavItems,
    platformAdminAlerts,
    activeClinic,
    assignedClinics,
    user,
    sidebarOpen,
    onClose,
    userMenu,
}) {
    const itemsByHref = Object.fromEntries(
        allowedNavItems.map((item) => [item.href, item]),
    );

    const groups = ADMIN_SIDEBAR_GROUPS.map((group) => ({
        ...group,
        items: group.hrefs
            .map((href) => itemsByHref[href])
            .filter(Boolean),
    })).filter((group) => group.items.length > 0);

    const ungroupedItems = allowedNavItems.filter(
        (item) => !ADMIN_SIDEBAR_GROUPS.some((group) => group.hrefs.includes(item.href)),
    );

    const renderNavItem = (item) => {
        const badge = navBadgeCount(item, platformAdminAlerts);

        return (
            <SidebarNavLink
                key={item.href}
                href={route(item.href)}
                active={isNavItemActive(item.href)}
                onClick={onClose}
            >
                <span>{item.label}</span>
                {badge > 0 && (
                    <span className="ms-2 shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {badge}
                    </span>
                )}
            </SidebarNavLink>
        );
    };

    return (
        <>
            {sidebarOpen && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    className="fixed inset-0 z-40 bg-gray-900/40 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white/95 backdrop-blur-sm transition-transform duration-200 ease-in-out lg:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-100 px-4">
                    <Link href={route('dashboard')} onClick={onClose}>
                        <ApplicationLogo className="block h-9 w-9 object-contain" />
                    </Link>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">PAWGO</p>
                        <p className="truncate text-xs text-gray-500">Super Admin</p>
                    </div>
                </div>

                <ClinicSwitcher
                    activeClinic={activeClinic}
                    assignedClinics={assignedClinics}
                />

                <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
                    {groups.map((group) => (
                        <div key={group.label}>
                            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                {group.label}
                            </p>
                            <div className="space-y-1">
                                {group.items.map(renderNavItem)}
                            </div>
                        </div>
                    ))}

                    {ungroupedItems.length > 0 && (
                        <div>
                            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                More
                            </p>
                            <div className="space-y-1">
                                {ungroupedItems.map(renderNavItem)}
                            </div>
                        </div>
                    )}
                </nav>

                <div className="shrink-0 border-t border-gray-100 p-3">
                    <div className="mb-2 px-1">
                        <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="truncate text-xs text-gray-500">{user.email}</p>
                    </div>
                    {userMenu}
                </div>
            </aside>
        </>
    );
}

function navBadgeCount(item, platformAdminAlerts) {
    if (!platformAdminAlerts) {
        return 0;
    }

    if (item.href === 'admin.users.index') {
        return platformAdminAlerts.pending_clinic_owners ?? 0;
    }

    if (item.href === 'admin.clinics.index') {
        return platformAdminAlerts.pending_clinics ?? 0;
    }

    if (item.href === 'notifications.index') {
        return platformAdminAlerts.total ?? 0;
    }

    return 0;
}
