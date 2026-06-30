import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import FlashMessage from "@/Components/FlashMessage";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import ListDisplayControls from "@/Components/ListDisplayControls";
import useListDisplayLimit from "@/hooks/useListDisplayLimit";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";

function canToggleUserActive(user, currentUserId) {
    if (
        currentUserId != null &&
        Number(user.id) === Number(currentUserId)
    ) {
        return false;
    }

    return true;
}

export default function AdminUsers({ users, roles, clinics = [] }) {
    const currentUserId = usePage().props.auth?.user?.id ?? null;
    const form = useForm({
        name: "",
        email: "",
        contact: "",
        role: "customer",
        password: "",
        password_confirmation: "",
    });

    const [clinicModalUser, setClinicModalUser] = useState(null);
    const [selectedClinicIds, setSelectedClinicIds] = useState([]);
    const [primaryClinicId, setPrimaryClinicId] = useState("");
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [clinicFilter, setClinicFilter] = useState("");

    const submit = (e) => {
        e.preventDefault();
        form.post(route("admin.users.store"), {
            onSuccess: () => form.reset(),
        });
    };

    const updateRole = (userId, role) => {
        router.put(route("admin.users.role.update", userId), { role });
    };

    const deleteUser = (user) => {
        if (!confirm(`Delete user ${user.name}?`)) {
            return;
        }
        router.delete(route("admin.users.destroy", user.id));
    };

    const toggleActive = (user) => {
        const activating = !user.is_active;

        if (
            !confirm(`${activating ? "Activate" : "Deactivate"} ${user.name}?`)
        ) {
            return;
        }

        router.post(route("admin.users.toggle-active", user.id));
    };

    const openClinicModal = (user) => {
        setClinicModalUser(user);
        const ids = (user.clinics ?? []).map((c) => String(c.id));
        setSelectedClinicIds(ids);
        const primary = (user.clinics ?? []).find((c) => c.pivot?.is_primary);
        setPrimaryClinicId(primary ? String(primary.id) : (ids[0] ?? ""));
    };

    const saveClinicAssignment = () => {
        router.put(
            route("admin.users.clinics.update", clinicModalUser.id),
            {
                clinic_ids: selectedClinicIds.map(Number),
                primary_clinic_id: primaryClinicId
                    ? Number(primaryClinicId)
                    : null,
            },
            {
                onSuccess: () => setClinicModalUser(null),
            },
        );
    };

    const toggleClinic = (id) => {
        const str = String(id);
        setSelectedClinicIds((prev) =>
            prev.includes(str) ? prev.filter((x) => x !== str) : [...prev, str],
        );
    };

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();

        return users.filter((user) => {
            if (roleFilter && user.role !== roleFilter) {
                return false;
            }

            if (clinicFilter === "unassigned") {
                if ((user.clinics ?? []).length > 0) {
                    return false;
                }
            } else if (clinicFilter) {
                const hasClinic = (user.clinics ?? []).some(
                    (clinic) => String(clinic.id) === clinicFilter,
                );
                if (!hasClinic) {
                    return false;
                }
            }

            if (!query) {
                return true;
            }

            const clinicNames = (user.clinics ?? [])
                .map((clinic) => clinic.name)
                .join(" ");

            return [user.name, user.email, user.role, clinicNames]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [users, search, roleFilter, clinicFilter]);

    const hasActiveFilters = Boolean(
        search.trim() || roleFilter || clinicFilter,
    );

    const clearFilters = () => {
        setSearch("");
        setRoleFilter("");
        setClinicFilter("");
    };

    const {
        visibleItems: limitedUsers,
        displayLimit,
        setDisplayLimit,
        totalCount: userListCount,
    } = useListDisplayLimit(filteredUsers);

    // When filtering, show every match so the target account is not cut off by the row limit.
    const visibleUsers = hasActiveFilters ? filteredUsers : limitedUsers;
    const userShowingCount = visibleUsers.length;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Admin User Management
                </h2>
            }
        >
            <Head title="Admin Users" />

            <div className="py-6 sm:py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <form
                        onSubmit={submit}
                        className="rounded-lg bg-white p-6 shadow"
                    >
                        <h3 className="mb-4 font-semibold">Create User</h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <InputLabel value="Name" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={form.data.name}
                                    onChange={(e) =>
                                        form.setData("name", e.target.value)
                                    }
                                    required
                                />
                                <InputError
                                    className="mt-2"
                                    message={form.errors.name}
                                />
                            </div>
                            <div>
                                <InputLabel value="Email" />
                                <TextInput
                                    type="email"
                                    className="mt-1 block w-full"
                                    value={form.data.email}
                                    onChange={(e) =>
                                        form.setData("email", e.target.value)
                                    }
                                    required
                                />
                                <InputError
                                    className="mt-2"
                                    message={form.errors.email}
                                />
                            </div>
                            <div>
                                <InputLabel value="Contact Number" />
                                <TextInput
                                    type="tel"
                                    className="mt-1 block w-full"
                                    value={form.data.contact}
                                    onChange={(e) =>
                                        form.setData("contact", e.target.value)
                                    }
                                />
                                <InputError
                                    className="mt-2"
                                    message={form.errors.contact}
                                />
                            </div>
                            <div>
                                <InputLabel value="Role" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.role}
                                    onChange={(e) =>
                                        form.setData("role", e.target.value)
                                    }
                                >
                                    {roles.map((role) => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>
                                <InputError
                                    className="mt-2"
                                    message={form.errors.role}
                                />
                            </div>
                            <div>
                                <InputLabel value="Password" />
                                <TextInput
                                    type="password"
                                    className="mt-1 block w-full"
                                    value={form.data.password}
                                    onChange={(e) =>
                                        form.setData("password", e.target.value)
                                    }
                                    required
                                />
                                <InputError
                                    className="mt-2"
                                    message={form.errors.password}
                                />
                            </div>
                            <div>
                                <InputLabel value="Confirm Password" />
                                <TextInput
                                    type="password"
                                    className="mt-1 block w-full"
                                    value={form.data.password_confirmation}
                                    onChange={(e) =>
                                        form.setData(
                                            "password_confirmation",
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                        </div>
                        <PrimaryButton
                            className="mt-4"
                            disabled={form.processing}
                        >
                            Create User
                        </PrimaryButton>
                    </form>

                    <div className="rounded-lg bg-white p-4 shadow">
                        <div className="grid gap-4 sm:grid-cols-4">
                            <div className="sm:col-span-2">
                                <InputLabel value="Search" />
                                <TextInput
                                    type="search"
                                    className="mt-1 block w-full"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Name, email, role, or clinic..."
                                />
                            </div>
                            <div>
                                <InputLabel value="Role" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                                    value={roleFilter}
                                    onChange={(e) =>
                                        setRoleFilter(e.target.value)
                                    }
                                >
                                    <option value="">All roles</option>
                                    {roles.map((role) => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Clinic" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                                    value={clinicFilter}
                                    onChange={(e) =>
                                        setClinicFilter(e.target.value)
                                    }
                                >
                                    <option value="">All clinics</option>
                                    <option value="unassigned">
                                        No clinic assigned
                                    </option>
                                    {clinics.map((clinic) => (
                                        <option
                                            key={clinic.id}
                                            value={String(clinic.id)}
                                        >
                                            {clinic.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
                            <span>
                                Showing {filteredUsers.length} of {users.length}{" "}
                                users
                            </span>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="font-medium text-indigo-600 hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Email
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Contact
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Role
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Clinics
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Created
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Activated
                                    </th>
                                    <th className="sticky right-0 z-10 bg-gray-50 px-4 py-3 text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {visibleUsers.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="px-4 py-8 text-center text-gray-500"
                                        >
                                            {hasActiveFilters
                                                ? "No users match your filters."
                                                : "No users found."}
                                        </td>
                                    </tr>
                                )}
                                {visibleUsers.map((user) => (
                                    <tr key={user.id} className="group">
                                        <td className="px-4 py-3">
                                            {user.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.email}
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.contact || "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                className="rounded-md border-gray-300 text-sm"
                                                value={user.role}
                                                onChange={(e) =>
                                                    updateRole(
                                                        user.id,
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                {roles.map((role) => (
                                                    <option
                                                        key={role}
                                                        value={role}
                                                    >
                                                        {role}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.is_active ? (
                                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                                                    Active
                                                </span>
                                            ) : user.role === "customer" ? (
                                                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                                                    Deactivated
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.clinics &&
                                            user.clinics.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {user.clinics.map((c) => (
                                                        <span
                                                            key={c.id}
                                                            className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700"
                                                        >
                                                            {c.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {new Date(
                                                user.created_at,
                                            ).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.activated_at
                                                ? new Date(
                                                      user.activated_at,
                                                  ).toLocaleDateString()
                                                : "—"}
                                        </td>
                                        <td className="sticky right-0 z-10 bg-white px-4 py-3 text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] group-hover:bg-gray-50">
                                            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 whitespace-nowrap">
                                                {canToggleUserActive(
                                                    user,
                                                    currentUserId,
                                                ) && (
                                                    <button
                                                        type="button"
                                                        className={`text-sm hover:underline ${user.is_active ? "text-amber-600" : "text-emerald-600"}`}
                                                        onClick={() =>
                                                            toggleActive(user)
                                                        }
                                                    >
                                                        {user.is_active
                                                            ? "Deactivate"
                                                            : "Activate"}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="text-sm text-indigo-600 hover:underline"
                                                    onClick={() =>
                                                        openClinicModal(user)
                                                    }
                                                >
                                                    Clinics
                                                </button>
                                                <button
                                                    type="button"
                                                    className="text-sm text-red-600 hover:underline"
                                                    onClick={() =>
                                                        deleteUser(user)
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                        <ListDisplayControls
                            totalCount={userListCount}
                            showingCount={userShowingCount}
                            displayLimit={displayLimit}
                            onLimitChange={setDisplayLimit}
                        />
                    </div>
                </div>
            </div>
            {clinicModalUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setClinicModalUser(null)}
                >
                    <div
                        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="mb-4 font-semibold text-gray-800">
                            Assign Clinics — {clinicModalUser.name}
                        </h3>
                        <div className="mb-4 max-h-48 overflow-y-auto space-y-2">
                            {clinics.map((clinic) => (
                                <label
                                    key={clinic.id}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedClinicIds.includes(
                                            String(clinic.id),
                                        )}
                                        onChange={() => toggleClinic(clinic.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                                    />
                                    {clinic.name}
                                </label>
                            ))}
                            {clinics.length === 0 && (
                                <p className="text-xs text-gray-400">
                                    No active clinics found.
                                </p>
                            )}
                        </div>
                        {selectedClinicIds.length > 0 && (
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Primary Clinic
                                </label>
                                <select
                                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                                    value={primaryClinicId}
                                    onChange={(e) =>
                                        setPrimaryClinicId(e.target.value)
                                    }
                                >
                                    {selectedClinicIds.map((id) => {
                                        const c = clinics.find(
                                            (cl) => String(cl.id) === id,
                                        );
                                        return (
                                            <option key={id} value={id}>
                                                {c?.name ?? id}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setClinicModalUser(null)}
                                className="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveClinicAssignment}
                                className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
