export default function PageContent({
    children,
    className = '',
    narrow = false,
    maxWidth,
}) {
    const widthClass =
        maxWidth ?? (narrow ? 'max-w-3xl' : 'max-w-7xl');

    return (
        <div className={`py-6 sm:py-8 ${className}`}>
            <div
                className={`mx-auto ${widthClass} px-4 sm:px-6 lg:px-8`}
            >
                {children}
            </div>
        </div>
    );
}
