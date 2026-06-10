/**
 * Format an appointment/datetime for display in the clinic timezone.
 */
export function formatClinicDateTime(value, timeZone = 'Asia/Manila') {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone,
    }).format(date);
}

/**
 * Normalize API/datetime values to YYYY-MM-DD for date inputs and date-only display.
 */
export function toClinicDateInput(value, timeZone = 'Asia/Manila') {
    if (!value) {
        return '';
    }

    const str = String(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }

    const dateOnlyMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateOnlyMatch && str.includes('T00:00:00')) {
        return dateOnlyMatch[1];
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return dateOnlyMatch?.[1] ?? '';
    }

    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

/**
 * Format a date value as M/D/YYYY in the clinic timezone.
 */
export function formatClinicDate(value, timeZone = 'Asia/Manila') {
    const input = toClinicDateInput(value, timeZone);
    if (!input) {
        return null;
    }

    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        return null;
    }

    const [, year, month, day] = match;
    return `${Number(month)}/${Number(day)}/${year}`;
}
