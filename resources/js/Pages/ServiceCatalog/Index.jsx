import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import FlashMessage from "@/Components/FlashMessage";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import ListDisplayControls from "@/Components/ListDisplayControls";
import useListDisplayLimit from "@/hooks/useListDisplayLimit";
import { Head, router, useForm } from "@inertiajs/react";
import { useMemo, useState } from "react";

export default function ServiceCatalogIndex({ services }) {
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const form = useForm({
        code: "",
        name: "",
        category: "general",
        default_price: "0.00",
    });

    const resetForm = () => {
        form.reset();
        form.setData({
            code: "",
            name: "",
            category: "general",
            default_price: "0.00",
        });
        setEditingId(null);
    };

    const submit = (e) => {
        e.preventDefault();

        if (editingId) {
            form.put(route("service-catalog.update", editingId), {
                onSuccess: resetForm,
            });
            return;
        }

        form.post(route("service-catalog.store"), {
            onSuccess: resetForm,
        });
    };

    const startEdit = (service) => {
        setEditingId(service.id);
        form.setData({
            code: service.code ?? "",
            name: service.name ?? "",
            category: service.category ?? "general",
            default_price: String(service.default_price ?? "0.00"),
        });
    };

    const categoryOptions = useMemo(() => {
        const values = [...new Set(services.map((s) => s.category).filter(Boolean))];
        return values.sort((a, b) => String(a).localeCompare(String(b)));
    }, [services]);

    const filteredServices = useMemo(() => {
        const query = search.trim().toLowerCase();

        return services.filter((service) => {
            if (categoryFilter && service.category !== categoryFilter) {
                return false;
            }
            if (!query) {
                return true;
            }

            return [service.code, service.name, service.category]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [services, search, categoryFilter]);

    const {
        visibleItems: visibleServices,
        displayLimit,
        setDisplayLimit,
        totalCount: serviceListCount,
        showingCount: serviceShowingCount,
    } = useListDisplayLimit(filteredServices);

    const clearFilters = () => {
        setSearch("");
        setCategoryFilter("");
    };

    const hasActiveFilters = Boolean(search || categoryFilter);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Service Catalog & Pricing
                </h2>
            }
        >
            <Head title="Service Catalog" />
            <div className="py-6 sm:py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <form
                        onSubmit={submit}
                        className="mb-6 rounded-lg bg-white p-6 shadow"
                    >
                        <h3 className="mb-4 font-semibold">
                            {editingId ? "Edit Service" : "Add Service"}
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-4">
                            <div>
                                <InputLabel value="Service Code" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={form.data.code}
                                    onChange={(e) =>
                                        form.setData("code", e.target.value)
                                    }
                                    placeholder="Optional (auto-generated if empty)"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Leave blank to auto-generate a unique code.
                                </p>
                            </div>
                            <div>
                                <InputLabel value="Service Name" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={form.data.name}
                                    onChange={(e) =>
                                        form.setData("name", e.target.value)
                                    }
                                    placeholder="e.g. Checkup"
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Category" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={form.data.category}
                                    onChange={(e) =>
                                        form.setData("category", e.target.value)
                                    }
                                    placeholder="appointment / health_record / manual"
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Default Price" />
                                <TextInput
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="mt-1 block w-full"
                                    value={form.data.default_price}
                                    onChange={(e) =>
                                        form.setData(
                                            "default_price",
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                            <PrimaryButton disabled={form.processing}>
                                Save Service
                            </PrimaryButton>
                            {editingId && (
                                <button
                                    type="button"
                                    className="text-sm text-gray-600 hover:underline"
                                    onClick={resetForm}
                                >
                                    Cancel edit
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="mb-4 rounded-lg bg-white p-4 shadow">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="sm:col-span-2">
                                <InputLabel value="Search" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by code, name, or category..."
                                />
                            </div>
                            <div>
                                <InputLabel value="Category" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={categoryFilter}
                                    onChange={(e) =>
                                        setCategoryFilter(e.target.value)
                                    }
                                >
                                    <option value="">All categories</option>
                                    {categoryOptions.map((category) => (
                                        <option key={category} value={category}>
                                            {String(category).replace(/_/g, " ")}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm">
                            <p className="text-gray-500">
                                Showing {filteredServices.length} of{" "}
                                {services.length} services
                            </p>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="text-indigo-600 hover:underline"
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
                                        Code
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Service
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Category
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Price
                                    </th>
                                    <th className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredServices.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-8 text-center text-gray-500"
                                        >
                                            No services match your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    visibleServices.map((service) => (
                                    <tr key={service.id}>
                                        <td className="px-4 py-3 font-mono text-xs">
                                            {service.code}
                                        </td>
                                        <td className="px-4 py-3">
                                            {service.name}
                                        </td>
                                        <td className="px-4 py-3 capitalize">
                                            {String(service.category).replace(
                                                "_",
                                                " ",
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {Number(
                                                service.default_price ?? 0,
                                            ).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    startEdit(service)
                                                }
                                                className="text-indigo-600 hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    confirm(
                                                        "Delete this service?",
                                                    ) &&
                                                    router.delete(
                                                        route(
                                                            "service-catalog.destroy",
                                                            service.id,
                                                        ),
                                                    )
                                                }
                                                className="ms-3 text-red-600 hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        </div>
                        <ListDisplayControls
                            totalCount={serviceListCount}
                            showingCount={serviceShowingCount}
                            displayLimit={displayLimit}
                            onLimitChange={setDisplayLimit}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
