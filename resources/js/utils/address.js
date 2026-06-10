export const ADDRESS_FIELDS = [
    'address_line1',
    'address_line2',
    'barangay',
    'city',
    'province',
    'postal_code',
    'country',
    'address',
    'address_formatted',
    'latitude',
    'longitude',
    'geoapify_place_id',
    'geoapify_label',
];

export function emptyAddressForm(overrides = {}) {
    return {
        address_line1: '',
        address_line2: '',
        barangay: '',
        city: '',
        province: '',
        postal_code: '',
        country: 'Philippines',
        address: '',
        address_formatted: '',
        latitude: '',
        longitude: '',
        geoapify_place_id: '',
        geoapify_label: '',
        ...overrides,
    };
}

export function composeAddress(fields) {
    const parts = [
        fields.address_line1,
        fields.address_line2,
        fields.barangay ? `Brgy. ${fields.barangay.replace(/^Brgy\.?\s*/i, '')}` : '',
        fields.city,
        fields.province,
        fields.postal_code,
        fields.country,
    ].filter((part) => String(part ?? '').trim() !== '');

    return parts.join(', ');
}

export function applyGeocodeResult(current, result) {
    const next = {
        ...current,
        address_line1: result.address_line1 ?? current.address_line1,
        address_line2: result.address_line2 ?? current.address_line2,
        barangay: result.barangay ?? current.barangay,
        city: result.city ?? current.city,
        province: result.province ?? current.province,
        postal_code: result.postal_code ?? current.postal_code,
        country: result.country ?? current.country ?? 'Philippines',
        address_formatted: result.address_formatted ?? result.label ?? current.address_formatted,
        latitude: result.lat ?? result.latitude ?? current.latitude,
        longitude: result.lng ?? result.longitude ?? current.longitude,
        geoapify_place_id: result.geoapify_place_id ?? current.geoapify_place_id,
        geoapify_label: result.geoapify_label ?? result.label ?? current.geoapify_label,
    };

    next.address = composeAddress(next) || next.address_formatted || current.address;

    return next;
}

export function hasCoordinates(fields) {
    const lat = Number(fields.latitude);
    const lng = Number(fields.longitude);

    return Number.isFinite(lat) && Number.isFinite(lng);
}

export function addressFieldErrors(errors, prefix = '') {
    const resolved = {};

    ADDRESS_FIELDS.forEach((field) => {
        const key = prefix ? `${prefix}.${field}` : field;
        if (errors[key]) {
            resolved[field] = errors[key];
        } else if (errors[field]) {
            resolved[field] = errors[field];
        }
    });

    return resolved;
}
