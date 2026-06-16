import { useState } from 'react';
import axios from 'axios';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import LocationPickerMap from '@/Components/LocationPickerMap';
import {
    applyGeocodeResult,
    composeAddress,
    hasCoordinates,
} from '@/utils/address';

function Field({ label, name, value, error, onChange, required = false, placeholder = '', className = '' }) {
    return (
        <div className={className}>
            <InputLabel htmlFor={name} value={`${label}${required ? ' *' : ''}`} />
            <TextInput
                id={name}
                name={name}
                value={value ?? ''}
                className="mt-1 block w-full"
                placeholder={placeholder}
                onChange={onChange}
                required={required}
            />
            <InputError message={error} className="mt-1" />
        </div>
    );
}

/**
 * Structured Philippine address form with geocode search and map pin.
 *
 * Props:
 *  - data / setData or onChange patch helper
 *  - errors
 *  - geocodeRoute, reverseGeocodeRoute (defaults to public guest routes)
 *  - geoapifyImportRoute + onGeoapifyImport (optional service-flag hints from place search)
 *  - requireCoordinates
 */
export default function AddressLocationForm({
    data,
    setData,
    errors = {},
    geocodeRoute = 'geocode',
    reverseGeocodeRoute = 'reverse-geocode',
    geoapifyImportRoute = null,
    onGeoapifyImport = null,
    requireCoordinates = true,
    showSearchHint = true,
}) {
    const [searchInput, setSearchInput] = useState('');
    const [searching, setSearching] = useState(false);
    const [geocodeError, setGeocodeError] = useState(null);
    const [reverseLoading, setReverseLoading] = useState(false);

    const patch = (updates) => {
        const next = typeof updates === 'function' ? updates(data) : { ...data, ...updates };
        const composed = composeAddress(next);

        setData({
            ...next,
            address: composed || next.address_formatted || next.address || '',
        });
    };

    const runGeocode = async (place) => {
        if (!place?.trim()) {
            return;
        }

        setSearching(true);
        setGeocodeError(null);

        try {
            const res = await axios.post(route(geocodeRoute), { place: place.trim() });
            patch(applyGeocodeResult(data, res.data));
        } catch (err) {
            setGeocodeError(
                err.response?.data?.message
                    ?? 'Unable to locate that address. Try a street, barangay, or city name.',
            );
        } finally {
            setSearching(false);
        }
    };

    const runGeoapifyImport = async () => {
        if (!geoapifyImportRoute || !searchInput.trim()) {
            return;
        }

        setSearching(true);
        setGeocodeError(null);

        try {
            const res = await axios.post(route(geoapifyImportRoute), { place: searchInput.trim() });
            const imported = res.data;

            patch(applyGeocodeResult(data, imported));

            if (onGeoapifyImport) {
                onGeoapifyImport(imported);
            }
        } catch (err) {
            setGeocodeError(
                err.response?.data?.message
                    ?? 'Place not found. Enter your address manually and pin the map.',
            );
        } finally {
            setSearching(false);
        }
    };

    const handleMapMove = async (lat, lng) => {
        patch({
            latitude: lat,
            longitude: lng,
        });

        setReverseLoading(true);
        setGeocodeError(null);

        try {
            const res = await axios.post(route(reverseGeocodeRoute), { lat, lng });
            patch(applyGeocodeResult({ ...data, latitude: lat, longitude: lng }, res.data));
        } catch {
            // Coordinates are still saved even if reverse geocode fails.
        } finally {
            setReverseLoading(false);
        }
    };

    const coordinatesReady = hasCoordinates(data);

    return (
        <div className="space-y-4">
            {showSearchHint && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
                    <p className="font-medium">Exact location required</p>
                    <p className="mt-1 text-xs text-indigo-800">
                        Search your address or drag the map pin to your home or clinic entrance.
                        This is used to find the nearest registered clinics and pet shops.
                    </p>
                </div>
            )}

            <div>
                <InputLabel value="Search address" />
                <div className="mt-1 flex gap-2">
                    <TextInput
                        className="flex-1"
                        placeholder="Street, barangay, city, or business name…"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (geoapifyImportRoute) {
                                    runGeoapifyImport();
                                } else {
                                    runGeocode(searchInput);
                                }
                            }
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => (geoapifyImportRoute ? runGeoapifyImport() : runGeocode(searchInput))}
                        disabled={searching || !searchInput.trim()}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        {searching ? 'Searching…' : 'Search'}
                    </button>
                </div>
                {geocodeError && <p className="mt-1 text-xs text-red-600">{geocodeError}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    label="House / Building / Street"
                    name="address_line1"
                    required
                    value={data.address_line1}
                    error={errors.address_line1}
                    onChange={(e) => patch({ address_line1: e.target.value })}
                    className="sm:col-span-2"
                    placeholder="e.g. 123 Rizal Street"
                />
                <Field
                    label="Unit / Floor / Block"
                    name="address_line2"
                    value={data.address_line2}
                    error={errors.address_line2}
                    onChange={(e) => patch({ address_line2: e.target.value })}
                    className="sm:col-span-2"
                    placeholder="Optional"
                />
                <Field
                    label="Barangay"
                    name="barangay"
                    required
                    value={data.barangay}
                    error={errors.barangay}
                    onChange={(e) => patch({ barangay: e.target.value })}
                    placeholder="e.g. Poblacion"
                />
                <Field
                    label="City / Municipality"
                    name="city"
                    required
                    value={data.city}
                    error={errors.city}
                    onChange={(e) => patch({ city: e.target.value })}
                    placeholder="e.g. Makati City"
                />
                <Field
                    label="Province"
                    name="province"
                    required
                    value={data.province}
                    error={errors.province}
                    onChange={(e) => patch({ province: e.target.value })}
                    placeholder="e.g. Metro Manila"
                />
                <Field
                    label="Postal code"
                    name="postal_code"
                    value={data.postal_code}
                    error={errors.postal_code}
                    onChange={(e) => patch({ postal_code: e.target.value })}
                    placeholder="e.g. 1200"
                />
                <Field
                    label="Country"
                    name="country"
                    value={data.country}
                    error={errors.country}
                    onChange={(e) => patch({ country: e.target.value })}
                    className="sm:col-span-2"
                />
            </div>

            <div>
                <InputLabel value="Full formatted address" />
                <TextInput
                    className="mt-1 block w-full"
                    value={data.address_formatted ?? ''}
                    onChange={(e) => patch({ address_formatted: e.target.value })}
                />
                <InputError message={errors.address_formatted} className="mt-1" />
            </div>

            <div>
                <div className="mb-1 flex items-center justify-between">
                    <InputLabel value="Map pin — click or drag to your exact location *" />
                    {reverseLoading && (
                        <span className="text-xs text-gray-500">Updating address from map…</span>
                    )}
                </div>
                <LocationPickerMap
                    lat={coordinatesReady ? Number(data.latitude) : null}
                    lng={coordinatesReady ? Number(data.longitude) : null}
                    onMove={handleMapMove}
                    height="h-72"
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs text-gray-500">Latitude</label>
                        <TextInput
                            type="number"
                            step="any"
                            className="mt-1 block w-full text-xs"
                            value={data.latitude ?? ''}
                            onChange={(e) => patch({ latitude: e.target.value })}
                            required={requireCoordinates}
                        />
                        <InputError message={errors.latitude} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Longitude</label>
                        <TextInput
                            type="number"
                            step="any"
                            className="mt-1 block w-full text-xs"
                            value={data.longitude ?? ''}
                            onChange={(e) => patch({ longitude: e.target.value })}
                            required={requireCoordinates}
                        />
                        <InputError message={errors.longitude} className="mt-1" />
                    </div>
                </div>
                {requireCoordinates && !coordinatesReady && (
                    <p className="mt-1 text-xs text-amber-700">
                        Search your address or place the map pin before submitting.
                    </p>
                )}
            </div>
        </div>
    );
}
