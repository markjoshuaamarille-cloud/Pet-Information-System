import { Head, Link } from "@inertiajs/react";
import { useState } from "react";
import StoreDownloadBadges from "@/Components/StoreDownloadBadges";

/* ─── colour palette ─────────────────────────────────────────── */
// cream bg:   #FBF7F2
// navy:       #0D2137
// teal:       #0A7C84
// orange:     #E86716
// soft-gold:  #F4B942

/* ─── tiny icon primitives ───────────────────────────────────── */
function Icon({ path, className = "size-6" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d={path} />
        </svg>
    );
}

const ICONS = {
    paw: "M12 12c0 3-2.5 5-5 4.5S2.5 13 5 11s7-.5 7 1zm0 0c0 3 2.5 5 5 4.5S21 13 19 11s-7-.5-7 1zM8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    stethoscope:
        "M12 2a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4zm0 12v2m0 4a4 4 0 0 0 4-4h-8a4 4 0 0 0 4 4z",
    scissors:
        "M6 3L3 6m0 0l9 9M3 6l9 9M6 21l3-3m0 0l-9-9m9 9l-9-9m12-3l3 3m0 0l-9 9m9-9l-9 9",
    shop: "M3 3h18v4H3V3zm0 4l1.5 12h15L21 7M9 12h6m-3-3v6",
    calendar:
        "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
    shield: "M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7l-9-5z",
    arrow: "M5 12h14M12 5l7 7-7 7",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    check: "M20 6L9 17l-5-5",
    map: "M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z M12 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2",
    phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
    landline:
        "M3 5a2 2 0 0 1 2-2h3.28a1 1 0 0 1 .948.684l1.498 4.493a1 1 0 0 1-.502 1.21l-2.257 1.13a11.042 11.042 0 0 0 5.516 5.516l1.13-2.257a1 1 0 0 1 1.21-.502l4.493 1.498a1 1 0 0 1 .684.949V19a2 2 0 0 1-2 2h-1C9.716 21 3 14.284 3 6V5z",
    mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
    link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
};

const COMPANY = {
    name: "JE310 Solution",
    address: "3A PG Building, #63 West Ave., West Triangle, Quezon City",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=3A+PG+Building+63+West+Ave+West+Triangle+Quezon+City+Philippines",
    mobile: "09175139900",
    mobileTel: "+639175139900",
    landline: "(02) 8376 1733",
    landlineTel: "+63283761733",
    email: "hr@je310solution.com",
    mailSubject: "PAWGO Inquiry",
    website: "https://www.je310solution.com",
    websiteLabel: "www.je310solution.com",
};

const COMPANY_MAILTO = `mailto:${COMPANY.email}?subject=${encodeURIComponent(COMPANY.mailSubject)}`;

function openCompanyEmail(event) {
    event?.preventDefault?.();

    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(COMPANY.email).catch(() => {});
    }

    window.location.href = COMPANY_MAILTO;
}

/* ─── nav ────────────────────────────────────────────────────── */
function Navbar({ auth }) {
    const [open, setOpen] = useState(false);

    return (
        <nav className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* logo */}
                    <Link href="/" className="flex items-center gap-2.5">
                        <img
                            src="/images/pawgo-logo.png"
                            alt="PAWGO"
                            className="h-10 w-10 object-contain"
                        />
                        <span className="text-xl font-extrabold tracking-tight text-[#0D2137]">
                            PAW<span className="text-[#E86716]">GO</span>
                        </span>
                    </Link>

                    {/* desktop nav */}
                    <div className="hidden md:flex md:items-center md:gap-8">
                        {[
                            ["Services", "#services"],
                            ["How It Works", "#how"],
                            ["For Clinics", "#clinics"],
                            ["Contact", "#contact"],
                        ].map(([label, href]) => (
                            <a
                                key={href}
                                href={href}
                                className="text-sm font-medium text-gray-600 transition hover:text-[#E86716]"
                            >
                                {label}
                            </a>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="hidden items-center gap-3 md:flex">
                        {auth.user ? (
                            <Link
                                href={route("dashboard")}
                                className="rounded-full bg-[#E86716] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#cf5b12]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route("login")}
                                    className="text-sm font-medium text-gray-700 transition hover:text-[#E86716]"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    href={route("register")}
                                    className="rounded-full bg-[#E86716] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#cf5b12]"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>

                    {/* mobile toggle */}
                    <button
                        className="md:hidden p-2 text-gray-600"
                        onClick={() => setOpen(!open)}
                    >
                        <span
                            className="block h-0.5 w-6 bg-current mb-1.5 transition-transform"
                            style={
                                open
                                    ? {
                                          transform:
                                              "rotate(45deg) translateY(7px)",
                                      }
                                    : {}
                            }
                        />
                        <span
                            className="block h-0.5 w-6 bg-current mb-1.5"
                            style={open ? { opacity: 0 } : {}}
                        />
                        <span
                            className="block h-0.5 w-6 bg-current transition-transform"
                            style={
                                open
                                    ? {
                                          transform:
                                              "rotate(-45deg) translateY(-7px)",
                                      }
                                    : {}
                            }
                        />
                    </button>
                </div>
            </div>
            {/* mobile menu */}
            {open && (
                <div className="border-t border-gray-100 bg-white px-6 pb-4 md:hidden">
                    {[
                        ["Services", "#services"],
                        ["How It Works", "#how"],
                        ["For Clinics", "#clinics"],
                    ].map(([label, href]) => (
                        <a
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            className="block py-2.5 text-sm font-medium text-gray-700"
                        >
                            {label}
                        </a>
                    ))}
                    <div className="mt-3 flex flex-col gap-2">
                        {auth.user ? (
                            <Link
                                href={route("dashboard")}
                                className="rounded-full bg-[#E86716] py-2 text-center text-sm font-semibold text-white"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route("login")}
                                    className="rounded-full border border-gray-300 py-2 text-center text-sm font-medium text-gray-700"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    href={route("register")}
                                    className="rounded-full bg-[#E86716] py-2 text-center text-sm font-semibold text-white"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}

/* ─── hero ───────────────────────────────────────────────────── */
function Hero({ auth }) {
    return (
        <section className="relative overflow-hidden bg-[#FBF7F2] pt-28 pb-16 lg:pt-36 lg:pb-0">
            {/* decorative blobs */}
            <div className="pointer-events-none absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full bg-[#E86716]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-[#0A7C84]/10 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-center gap-12 lg:grid-cols-2">
                    {/* left copy */}
                    <div className="max-w-xl">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#E86716]/30 bg-[#E86716]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#E86716]">
                            <Icon path={ICONS.map} className="size-3.5" />
                            Available in select areas
                        </span>

                        {/* <h1 className="mt-5 text-5xl font-extrabold leading-[1.1] tracking-tight text-[#0D2137] lg:text-6xl">
                            A Pet-First
                            <br />
                            <span className="text-[#E86716]">Approach to</span>
                            <br />
                            Wellness
                        </h1> */}
                        <h1 className="mt-5 text-5xl font-extrabold leading-[1.1] tracking-tight text-[#0D2137] lg:text-6xl">
                            Caring for Pets,
                            <br />
                            <span className="text-[#E86716]">
                                Every Step of
                            </span>
                            <br />
                            the Way
                        </h1>

                        <p className="mt-6 text-lg leading-relaxed text-gray-500">
                            PAWGO connects pet owners with trusted veterinary
                            clinics, grooming salons, and pet shops — all in one
                            place. Schedule visits, track health records, and
                            shop for your pet effortlessly.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            {auth.user ? (
                                <div className="flex flex-col items-start gap-5">
                                    <Link
                                        href={route("dashboard")}
                                        className="inline-flex items-center gap-2 rounded-full bg-[#E86716] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#E86716]/30 transition hover:bg-[#cf5b12]"
                                    >
                                        Go to Dashboard{" "}
                                        <Icon
                                            path={ICONS.arrow}
                                            className="size-4"
                                        />
                                    </Link>
                                    <StoreDownloadBadges />
                                </div>
                            ) : (
                                <div className="flex flex-col items-start gap-5">
                                    <div className="flex flex-wrap gap-4">
                                        <Link
                                            href={route("register")}
                                            className="inline-flex items-center gap-2 rounded-full bg-[#E86716] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#E86716]/30 transition hover:bg-[#cf5b12]"
                                        >
                                            Get Started Free{" "}
                                            <Icon
                                                path={ICONS.arrow}
                                                className="size-4"
                                            />
                                        </Link>
                                        <Link
                                            href={route("login")}
                                            className="inline-flex items-center gap-2 rounded-full border-2 border-[#0D2137] px-7 py-3.5 text-sm font-bold text-[#0D2137] transition hover:bg-[#0D2137] hover:text-white"
                                        >
                                            Sign In
                                        </Link>
                                    </div>
                                    <StoreDownloadBadges />
                                </div>
                            )}
                        </div>

                        {/* stat pills */}
                        {/* <div className="mt-10 flex flex-wrap gap-6">
                            {[['500+', 'Registered Pets'], ['50+', 'Partner Clinics'], ['4.9★', 'Average Rating']].map(([n, l]) => (
                                <div key={l}>
                                    <p className="text-2xl font-extrabold text-[#0D2137]">{n}</p>
                                    <p className="text-xs text-gray-400">{l}</p>
                                </div>
                            ))}
                        </div> */}
                    </div>

                    {/* right image */}
                    <div className="relative lg:h-[560px]">
                        <div className="relative mx-auto max-w-sm lg:max-w-none">
                            {/* main image card */}
                            <div className="overflow-hidden rounded-3xl shadow-2xl">
                                <img
                                    src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&auto=format&fit=crop&q=80"
                                    alt="Happy dog at vet"
                                    className="h-[420px] w-full object-cover lg:h-[520px]"
                                />
                            </div>
                            {/* floating badge – appointment */}
                            <div className="absolute -left-6 bottom-20 hidden rounded-2xl bg-white px-4 py-3 shadow-xl lg:flex lg:items-center lg:gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A7C84]/10">
                                    <Icon
                                        path={ICONS.calendar}
                                        className="size-5 text-[#0A7C84]"
                                    />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-gray-800">
                                        Next Appointment
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                        Jun 12 · 10:00 AM
                                    </p>
                                </div>
                            </div>
                            {/* floating badge – health */}
                            <div className="absolute -right-4 top-10 hidden rounded-2xl bg-white px-4 py-3 shadow-xl lg:flex lg:items-center lg:gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E86716]/10">
                                    <Icon
                                        path={ICONS.shield}
                                        className="size-5 text-[#E86716]"
                                    />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-gray-800">
                                        Health Record
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                        Vaccinated · Up to date
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* bottom wave */}
            <div className="mt-0 hidden lg:block">
                <svg viewBox="0 0 1440 80" className="w-full fill-white">
                    <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" />
                </svg>
            </div>
        </section>
    );
}

/* ─── trusted bar ────────────────────────────────────────────── */
function TrustedBar() {
    return (
        <section className="bg-white py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">
                    Everything your pet needs, in one platform
                </p>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                    {[
                        {
                            icon: ICONS.stethoscope,
                            label: "Veterinary Care",
                            color: "text-[#0A7C84]",
                            bg: "bg-[#0A7C84]/10",
                        },
                        {
                            icon: ICONS.scissors,
                            label: "Grooming Services",
                            color: "text-[#E86716]",
                            bg: "bg-[#E86716]/10",
                        },
                        {
                            icon: ICONS.shop,
                            label: "Pet Shop",
                            color: "text-[#F4B942]",
                            bg: "bg-[#F4B942]/10",
                        },
                        {
                            icon: ICONS.bell,
                            label: "Health Reminders",
                            color: "text-[#0D2137]",
                            bg: "bg-[#0D2137]/10",
                        },
                    ].map(({ icon, label, color, bg }) => (
                        <div
                            key={label}
                            className="flex flex-col items-center gap-3 text-center"
                        >
                            <div
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${bg}`}
                            >
                                <Icon
                                    path={icon}
                                    className={`size-6 ${color}`}
                                />
                            </div>
                            <p className="text-sm font-semibold text-gray-700">
                                {label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─── services ───────────────────────────────────────────────── */
function Services() {
    const cards = [
        {
            tag: "Veterinary",
            title: "Expert care for your pet's health",
            body: "Book appointments with certified veterinarians, track vaccinations, manage health records, and receive prescription updates — all from your dashboard.",
            img: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=700&auto=format&fit=crop&q=80",
            accent: "#0A7C84",
            badge: "bg-[#0A7C84]/10 text-[#0A7C84]",
        },
        {
            tag: "Grooming",
            title: "Breed-specific haircuts & spa care",
            body: "Regular grooming is essential to your pet's health. Our partner salons use breed-specific techniques to keep coats healthy and tails wagging.",
            img: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=700&auto=format&fit=crop&q=80",
            accent: "#E86716",
            badge: "bg-[#E86716]/10 text-[#E86716]",
        },
        {
            tag: "Pet Shop",
            title: "Premium supplies delivered fast",
            body: "Browse curated pet food, accessories, and medicine from trusted brands. Order from your nearest partner store and track delivery in real time.",
            img: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=700&auto=format&fit=crop&q=80",
            accent: "#F4B942",
            badge: "bg-[#F4B942]/10 text-[#F4B942]",
        },
    ];

    return (
        <section id="services" className="bg-white py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-14 text-center">
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#E86716]">
                        Our Services
                    </span>
                    <h2 className="mt-3 text-4xl font-extrabold text-[#0D2137] lg:text-5xl">
                        Everything your pet deserves
                    </h2>
                    <p className="mt-4 mx-auto max-w-xl text-gray-500">
                        From routine check-ups to emergency care, grooming to
                        retail — PAWGO is the complete pet care platform.
                    </p>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {cards.map(({ tag, title, body, img, accent, badge }) => (
                        <div
                            key={tag}
                            className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-[#FBF7F2] shadow-sm transition hover:shadow-xl"
                        >
                            <div className="h-52 w-full overflow-hidden">
                                <img
                                    src={img}
                                    alt={tag}
                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                />
                            </div>
                            <div className="p-6">
                                <span
                                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badge}`}
                                >
                                    {tag}
                                </span>
                                <h3 className="mt-3 text-xl font-bold text-[#0D2137]">
                                    {title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                                    {body}
                                </p>
                                {/* <button
                                    style={{ color: accent }}
                                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold transition hover:gap-3"
                                >
                                    Explore{" "}
                                    <Icon
                                        path={ICONS.arrow}
                                        className="size-4"
                                    />
                                </button> */}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─── how it works ───────────────────────────────────────────── */
function HowItWorks() {
    const steps = [
        {
            n: "01",
            title: "Create Your Profile",
            body: "Register your account and add your pet's basic information — breed, age, medical history — in under 2 minutes.",
            icon: ICONS.paw,
        },
        {
            n: "02",
            title: "Find Nearby Services",
            body: "Discover partner clinics, groomers, and pet shops sorted by distance. Read reviews and choose what's best for your pet.",
            icon: ICONS.map,
        },
        {
            n: "03",
            title: "Book & Track",
            body: "Schedule appointments, receive reminders, and track every service, vaccination, and purchase from one clean dashboard.",
            icon: ICONS.calendar,
        },
    ];

    return (
        <section id="how" className="bg-[#FBF7F2] py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-14 text-center">
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#E86716]">
                        How It Works
                    </span>
                    <h2 className="mt-3 text-4xl font-extrabold text-[#0D2137] lg:text-5xl">
                        Simple. Smart. Seamless.
                    </h2>
                </div>

                <div className="relative grid gap-8 lg:grid-cols-3">
                    {/* connector line */}
                    <div className="absolute top-16 left-[calc(16.67%-1px)] hidden h-0.5 w-[66.67%] bg-gradient-to-r from-[#0A7C84]/30 via-[#E86716]/30 to-[#F4B942]/30 lg:block" />

                    {steps.map(({ n, title, body, icon }, i) => {
                        const accentColors = ["#0A7C84", "#E86716", "#F4B942"];
                        const bgColors = [
                            "bg-[#0A7C84]/10",
                            "bg-[#E86716]/10",
                            "bg-[#F4B942]/10",
                        ];
                        return (
                            <div
                                key={n}
                                className="relative flex flex-col items-start rounded-3xl bg-white p-8 shadow-sm"
                            >
                                <div
                                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${bgColors[i]}`}
                                >
                                    <Icon
                                        path={icon}
                                        className={`size-7`}
                                        style={{ color: accentColors[i] }}
                                    />
                                </div>
                                <p className="mt-4 text-xs font-bold text-gray-300">
                                    {n}
                                </p>
                                <h3 className="mt-1 text-xl font-bold text-[#0D2137]">
                                    {title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                                    {body}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

/* ─── making pet parenting easy (teal section) ───────────────── */
function PetParenting({ auth }) {
    return (
        <section className="relative overflow-hidden bg-[#0A7C84] py-20 lg:py-28">
            <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http%3A//www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23fff%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-center gap-12 lg:grid-cols-2">
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-widest text-teal-200">
                            For Pet Owners
                        </span>
                        <h2 className="mt-3 text-4xl font-extrabold leading-tight text-white lg:text-5xl">
                            Making pet parenting
                            <br />
                            easy for everyone
                        </h2>
                        <p className="mt-5 text-lg leading-relaxed text-teal-100">
                            Whether you're a first-time pet owner or a seasoned
                            animal lover, PAWGO gives you the tools to provide
                            the best care — without the hassle.
                        </p>

                        <ul className="mt-8 space-y-4">
                            {[
                                "Centralised health & vaccination records",
                                "Real-time appointment scheduling",
                                "Nearest pet shop with instant delivery",
                                "Grooming reminders & history",
                            ].map((item) => (
                                <li
                                    key={item}
                                    className="flex items-start gap-3 text-teal-100"
                                >
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                                        <Icon
                                            path={ICONS.check}
                                            className="size-3 text-white"
                                        />
                                    </span>
                                    <span className="text-sm leading-relaxed">
                                        {item}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-10">
                            {auth.user ? (
                                <Link
                                    href={route("dashboard")}
                                    className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#0A7C84] shadow transition hover:bg-teal-50"
                                >
                                    Go to Dashboard{" "}
                                    <Icon
                                        path={ICONS.arrow}
                                        className="size-4"
                                    />
                                </Link>
                            ) : (
                                <Link
                                    href={route("register")}
                                    className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#0A7C84] shadow transition hover:bg-teal-50"
                                >
                                    Start for free{" "}
                                    <Icon
                                        path={ICONS.arrow}
                                        className="size-4"
                                    />
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="overflow-hidden rounded-3xl shadow-2xl">
                            <img
                                src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80"
                                alt="Person with dog"
                                className="h-[400px] w-full object-cover lg:h-[480px]"
                            />
                        </div>
                        {/* review card */}
                        <div className="absolute -bottom-6 -left-4 rounded-2xl bg-white p-4 shadow-xl lg:w-64">
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Icon
                                        key={i}
                                        path={ICONS.star}
                                        className="size-3.5 fill-[#F4B942] stroke-none text-[#F4B942]"
                                    />
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                                "PAWGO made managing my 3 dogs' vet appointments
                                so much easier. Highly recommend!"
                            </p>
                            <p className="mt-2 text-[10px] font-semibold text-gray-400">
                                — Maria S., Pet Owner
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ─── for clinics ────────────────────────────────────────────── */
function ForClinics({ auth }) {
    return (
        <section id="clinics" className="bg-white py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-center gap-12 lg:grid-cols-2">
                    <div className="order-2 lg:order-1">
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                {
                                    label: "Appointment Management",
                                    icon: ICONS.calendar,
                                    bg: "bg-[#FBF7F2]",
                                },
                                {
                                    label: "Billing & Invoicing",
                                    icon: ICONS.shop,
                                    bg: "bg-[#FBF7F2]",
                                },
                                {
                                    label: "Health Record Keeping",
                                    icon: ICONS.shield,
                                    bg: "bg-[#FBF7F2]",
                                },
                                {
                                    label: "Staff & Role Control",
                                    icon: ICONS.stethoscope,
                                    bg: "bg-[#FBF7F2]",
                                },
                            ].map(({ label, icon, bg }) => (
                                <div
                                    key={label}
                                    className={`flex flex-col gap-3 rounded-2xl ${bg} p-5 shadow-sm`}
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E86716]/10">
                                        <Icon
                                            path={icon}
                                            className="size-5 text-[#E86716]"
                                        />
                                    </div>
                                    <p className="text-sm font-semibold text-[#0D2137]">
                                        {label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="order-1 lg:order-2">
                        <span className="text-xs font-semibold uppercase tracking-widest text-[#E86716]">
                            For Clinics & Shops
                        </span>
                        <h2 className="mt-3 text-4xl font-extrabold text-[#0D2137] lg:text-5xl">
                            Powerful tools for every pet business
                        </h2>
                        <p className="mt-5 text-gray-500 leading-relaxed">
                            Register your clinic, grooming salon, or pet shop on
                            PAWGO and get access to a complete management suite
                            — scheduling, billing, inventory, service catalog,
                            and more.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-4">
                            {auth.user ? (
                                <Link
                                    href={route("dashboard")}
                                    className="inline-flex items-center gap-2 rounded-full bg-[#0D2137] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#1a3252]"
                                >
                                    Go to Dashboard{" "}
                                    <Icon
                                        path={ICONS.arrow}
                                        className="size-4"
                                    />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route("register-clinic-owner")}
                                        className="inline-flex items-center gap-2 rounded-full bg-[#0D2137] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#1a3252]"
                                    >
                                        Register Your Clinic{" "}
                                        <Icon
                                            path={ICONS.arrow}
                                            className="size-4"
                                        />
                                    </Link>
                                    <Link
                                        href={route("login")}
                                        className="inline-flex items-center gap-2 rounded-full border-2 border-gray-200 px-7 py-3.5 text-sm font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                                    >
                                        Sign In
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ─── reviews ────────────────────────────────────────────────── */
function Reviews() {
    const reviews = [
        {
            name: "Carlos M.",
            role: "Dog Owner",
            text: "Booking a vet appointment used to take me 30 minutes. Now it's under 2. PAWGO is a game changer for pet owners.",
            rating: 5,
            avatar: "https://i.pravatar.cc/60?img=12",
        },
        {
            name: "Ana R.",
            role: "Cat Owner",
            text: "I love that all my cat's health records are in one place. No more searching for paper vaccination booklets!",
            rating: 5,
            avatar: "https://i.pravatar.cc/60?img=47",
        },
        {
            name: "Dr. Lito",
            role: "Veterinarian",
            text: "The clinic management tools are excellent. Billing, scheduling, and health records — all seamlessly integrated.",
            rating: 5,
            avatar: "https://i.pravatar.cc/60?img=33",
        },
    ];

    return (
        <section className="bg-[#FBF7F2] py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-14 text-center">
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#E86716]">
                        Testimonials
                    </span>
                    <h2 className="mt-3 text-4xl font-extrabold text-[#0D2137] lg:text-5xl">
                        Loved by pet families
                    </h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-3">
                    {reviews.map(({ name, role, text, rating, avatar }) => (
                        <div
                            key={name}
                            className="rounded-3xl bg-white p-7 shadow-sm"
                        >
                            <div className="flex gap-1">
                                {[...Array(rating)].map((_, i) => (
                                    <Icon
                                        key={i}
                                        path={ICONS.star}
                                        className="size-4 fill-[#F4B942] stroke-none text-[#F4B942]"
                                    />
                                ))}
                            </div>
                            <p className="mt-4 text-sm leading-relaxed text-gray-600">
                                &ldquo;{text}&rdquo;
                            </p>
                            <div className="mt-6 flex items-center gap-3">
                                <img
                                    src={avatar}
                                    alt={name}
                                    className="h-10 w-10 rounded-full object-cover"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-[#0D2137]">
                                        {name}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {role}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─── CTA banner ─────────────────────────────────────────────── */
function CTABanner({ auth }) {
    return (
        <section className="bg-[#E86716] py-20">
            <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
                <img
                    src="/images/pawgo-logo.png"
                    alt="PAWGO"
                    className="mx-auto mb-5 h-16 w-16 object-contain"
                />
                <h2 className="text-4xl font-extrabold text-white lg:text-5xl">
                    Pawsitive Always.
                </h2>
                <p className="mt-4 text-lg text-orange-100">
                    Join thousands of pet owners and clinics already using
                    PAWGO. Your pet deserves the very best.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                    {auth.user ? (
                        <Link
                            href={route("dashboard")}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-[#E86716] shadow transition hover:bg-orange-50"
                        >
                            Go to Dashboard{" "}
                            <Icon path={ICONS.arrow} className="size-4" />
                        </Link>
                    ) : (
                        <>
                            <Link
                                href={route("register")}
                                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-[#E86716] shadow transition hover:bg-orange-50"
                            >
                                Get Started — It's Free{" "}
                                <Icon path={ICONS.arrow} className="size-4" />
                            </Link>
                            <Link
                                href={route("login")}
                                className="inline-flex items-center gap-2 rounded-full border-2 border-white px-8 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                            >
                                Sign In
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

/* ─── contact ─────────────────────────────────────────────────── */
function ContactPill({ icon, href, external, onClick, children }) {
    const className =
        "group flex w-full items-center gap-4 rounded-full border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:border-[#E86716]/30 hover:shadow-md sm:max-w-xl";

    const content = (
        <>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0D2137] text-white transition group-hover:bg-[#E86716]">
                <Icon path={icon} className="size-5" />
            </span>
            <span className="text-left text-sm font-medium leading-snug text-gray-700">
                {children}
            </span>
        </>
    );

    if (href) {
        return (
            <a
                href={href}
                className={className}
                onClick={onClick}
                {...(external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
            >
                {content}
            </a>
        );
    }

    return <div className={className}>{content}</div>;
}

function ContactSection() {
    return (
        <section id="contact" className="bg-[#FBF7F2] py-20 lg:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-start gap-12 lg:grid-cols-2">
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-widest text-[#E86716]">
                            Get in Touch
                        </span>
                        <h2 className="mt-3 text-4xl font-extrabold text-[#0D2137] lg:text-5xl">
                            Contact us
                        </h2>
                        <p className="mt-4 max-w-md text-gray-500 leading-relaxed">
                            Have questions about PAWGO, clinic registration, or
                            partnership opportunities? Reach out to{" "}
                            <span className="font-semibold text-[#0D2137]">
                                {COMPANY.name}
                            </span>
                            — we&apos;re happy to help.
                        </p>
                        {/* <a
                            href={COMPANY_MAILTO}
                            onClick={openCompanyEmail}
                            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#E86716] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#E86716]/25 transition hover:bg-[#cf5b12]"
                        >
                            Contact Us
                            <Icon path={ICONS.arrow} className="size-4" />
                        </a> */}
                    </div>

                    <div className="flex flex-col gap-3">
                        <ContactPill
                            icon={ICONS.map}
                            href={COMPANY.mapUrl}
                            external
                        >
                            {COMPANY.address}
                        </ContactPill>
                        <ContactPill
                            icon={ICONS.phone}
                            href={`tel:${COMPANY.mobileTel}`}
                        >
                            {COMPANY.mobile}
                        </ContactPill>
                        <ContactPill
                            icon={ICONS.landline}
                            href={`tel:${COMPANY.landlineTel}`}
                        >
                            {COMPANY.landline}
                        </ContactPill>
                        <ContactPill
                            icon={ICONS.mail}
                            href={COMPANY_MAILTO}
                            onClick={openCompanyEmail}
                        >
                            {COMPANY.email}
                        </ContactPill>
                        <ContactPill
                            icon={ICONS.link}
                            href={COMPANY.website}
                            external
                        >
                            {COMPANY.websiteLabel}
                        </ContactPill>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ─── footer ─────────────────────────────────────────────────── */
function Footer() {
    return (
        <footer className="bg-[#0D2137] py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-3">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <img
                                src="/images/pawgo-logo.png"
                                alt="PAWGO"
                                className="h-9 w-9 object-contain"
                            />
                            <span className="text-lg font-extrabold tracking-tight text-white">
                                PAW<span className="text-[#E86716]">GO</span>
                            </span>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-gray-400">
                            Pawsitive Always — your complete pet care platform
                            for clinics, groomers, and pet owners.
                        </p>
                        <div className="mt-6">
                            <StoreDownloadBadges />
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                            Quick links
                        </p>
                        <ul className="mt-4 space-y-2">
                            {[
                                ["Services", "#services"],
                                ["How It Works", "#how"],
                                ["For Clinics", "#clinics"],
                                ["Contact", "#contact"],
                            ].map(([label, href]) => (
                                <li key={href}>
                                    <a
                                        href={href}
                                        className="text-sm text-gray-400 transition hover:text-white"
                                    >
                                        {label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                            {COMPANY.name}
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-gray-400">
                            <li>{COMPANY.address}</li>
                            <li>
                                <a
                                    href={`tel:${COMPANY.mobileTel}`}
                                    className="transition hover:text-white"
                                >
                                    {COMPANY.mobile}
                                </a>
                            </li>
                            <li>
                                <a
                                    href={`tel:${COMPANY.landlineTel}`}
                                    className="transition hover:text-white"
                                >
                                    {COMPANY.landline}
                                </a>
                            </li>
                            <li>
                                <a
                                    href={COMPANY_MAILTO}
                                    onClick={openCompanyEmail}
                                    className="transition hover:text-white"
                                >
                                    {COMPANY.email}
                                </a>
                            </li>
                            <li>
                                <a
                                    href={COMPANY.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="transition hover:text-white"
                                >
                                    {COMPANY.websiteLabel}
                                </a>
                            </li>
                        </ul>
                        <a
                            href={COMPANY_MAILTO}
                            onClick={openCompanyEmail}
                            className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-xs font-semibold text-white transition hover:border-[#E86716] hover:bg-[#E86716]"
                        >
                            Contact Us
                        </a>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs text-gray-500">
                    © {new Date().getFullYear()} PAWGO — Pawsitive Always. All
                    rights reserved. Powered by {COMPANY.name}.
                </p>
            </div>
        </footer>
    );
}

/* ─── page root ──────────────────────────────────────────────── */
export default function Welcome({ auth }) {
    return (
        <>
            <Head title="PAWGO — Pawsitive Always" />
            <div className="font-sans antialiased">
                <Navbar auth={auth} />
                <Hero auth={auth} />
                <TrustedBar />
                <Services />
                <HowItWorks />
                <PetParenting auth={auth} />
                <ForClinics auth={auth} />
                <Reviews />
                <CTABanner auth={auth} />
                <ContactSection />
                <Footer />
            </div>
        </>
    );
}
