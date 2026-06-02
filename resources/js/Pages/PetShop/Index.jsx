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
    expired: "bg-red-100 text-red-800",
    critical: "bg-orange-100 text-orange-800",
    expiring_soon: "bg-amber-100 text-amber-800",
    ok: "bg-green-100 text-green-800",
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

export default function PetShopIndex({
    products,
    categories,
    clients = [],
    canManageProducts = false,
    canCheckout = false,
    canSelectClient = false,
    customerClientId = null,
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
                        checkoutForm.setData("client_id", String(customerClientId));
                    }
                },
                onFinish: () => setCheckoutProcessing(false),
            },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Pet Shop
                </h2>
            }
        >
            <Head title="Pet Shop" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
                        <p>
                            Browse products from clinic inventory (excluding
                            vaccines).
                            {canCheckout &&
                                canSelectClient &&
                                " Use the cart to place orders, then process tax, discount, and payment in Pet Shop Billing."}
                            {canCheckout &&
                                !canSelectClient &&
                                " Add items to your cart and place an order. Clinic staff will process payment."}
                            {canManageProducts &&
                                " Super admin can edit product details and upload images."}
                        </p>
                    </div>

                    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow">
                        <div className="min-w-[12rem] flex-1">
                            <InputLabel value="Search products" />
                            <TextInput
                                type="search"
                                className="mt-1 block w-full"
                                placeholder="Search by name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div>
                            <InputLabel value="Category" />
                            <select
                                value={categoryFilter}
                                onChange={(e) =>
                                    setCategoryFilter(e.target.value)
                                }
                                className="mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                        {canCheckout && (
                            <SecondaryButton
                                type="button"
                                onClick={() => setShowCart((value) => !value)}
                            >
                                {showCart
                                    ? "Hide cart"
                                    : `Show cart (${cart.length})`}
                            </SecondaryButton>
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
                                <p className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow">
                                    No in-stock products found. Add inventory
                                    items (non-vaccine categories) first.
                                </p>
                            ) : (
                                <>
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                                                className="flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <div className="flex h-40 items-center justify-center bg-gray-100">
                                                    {product.image_url ? (
                                                        <img
                                                            src={
                                                                product.image_url
                                                            }
                                                            alt={product.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-sm text-gray-400">
                                                            No image
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-1 flex-col p-4">
                                                    <div className="mb-2 flex items-start justify-between gap-2">
                                                        <h3 className="line-clamp-2 min-h-0 flex-1 font-semibold text-gray-900">
                                                            {product.name}
                                                        </h3>
                                                        <span
                                                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[product.stock_status] ?? statusBadge.ok}`}
                                                        >
                                                            {product.quantity}{" "}
                                                            in stock
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-indigo-600">
                                                        {product.category_label}
                                                    </p>
                                                    <div className="mt-2 min-h-[2.5rem]">
                                                        {product.description ? (
                                                            <p className="line-clamp-2 text-sm text-gray-600">
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
                                                    <p className="mt-3 text-lg font-semibold text-gray-900">
                                                        {formatPeso(
                                                            product.unit_price,
                                                        )}
                                                        <span className="block text-sm font-normal leading-snug text-gray-500 line-clamp-1">
                                                            per {product.unit}
                                                        </span>
                                                    </p>
                                                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                                                        {canCheckout && (
                                                            <PrimaryButton
                                                                type="button"
                                                                className="text-xs"
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
                                                                className="text-xs"
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
                            <aside className="rounded-lg bg-white p-4 shadow lg:col-span-1">
                                <h3 className="mb-4 text-lg font-semibold text-gray-800">
                                    {canSelectClient ? "POS Cart" : "Your cart"}
                                </h3>

                                {!canSelectClient && !customerClientId && (
                                    <p className="mb-4 text-sm text-red-600">
                                        Your account is not linked to a client
                                        record. Please contact the clinic to
                                        place orders.
                                    </p>
                                )}

                                {cart.length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                        {canSelectClient
                                            ? "Cart is empty. Add products to begin a sale."
                                            : "Your cart is empty. Add products to place an order."}
                                    </p>
                                ) : (
                                    <form
                                        onSubmit={submitCheckout}
                                        className="space-y-4"
                                    >
                                        <ul className="max-h-64 space-y-3 overflow-y-auto text-sm">
                                            {cart.map((line) => (
                                                <li
                                                    key={line.medicine_id}
                                                    className="rounded border border-gray-200 p-3"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="font-medium text-gray-900">
                                                            {line.name}
                                                        </p>
                                                        <button
                                                            type="button"
                                                            className="text-xs text-red-600 hover:underline"
                                                            onClick={() =>
                                                                removeFromCart(
                                                                    line.medicine_id,
                                                                )
                                                            }
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                    <div className="mt-2 flex items-center justify-between gap-2">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={
                                                                line.max_quantity
                                                            }
                                                            value={
                                                                line.quantity
                                                            }
                                                            onChange={(e) =>
                                                                updateCartQty(
                                                                    line.medicine_id,
                                                                    Number(
                                                                        e.target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
                                                            className="w-16 rounded border-gray-300 text-sm"
                                                        />
                                                        <span className="text-gray-700">
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
                                                        checkoutForm.data
                                                            .client_id
                                                    }
                                                    onChange={(e) =>
                                                        checkoutForm.setData(
                                                            "client_id",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                                                    required
                                                >
                                                    <option value="">
                                                        Select client
                                                    </option>
                                                    {clients.map((client) => (
                                                        <option
                                                            key={client.id}
                                                            value={client.id}
                                                        >
                                                            {client.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <InputError
                                                    message={
                                                        checkoutForm.errors
                                                            .client_id
                                                    }
                                                    className="mt-1"
                                                />
                                            </div>
                                        ) : (
                                            <InputError
                                                message={
                                                    pageErrors.client_id ||
                                                    checkoutForm.errors.client_id
                                                }
                                                className="mt-1"
                                            />
                                        )}

                                        <div>
                                            <InputLabel value="Notes" />
                                            <textarea
                                                value={checkoutForm.data.notes}
                                                onChange={(e) =>
                                                    checkoutForm.setData(
                                                        "notes",
                                                        e.target.value,
                                                    )
                                                }
                                                rows={2}
                                                className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                                            />
                                        </div>

                                        <div className="rounded bg-gray-50 p-3 text-sm">
                                            <div className="flex justify-between font-semibold">
                                                <span>Order subtotal</span>
                                                <span>{formatPeso(cartSubtotal)}</span>
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500">
                                                {canSelectClient
                                                    ? "Tax and discount are applied in Pet Shop Billing before payment."
                                                    : "Your order will be reviewed by clinic staff for payment."}
                                            </p>
                                        </div>

                                        <InputError
                                            message={
                                                pageErrors.items ||
                                                checkoutForm.errors.items
                                            }
                                            className="mt-1"
                                        />

                                        <PrimaryButton
                                            type="submit"
                                            className="w-full justify-center"
                                            disabled={
                                                checkoutProcessing ||
                                                cart.length === 0 ||
                                                (!canSelectClient &&
                                                    !customerClientId) ||
                                                (canSelectClient &&
                                                    !checkoutForm.data.client_id)
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
                            </aside>
                        )}
                    </div>
                </div>
            </div>

            {viewingProduct && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={closeProductDetails}
                >
                    <div
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex h-56 items-center justify-center bg-gray-100 sm:h-72">
                            {viewingProduct.image_url ? (
                                <img
                                    src={viewingProduct.image_url}
                                    alt={viewingProduct.name}
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <span className="text-sm text-gray-400">
                                    No image
                                </span>
                            )}
                        </div>

                        <div className="p-6">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-indigo-600">
                                        {viewingProduct.category_label}
                                    </p>
                                    <h3 className="mt-1 text-2xl font-semibold text-gray-900">
                                        {viewingProduct.name}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeProductDetails}
                                    className="shrink-0 text-gray-500 hover:text-gray-700"
                                >
                                    Close
                                </button>
                            </div>

                            <div className="mb-4 flex flex-wrap gap-2">
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge[viewingProduct.stock_status] ?? statusBadge.ok}`}
                                >
                                    {stockStatusLabels[
                                        viewingProduct.stock_status
                                    ] ?? "In stock"}
                                </span>
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                                    {viewingProduct.quantity}{" "}
                                    {viewingProduct.unit} available
                                </span>
                            </div>

                            <dl className="mb-6 grid gap-3 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
                                <div>
                                    <dt className="text-gray-500">Price</dt>
                                    <dd className="font-semibold text-gray-900">
                                        {formatPeso(viewingProduct.unit_price)}{" "}
                                        per {viewingProduct.unit}
                                    </dd>
                                </div>
                                {/* <div>
                                    <dt className="text-gray-500">Expiry date</dt>
                                    <dd className="font-medium text-gray-900">
                                        {formatDate(viewingProduct.expiry_date)}
                                    </dd>
                                </div> */}
                            </dl>

                            <div className="mb-6">
                                <h4 className="mb-2 text-sm font-semibold text-gray-800">
                                    Description
                                </h4>
                                {viewingProduct.description ? (
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                                        {viewingProduct.description}
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-500">
                                        No description provided.
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {canCheckout && (
                                    <PrimaryButton
                                        type="button"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                Edit Product
                            </h3>
                            <button
                                type="button"
                                onClick={closeEdit}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                Close
                            </button>
                        </div>

                        <form onSubmit={submitEdit} className="space-y-4">
                            <div>
                                <InputLabel value="Product image" />
                                <div className="mt-2 flex h-40 items-center justify-center overflow-hidden rounded border bg-gray-50">
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
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
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
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
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

                            <p className="text-xs text-gray-500">
                                Stock quantity and expiry are managed in the
                                Inventory module.
                            </p>

                            <div className="flex justify-end gap-3">
                                <SecondaryButton
                                    type="button"
                                    onClick={closeEdit}
                                >
                                    Cancel
                                </SecondaryButton>
                                <PrimaryButton
                                    type="submit"
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
