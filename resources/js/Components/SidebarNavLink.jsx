import { Link } from '@inertiajs/react';

export default function SidebarNavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition duration-150 ease-in-out focus:outline-none ${
                active
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } ${className}`}
        >
            {children}
        </Link>
    );
}
