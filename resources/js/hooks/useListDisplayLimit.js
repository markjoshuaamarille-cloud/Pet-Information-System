import { useMemo, useState } from 'react';

export const DEFAULT_LIST_DISPLAY_LIMIT = 15;

export const LIST_DISPLAY_OPTIONS = [15, 25, 50, 100];

export default function useListDisplayLimit(items, initialLimit = DEFAULT_LIST_DISPLAY_LIMIT) {
    const [displayLimit, setDisplayLimit] = useState(initialLimit);

    const visibleItems = useMemo(() => {
        if (displayLimit === 'all' || displayLimit >= items.length) {
            return items;
        }

        return items.slice(0, displayLimit);
    }, [items, displayLimit]);

    return {
        visibleItems,
        displayLimit,
        setDisplayLimit,
        totalCount: items.length,
        showingCount: visibleItems.length,
    };
}
