export const MODULE_BG_GRADIENT =
    "bg-gradient-to-br from-violet-100 via-fuchsia-50 via-40% to-orange-50 to-95%";

export function PawPrint({ className }) {
    return (
        <svg
            viewBox="0 0 60 60"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            <ellipse cx="14" cy="14" rx="7" ry="9" />
            <ellipse cx="32" cy="10" rx="6" ry="8" />
            <ellipse cx="49" cy="16" rx="6" ry="8" />
            <ellipse cx="8" cy="30" rx="5" ry="7" />
            <path d="M30 22 C14 22 8 34 8 44 C8 54 52 54 52 44 C52 34 46 22 30 22Z" />
        </svg>
    );
}

const PAW_DECORATIONS = [
    { className: "absolute left-[3%] top-[8%] h-8 w-8 rotate-[-20deg] text-violet-200/70" },
    { className: "absolute left-[18%] top-[4%] h-5 w-5 rotate-[10deg] text-fuchsia-200/60" },
    { className: "absolute right-[6%] top-[6%] h-7 w-7 rotate-[30deg] text-orange-200/60" },
    { className: "absolute right-[22%] top-[55%] h-6 w-6 rotate-[-10deg] text-amber-200/70" },
    { className: "absolute left-[8%] top-[60%] h-5 w-5 rotate-[15deg] text-pink-200/60" },
    { className: "absolute left-[42%] top-[3%] h-4 w-4 rotate-[5deg] text-violet-300/50" },
    { className: "absolute left-[60%] top-[70%] h-5 w-5 rotate-[-25deg] text-fuchsia-200/40" },
];

export function ModuleBackgroundDecorations({ fixed = true }) {
    return (
        <div
            className={`pointer-events-none overflow-hidden ${fixed ? "fixed inset-0 z-0" : "absolute inset-0"}`}
            aria-hidden="true"
        >
            {PAW_DECORATIONS.map((paw, index) => (
                <PawPrint key={index} className={paw.className} />
            ))}
        </div>
    );
}

export default function ModuleBackground({ children, className = "" }) {
    return (
        <div className={`relative min-h-screen ${MODULE_BG_GRADIENT} ${className}`}>
            <ModuleBackgroundDecorations fixed />
            {children}
        </div>
    );
}
