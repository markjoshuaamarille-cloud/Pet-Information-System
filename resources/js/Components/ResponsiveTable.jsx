export default function ResponsiveTable({ children, className = '' }) {
    return (
        <div
            className={`overflow-x-auto ${className}`}
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {children}
        </div>
    );
}
