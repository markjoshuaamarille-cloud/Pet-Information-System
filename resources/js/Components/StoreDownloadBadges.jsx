const APP_STORE_URL = "#";
const GOOGLE_PLAY_URL = "#";

function AppStoreBadge({ href = APP_STORE_URL }) {
    return (
        <a
            href={href}
            aria-label="Download on the App Store — coming soon"
            className="inline-block opacity-90 transition hover:opacity-100"
        >
            <svg
                viewBox="0 0 135 40"
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-auto sm:h-[3.25rem]"
                aria-hidden="true"
            >
                <rect width="135" height="40" rx="6" fill="#000" />
                <path
                    d="M24.8 20.3c-.1-3.2 2.6-4.7 2.7-4.8-1.5-2.2-3.8-2.5-4.6-2.5-2-.2-3.9 1.2-4.9 1.2-1 0-2.6-1.1-4.3-1.1-2.2 0-4.2 1.3-5.3 3.3-2.3 4-0.6 9.9 1.6 13.1 1.1 1.6 2.4 3.3 4.1 3.2 1.7-.1 2.3-1.1 4.3-1.1s2.6 1.1 4.4 1.1c1.8 0 2.9-1.6 4-3.2 1.3-1.8 1.8-3.6 1.8-3.7-.1 0-3.5-1.3-3.5-5.5zm-3.3-8.9c.9-1.1 1.6-2.6 1.4-4.1-1.4.1-3 0.9-4 2-0.8 1-1.5 2.6-1.3 4.1 1.5.1 3.1-.8 3.9-2z"
                    fill="#fff"
                    transform="translate(6 4) scale(0.85)"
                />
                <text
                    x="44"
                    y="14"
                    fill="#fff"
                    fontSize="7"
                    fontFamily="system-ui, sans-serif"
                >
                    Download on the
                </text>
                <text
                    x="44"
                    y="28"
                    fill="#fff"
                    fontSize="13"
                    fontWeight="600"
                    fontFamily="system-ui, sans-serif"
                >
                    App Store
                </text>
            </svg>
        </a>
    );
}

function GooglePlayBadge({ href = GOOGLE_PLAY_URL }) {
    return (
        <a
            href={href}
            aria-label="Get it on Google Play — coming soon"
            className="inline-block opacity-90 transition hover:opacity-100"
        >
            <svg
                viewBox="0 0 135 40"
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-auto sm:h-[3.25rem]"
                aria-hidden="true"
            >
                <rect width="135" height="40" rx="6" fill="#000" />
                <path d="M11 8.5v23l12.5-11.5L11 8.5z" fill="#32BBFF" />
                <path
                    d="M11 8.5l12.5 11.5 4.5-4.1L17.5 8.5H11z"
                    fill="#32BBFF"
                />
                <path d="M11 31.5l12.5-11.5-4.5-4.1L11 31.5z" fill="#F9AB00" />
                <path d="M23.5 20l4.5-4.1 9.5 5.5-14-1.4z" fill="#F14336" />
                <path d="M23.5 20l14 1.4-9.5 5.5-4.5-4.1z" fill="#00F076" />
                <path
                    d="M28 15.9l9.5 5.5-9.5 5.5V15.9z"
                    fill="#00F076"
                    opacity="0.85"
                />
                <text
                    x="44"
                    y="14"
                    fill="#fff"
                    fontSize="7"
                    fontFamily="system-ui, sans-serif"
                >
                    GET IT ON
                </text>
                <text
                    x="44"
                    y="28"
                    fill="#fff"
                    fontSize="13"
                    fontWeight="600"
                    fontFamily="system-ui, sans-serif"
                >
                    Google Play
                </text>
            </svg>
        </a>
    );
}

export default function StoreDownloadBadges() {
    return (
        <div className="flex flex-wrap items-center gap-4">
            <AppStoreBadge />
            <GooglePlayBadge />
        </div>
    );
}
