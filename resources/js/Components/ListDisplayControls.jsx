import { LIST_DISPLAY_OPTIONS } from '@/hooks/useListDisplayLimit';

export default function ListDisplayControls({
    totalCount,
    showingCount,
    displayLimit,
    onLimitChange,
    options = LIST_DISPLAY_OPTIONS,
}) {
    if (totalCount === 0) {
        return null;
    }

    const buttonClass = (active) =>
        `rounded-md px-3 py-1 text-sm transition ${
            active
                ? 'bg-indigo-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
        }`;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="text-gray-600">
                Showing {showingCount} of {totalCount} records
            </p>
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-gray-500">Show:</span>
                {options.map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onLimitChange(option)}
                        className={buttonClass(displayLimit === option)}
                    >
                        {option}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => onLimitChange('all')}
                    className={buttonClass(displayLimit === 'all')}
                >
                    All
                </button>
            </div>
        </div>
    );
}
