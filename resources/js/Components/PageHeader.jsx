export default function PageHeader({ children, className = '' }) {
    return (
        <h2
            className={`text-lg font-semibold leading-tight text-gray-800 sm:text-xl ${className}`}
        >
            {children}
        </h2>
    );
}
