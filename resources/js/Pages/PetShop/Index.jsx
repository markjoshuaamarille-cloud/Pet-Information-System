import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import FlashMessage from "@/Components/FlashMessage";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import ListDisplayControls from "@/Components/ListDisplayControls";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";
import useListDisplayLimit from "@/hooks/useListDisplayLimit";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";

const units = [
    "pcs",
    "bottle",
    "vial",
    "tablet",
    "capsule",
    "pack",
    "box",
    "ml",
    "g",
    "kg",
];

const statusBadge = {
    expired: "bg-red-50 text-red-700 ring-1 ring-red-100",
    critical: "bg-orange-50 text-orange-700 ring-1 ring-orange-100",
    expiring_soon: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    ok: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
};

const stockStatusLabels = {
    expired: "Expired",
    critical: "Low stock",
    expiring_soon: "Expiring soon",
    ok: "In stock",
};

function formatPeso(value) {
    return `₱${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value) {
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
}

function StoreList({ stores, onSelectStore }) {
    return (
        <div className="mb-8 overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-slate-50 shadow-sm">
            <div className="border-b border-emerald-100/80 bg-white/70 px-6 py-5">
                <p className="text-base font-semibold text-gray-900">
                    Choose a Pet Store Near You
                </p>
                <p className="mt-1 text-sm text-gray-500">
                    Browse products from a registered pet shop in your area.
                </p>
            </div>

            <div className="p-5">
                {stores.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white/80 px-4 py-10 text-center">
                        <p className="text-sm font-medium text-gray-700">
                            No pet stores available
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                            No registered pet stores are available at this time.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {stores.map((store) => (
                            <button
                                key={store.id}
                                type="button"
                                onClick={() => onSelectStore(store.id)}
                                className="group flex w-full items-start gap-4 rounded-xl border border-gray-200/90 bg-white p-4 text-left shadow-sm transition-all hover:border-emerald-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            >
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.75"
                                        className="h-5 w-5"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M3 9.5 12 4l9 5.5M5 10v8a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-8"
                                        />
                                    </svg>
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <p className="text-base font-semibold text-gray-900 group-hover:text-emerald-900">
                                            {store.name}
                                        </p>
                                        {store.distance_formatted && (
                                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                                {store.distance_formatted}
                                            </span>
                                        )}
                                    </div>

                                    {store.address && (
                                        <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-gray-600">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                                className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M9.69 18.933 3.75 12.75a6 6 0 0 1 8.48-8.48l5.19 5.19a6 6 0 0 1-8.48 8.48Zm1.06-3.712a2.25 2.25 0 1 0-2.25-2.25 2.25 2.25 0 0 0 2.25 2.25Z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            <span>{store.address}</span>
                                        </p>
                                    )}

                                    <p className="mt-3 text-xs font-medium text-emerald-600 opacity-0 transition group-hover:opacity-100">
                                        Browse this store →
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PetShopIndex({
    products,
    categories,
    clients = [],
    canManageProducts = false,
    canCheckout = false,
    canSelectClient = false,
    customerClientId = null,
    stores = [],
    selectedClinicId = null,
    selectedStore = null,
    browseStores = false,
    isCustomer = false,
}) {
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [editingProduct, setEditingProduct] = useState(null);
    const [viewingProductId, setViewingProductId] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [checkoutProcessing, setCheckoutProcessing] = useState(false);
    const pageErrors = usePage().props.errors ?? {};

    const editForm = useForm({
        name: "",
        description: "",
        unit: "pcs",
        unit_price: "0.00",
        image: null,
        remove_image: false,
    });

    const checkoutForm = useForm({
        clinic_id: selectedClinicId ? String(selectedClinicId) : "",
        client_id: customerClientId ? String(customerClientId) : "",
        notes: "",
    });

    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase();

        return products.filter((product) => {
            if (product.stock_status === "expired") {
                return false;
            }

            if (categoryFilter && product.category !== categoryFilter) {
                return false;
            }

            if (!query) {
                return true;
            }

            return [product.name, product.category_label, product.description]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [products, search, categoryFilter]);

    const {
        visibleItems: visibleProducts,
        displayLimit,
        setDisplayLimit,
        totalCount: productListCount,
        showingCount: productShowingCount,
    } = useListDisplayLimit(filteredProducts);

    const cartSubtotal = useMemo(
        () =>
            cart.reduce(
                (sum, line) => sum + Number(line.unit_price) * line.quantity,
                0,
            ),
        [cart],
    );

    const viewingProduct = useMemo(() => {
        if (!viewingProductId) {
            return null;
        }

        return (
            products.find((product) => product.id === viewingProductId) ?? null
        );
    }, [products, viewingProductId]);

    const openProductDetails = (product) => {
        setViewingProductId(product.id);
    };

    const closeProductDetails = () => {
        setViewingProductId(null);
    };

    const startEdit = (product) => {
        closeProductDetails();
        setEditingProduct(product);
        setImagePreview(product.image_url || null);
        editForm.setData({
            name: product.name ?? "",
            description: product.description ?? "",
            unit: product.unit ?? "pcs",
            unit_price: String(product.unit_price ?? "0.00"),
            image: null,
            remove_image: false,
        });
        editForm.clearErrors();
    };

    const closeEdit = () => {
        setEditingProduct(null);
        setImagePreview(null);
        editForm.reset();
        editForm.clearErrors();
    };

    const submitEdit = (e) => {
        e.preventDefault();

        if (!editingProduct) {
            return;
        }

        const hasImage = editForm.data.image instanceof File;

        const submitOptions = {
            preserveScroll: true,
            onSuccess: () => closeEdit(),
            onFinish: () => editForm.transform((data) => data),
        };

        if (hasImage) {
            editForm.transform((data) => ({
                ...data,
                remove_image: data.remove_image ? "1" : "0",
            }));

            editForm.post(route("pet-shop.update", editingProduct.id), {
                ...submitOptions,
                forceFormData: true,
            });

            return;
        }

        editForm.transform(({ image, ...data }) => ({
            ...data,
            remove_image: data.remove_image ? "1" : "0",
        }));

        editForm.post(
            route("pet-shop.update", editingProduct.id),
            submitOptions,
        );
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0] ?? null;
        editForm.setData("image", file);
        editForm.setData("remove_image", false);

        if (file) {
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        editForm.setData("image", null);
        editForm.setData("remove_image", true);
        setImagePreview(null);
    };

    const addToCart = (product) => {
        if (!canCheckout) {
            return;
        }

        setCart((current) => {
            const existing = current.find(
                (line) => line.medicine_id === product.id,
            );

            if (existing) {
                if (existing.quantity >= product.quantity) {
                    return current;
                }

                return current.map((line) =>
                    line.medicine_id === product.id
                        ? { ...line, quantity: line.quantity + 1 }
                        : line,
                );
            }

            return [
                ...current,
                {
                    medicine_id: product.id,
                    name: product.name,
                    unit_price: product.unit_price,
                    max_quantity: product.quantity,
                    quantity: 1,
                },
            ];
        });
    };

    const updateCartQty = (medicineId, quantity) => {
        setCart((current) =>
            current
                .map((line) => {
                    if (line.medicine_id !== medicineId) {
                        return line;
                    }

                    const nextQty = Math.max(
                        1,
                        Math.min(quantity, line.max_quantity),
                    );

                    return { ...line, quantity: nextQty };
                })
                .filter((line) => line.quantity > 0),
        );
    };

    const removeFromCart = (medicineId) => {
        setCart((current) =>
            current.filter((line) => line.medicine_id !== medicineId),
        );
    };

    const submitCheckout = (e) => {
        e.preventDefault();

        const clientId = canSelectClient
            ? checkoutForm.data.client_id
            : customerClientId;

        if (!clientId || cart.length === 0) {
            return;
        }

        setCheckoutProcessing(true);

        router.post(
            route("pet-shop.checkout"),
            {
                clinic_id:
                    selectedClinicId || checkoutForm.data.clinic_id || null,
                client_id: Number(clientId),
                notes: checkoutForm.data.notes || "",
                items: cart.map((line) => ({
                    medicine_id: line.medicine_id,
                    quantity: line.quantity,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCart([]);
                    checkoutForm.reset();
                    if (customerClientId) {
                        checkoutForm.setData(
                            "client_id",
                            String(customerClientId),
                        );
                    }
                },
                onFinish: () => setCheckoutProcessing(false),
            },
        );
    };

    const shopMessage = [
        "Browse curated products from clinic inventory.",
        canCheckout &&
            canSelectClient &&
            "Place orders from your cart, then finalize in Pet Shop Billing.",
        canCheckout &&
            !canSelectClient &&
            "Add items to your cart—clinic staff will process payment.",
        canManageProducts &&
            "Admins can edit listings and upload product photos.",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold tracking-tight text-slate-800">
                    Pet Shop
                </h2>
            }
        >
            <Head title="Pet Shop" />
            <div className="bg-white py-8 sm:py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    {/* Customer store list — shown when browsing all stores */}
                    {isCustomer &&
                        stores.length > 0 &&
                        browseStores &&
                        !selectedClinicId && (
                            <StoreList
                                stores={stores}
                                onSelectStore={(id) =>
                                    router.get(
                                        route("pet-shop.index"),
                                        { clinic_id: id },
                                        { preserveState: false },
                                    )
                                }
                            />
                        )}

                    {/* Customer: current store + option to change */}
                    {isCustomer && selectedClinicId && selectedStore && (
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/50 px-4 py-3">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                    Shopping at
                                </p>
                                <p className="font-semibold text-gray-900">
                                    {selectedStore.name}
                                </p>
                                {selectedStore.address && (
                                    <p className="mt-0.5 text-sm text-gray-600">
                                        {selectedStore.address}
                                        {selectedStore.distance_formatted && (
                                            <span className="ms-2 text-emerald-700">
                                                ·{" "}
                                                {
                                                    selectedStore.distance_formatted
                                                }
                                            </span>
                                        )}
                                    </p>
                                )}
                            </div>
                            {stores.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.get(route("pet-shop.index"), {
                                            browse: 1,
                                        })
                                    }
                                    className="shrink-0 text-sm font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
                                >
                                    Change store
                                </button>
                            )}
                        </div>
                    )}

                    {/* <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-indigo-50/30 to-white px-6 py-8 sm:px-8">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                                Clinic retail
                            </p>
                            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                                Pet Shop
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                                {shopMessage}
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {productListCount} products
                                </span>
                                {canCheckout && cart.length > 0 && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-medium text-indigo-700">
                                        Cart · {formatPeso(cartSubtotal)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </section> */}

                    <div className="mb-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="grid flex-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <InputLabel
                                        value="Search"
                                        className="text-slate-600"
                                    />
                                    <TextInput
                                        type="search"
                                        className="mt-1.5 block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-400 focus:ring-indigo-400"
                                        placeholder="Find by name or description..."
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                    />
                                </div>
                                <div>
                                    <InputLabel
                                        value="Category"
                                        className="text-slate-600"
                                    />
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) =>
                                            setCategoryFilter(e.target.value)
                                        }
                                        className="mt-1.5 w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-400 focus:ring-indigo-400"
                                    >
                                        <option value="">All categories</option>
                                        {categories.map((category) => (
                                            <option
                                                key={category.value}
                                                value={category.value}
                                            >
                                                {category.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {canCheckout && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowCart((value) => !value)
                                    }
                                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                                        showCart
                                            ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                            : "bg-indigo-600 text-white shadow-md shadow-indigo-200/50 hover:bg-indigo-700"
                                    }`}
                                >
                                    <svg
                                        className="h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={1.5}
                                        aria-hidden
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25h9.75m-9.75 0L5.106 5.272M7.5 14.25l-1.72 4.35m1.72-4.35h12.218m0 0l1.72 4.35M17.25 14.25V9.75a2.25 2.25 0 00-2.25-2.25H9.75"
                                        />
                                    </svg>
                                    {showCart ? "Hide cart" : "View cart"}
                                    {cart.length > 0 && (
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs ${
                                                showCart
                                                    ? "bg-slate-100 text-slate-700"
                                                    : "bg-white/20 text-white"
                                            }`}
                                        >
                                            {cart.length}
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                        {categories.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setCategoryFilter("")}
                                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                                        !categoryFilter
                                            ? "bg-indigo-600 text-white shadow-sm"
                                            : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                                    }`}
                                >
                                    All
                                </button>
                                {categories.map((category) => (
                                    <button
                                        key={category.value}
                                        type="button"
                                        onClick={() =>
                                            setCategoryFilter(category.value)
                                        }
                                        className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                                            categoryFilter === category.value
                                                ? "bg-indigo-600 text-white shadow-sm"
                                                : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                                        }`}
                                    >
                                        {category.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div
                        className={`grid gap-6 ${canCheckout && showCart ? "lg:grid-cols-3" : ""}`}
                    >
                        <div
                            className={
                                canCheckout && showCart ? "lg:col-span-2" : ""
                            }
                        >
                            {filteredProducts.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                                    <p className="text-sm font-medium text-slate-700">
                                        No products match your search
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Add in-stock inventory items
                                        (non-vaccine categories) to list them
                                        here.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                        {visibleProducts.map((product) => (
                                            <article
                                                key={product.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() =>
                                                    openProductDetails(product)
                                                }
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === "Enter" ||
                                                        e.key === " "
                                                    ) {
                                                        e.preventDefault();
                                                        openProductDetails(
                                                            product,
                                                        );
                                                    }
                                                }}
                                                className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                                            >
                                                <div className="relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
                                                    {product.image_url ? (
                                                        <img
                                                            src={
                                                                product.image_url
                                                            }
                                                            alt={product.name}
                                                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                                                            <svg
                                                                className="h-10 w-10 opacity-40"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                                strokeWidth={1}
                                                                aria-hidden
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                                                                />
                                                            </svg>
                                                            <span className="text-xs font-medium">
                                                                No photo
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-indigo-700 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm">
                                                        {product.category_label}
                                                    </span>
                                                </div>
                                                <div className="flex flex-1 flex-col p-5">
                                                    <div className="mb-2 flex items-start justify-between gap-2">
                                                        <h3 className="line-clamp-2 min-h-0 flex-1 text-base font-semibold tracking-tight text-slate-900">
                                                            {product.name}
                                                        </h3>
                                                        <span
                                                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[product.stock_status] ?? statusBadge.ok}`}
                                                        >
                                                            {product.quantity}{" "}
                                                            left
                                                        </span>
                                                    </div>
                                                    <div className="min-h-[2.5rem]">
                                                        {product.description ? (
                                                            <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
                                                                {
                                                                    product.description
                                                                }
                                                            </p>
                                                        ) : (
                                                            <span className="sr-only">
                                                                No description
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-4 border-t border-slate-100 pt-4">
                                                        <p className="text-xl font-semibold tracking-tight text-slate-900">
                                                            {formatPeso(
                                                                product.unit_price,
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            per {product.unit}
                                                        </p>
                                                    </div>
                                                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                                                        {canCheckout && (
                                                            <PrimaryButton
                                                                type="button"
                                                                className="flex-1 justify-center rounded-xl text-xs shadow-sm"
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    addToCart(
                                                                        product,
                                                                    );
                                                                }}
                                                            >
                                                                Add to cart
                                                            </PrimaryButton>
                                                        )}
                                                        {canManageProducts && (
                                                            <SecondaryButton
                                                                type="button"
                                                                className="rounded-xl text-xs"
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    startEdit(
                                                                        product,
                                                                    );
                                                                }}
                                                            >
                                                                Edit
                                                            </SecondaryButton>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                    <ListDisplayControls
                                        totalCount={productListCount}
                                        showingCount={productShowingCount}
                                        displayLimit={displayLimit}
                                        onLimitChange={setDisplayLimit}
                                    />
                                </>
                            )}
                        </div>

                        {canCheckout && showCart && (
                            <aside className="lg:sticky lg:top-6 lg:col-span-1 lg:self-start">
                                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md ring-1 ring-slate-100">
                                    <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-4">
                                        <h3 className="text-lg font-semibold tracking-tight text-white">
                                            {canSelectClient
                                                ? "POS Cart"
                                                : "Your cart"}
                                        </h3>
                                        <p className="mt-0.5 text-xs text-indigo-100">
                                            {cart.length}{" "}
                                            {cart.length === 1
                                                ? "item"
                                                : "items"}
                                        </p>
                                    </div>
                                    <div className="p-5">
                                        {!canSelectClient &&
                                            !customerClientId && (
                                                <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                                                    Your account is not linked
                                                    to a client record. Please
                                                    contact the clinic to place
                                                    orders.
                                                </p>
                                            )}

                                        {cart.length === 0 ? (
                                            <div className="py-8 text-center">
                                                <p className="text-sm font-medium text-slate-600">
                                                    Your cart is empty
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {canSelectClient
                                                        ? "Add products to begin a sale."
                                                        : "Browse products and add items to order."}
                                                </p>
                                            </div>
                                        ) : (
                                            <form
                                                onSubmit={submitCheckout}
                                                className="space-y-4"
                                            >
                                                <ul className="max-h-72 space-y-3 overflow-y-auto pr-1 text-sm">
                                                    {cart.map((line) => (
                                                        <li
                                                            key={
                                                                line.medicine_id
                                                            }
                                                            className="rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <p className="font-medium text-slate-900">
                                                                    {line.name}
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    className="text-xs font-medium text-red-600 hover:text-red-700"
                                                                    onClick={() =>
                                                                        removeFromCart(
                                                                            line.medicine_id,
                                                                        )
                                                                    }
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                            <div className="mt-3 flex items-center justify-between gap-2">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={
                                                                        line.max_quantity
                                                                    }
                                                                    value={
                                                                        line.quantity
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateCartQty(
                                                                            line.medicine_id,
                                                                            Number(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            ),
                                                                        )
                                                                    }
                                                                    className="w-16 rounded-lg border-slate-200 text-sm shadow-sm"
                                                                />
                                                                <span className="font-semibold text-indigo-700">
                                                                    {formatPeso(
                                                                        line.unit_price *
                                                                            line.quantity,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>

                                                {canSelectClient ? (
                                                    <div>
                                                        <InputLabel value="Client" />
                                                        <select
                                                            value={
                                                                checkoutForm
                                                                    .data
                                                                    .client_id
                                                            }
                                                            onChange={(e) =>
                                                                checkoutForm.setData(
                                                                    "client_id",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="mt-1 w-full rounded-xl border-slate-200 shadow-sm"
                                                            required
                                                        >
                                                            <option value="">
                                                                Select client
                                                            </option>
                                                            {clients.map(
                                                                (client) => (
                                                                    <option
                                                                        key={
                                                                            client.id
                                                                        }
                                                                        value={
                                                                            client.id
                                                                        }
                                                                    >
                                                                        {
                                                                            client.name
                                                                        }
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                        <InputError
                                                            message={
                                                                checkoutForm
                                                                    .errors
                                                                    .client_id
                                                            }
                                                            className="mt-1"
                                                        />
                                                    </div>
                                                ) : (
                                                    <InputError
                                                        message={
                                                            pageErrors.client_id ||
                                                            checkoutForm.errors
                                                                .client_id
                                                        }
                                                        className="mt-1"
                                                    />
                                                )}

                                                <div>
                                                    <InputLabel value="Notes" />
                                                    <textarea
                                                        value={
                                                            checkoutForm.data
                                                                .notes
                                                        }
                                                        onChange={(e) =>
                                                            checkoutForm.setData(
                                                                "notes",
                                                                e.target.value,
                                                            )
                                                        }
                                                        rows={2}
                                                        className="mt-1 w-full rounded-xl border-slate-200 shadow-sm"
                                                    />
                                                </div>

                                                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm">
                                                    <div className="flex justify-between text-base font-semibold text-slate-900">
                                                        <span>Subtotal</span>
                                                        <span className="text-indigo-700">
                                                            {formatPeso(
                                                                cartSubtotal,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                                        {canSelectClient
                                                            ? "Tax and discount are applied in Pet Shop Billing before payment."
                                                            : "Your order will be reviewed by clinic staff for payment."}
                                                    </p>
                                                </div>

                                                <InputError
                                                    message={
                                                        pageErrors.items ||
                                                        checkoutForm.errors
                                                            .items
                                                    }
                                                    className="mt-1"
                                                />

                                                <PrimaryButton
                                                    type="submit"
                                                    className="w-full justify-center rounded-xl py-2.5 shadow-md"
                                                    disabled={
                                                        checkoutProcessing ||
                                                        cart.length === 0 ||
                                                        (!canSelectClient &&
                                                            !customerClientId) ||
                                                        (canSelectClient &&
                                                            !checkoutForm.data
                                                                .client_id)
                                                    }
                                                >
                                                    {checkoutProcessing
                                                        ? "Processing..."
                                                        : canSelectClient
                                                          ? "Complete sale"
                                                          : "Place order"}
                                                </PrimaryButton>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </aside>
                        )}
                    </div>
                </div>
            </div>

            {viewingProduct && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
                    onClick={closeProductDetails}
                >
                    <div
                        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative flex h-56 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 sm:h-72">
                            {viewingProduct.image_url ? (
                                <img
                                    src={viewingProduct.image_url}
                                    alt={viewingProduct.name}
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <span className="text-sm font-medium text-slate-400">
                                    No image
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={closeProductDetails}
                                className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-white hover:text-slate-900"
                                aria-label="Close"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 sm:p-8">
                            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                                {viewingProduct.category_label}
                            </p>
                            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                                {viewingProduct.name}
                            </h3>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge[viewingProduct.stock_status] ?? statusBadge.ok}`}
                                >
                                    {stockStatusLabels[
                                        viewingProduct.stock_status
                                    ] ?? "In stock"}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                                    {viewingProduct.quantity}{" "}
                                    {viewingProduct.unit} available
                                </span>
                            </div>

                            <dl className="mb-6 mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-5 text-sm sm:grid-cols-2">
                                <div>
                                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Price
                                    </dt>
                                    <dd className="mt-1 text-lg font-semibold text-indigo-700">
                                        {formatPeso(viewingProduct.unit_price)}
                                    </dd>
                                    <dd className="text-xs text-slate-500">
                                        per {viewingProduct.unit}
                                    </dd>
                                </div>
                            </dl>

                            <div className="mb-8">
                                <h4 className="mb-2 text-sm font-semibold text-slate-800">
                                    Description
                                </h4>
                                {viewingProduct.description ? (
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                                        {viewingProduct.description}
                                    </p>
                                ) : (
                                    <p className="text-sm text-slate-500">
                                        No description provided.
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-6">
                                {canCheckout && (
                                    <PrimaryButton
                                        type="button"
                                        className="rounded-xl shadow-sm"
                                        onClick={() => {
                                            addToCart(viewingProduct);
                                            closeProductDetails();
                                        }}
                                    >
                                        Add to cart
                                    </PrimaryButton>
                                )}
                                {canManageProducts && (
                                    <SecondaryButton
                                        type="button"
                                        className="rounded-xl"
                                        onClick={() =>
                                            startEdit(viewingProduct)
                                        }
                                    >
                                        Edit product
                                    </SecondaryButton>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
                        <div className="border-b border-slate-100 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                                    Edit product
                                </h3>
                                <button
                                    type="button"
                                    onClick={closeEdit}
                                    className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                    aria-label="Close"
                                >
                                    <svg
                                        className="h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <form
                            onSubmit={submitEdit}
                            className="space-y-4 px-6 py-5"
                        >
                            <div>
                                <InputLabel value="Product image" />
                                <div className="mt-2 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                    {imagePreview ? (
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-sm text-gray-400">
                                            No image
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="mt-2 block w-full text-sm"
                                    onChange={handleImageChange}
                                />
                                <InputError
                                    message={editForm.errors.image}
                                    className="mt-1"
                                />
                                {imagePreview && (
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="mt-2 text-sm text-red-600 hover:underline"
                                    >
                                        Remove image
                                    </button>
                                )}
                            </div>

                            <div>
                                <InputLabel value="Name" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={editForm.data.name}
                                    onChange={(e) =>
                                        editForm.setData("name", e.target.value)
                                    }
                                    required
                                />
                                <InputError
                                    message={editForm.errors.name}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <InputLabel value="Description" />
                                <textarea
                                    className="mt-1 w-full rounded-xl border-slate-200 shadow-sm"
                                    rows={3}
                                    value={editForm.data.description}
                                    onChange={(e) =>
                                        editForm.setData(
                                            "description",
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={editForm.errors.description}
                                    className="mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <InputLabel value="Unit price" />
                                    <TextInput
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="mt-1 block w-full"
                                        value={editForm.data.unit_price}
                                        onChange={(e) =>
                                            editForm.setData(
                                                "unit_price",
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <InputError
                                        message={editForm.errors.unit_price}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Unit" />
                                    <select
                                        value={editForm.data.unit}
                                        onChange={(e) =>
                                            editForm.setData(
                                                "unit",
                                                e.target.value,
                                            )
                                        }
                                        className="mt-1 w-full rounded-xl border-slate-200 shadow-sm"
                                    >
                                        {units.map((unit) => (
                                            <option key={unit} value={unit}>
                                                {unit}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError
                                        message={editForm.errors.unit}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-slate-500">
                                Stock quantity and expiry are managed in the
                                Inventory module.
                            </p>

                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                                <SecondaryButton
                                    type="button"
                                    className="rounded-xl"
                                    onClick={closeEdit}
                                >
                                    Cancel
                                </SecondaryButton>
                                <PrimaryButton
                                    type="submit"
                                    className="rounded-xl shadow-sm"
                                    disabled={editForm.processing}
                                >
                                    {editForm.processing
                                        ? "Saving..."
                                        : "Save product"}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
