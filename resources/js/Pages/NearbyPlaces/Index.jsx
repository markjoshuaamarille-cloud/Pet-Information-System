import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import NearbyPlacesMap from '@/Components/NearbyPlacesMap';
import ListDisplayControls from '@/Components/ListDisplayControls';
import useListDisplayLimit from '@/hooks/useListDisplayLimit';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_LOCATION = { lat: 14.5995, lng: 120.9842, label: 'Manila' };

function formatDistance(meters) {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)} km`;
    }

    return `${meters} m`;
}

function formatOpeningHours(openingHours) {
    if (!openingHours) {
        return null;
    }

    if (typeof openingHours === 'string') {
        return openingHours;
    }

    if (openingHours.open_now !== undefined) {
        return openingHours.open_now ? 'Open now' : 'Closed now';
    }

    return null;
}

export default function NearbyPlacesIndex() {
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [location, setLocation] = useState(DEFAULT_LOCATION);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [placeName, setPlaceName] = useState('Manila, Philippines');
    const [geocoding, setGeocoding] = useState(false);

    const fetchPlaces = useCallback(async (lat, lng, type = filter) => {
        setLoading(true);
        setError(null);
        setSelectedIndex(null);

        try {
            const response = await window.axios.post(route('nearby-places.search'), {
                lat,
                lng,
                type,
            });

            setPlaces(response.data ?? []);
        } catch (err) {
            const message = err.response?.data?.message
                ?? 'Unable to fetch nearby places. Please try again.';

            setPlaces([]);
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    const searchFromCoordinates = useCallback((lat, lng, sourceLabel = null) => {
        setLocation({ lat, lng, label: sourceLabel });
        setLocating(false);
    }, []);

    const detectLocation = useCallback((showErrors = true) => {
        if (!navigator.geolocation) {
            setLocating(false);
            if (showErrors) {
                setError('Geolocation is not supported by your browser.');
            }
            setShowManualEntry(true);
            return;
        }

        setLocating(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                searchFromCoordinates(
                    position.coords.latitude,
                    position.coords.longitude,
                    'Your current location',
                );
            },
            () => {
                setLocating(false);
                if (showErrors) {
                    setError('Location access was denied. Search by place name or use the Manila default.');
                }
                setShowManualEntry(true);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
        );
    }, [searchFromCoordinates]);

    const searchByPlaceName = async (e) => {
        e.preventDefault();

        const query = placeName.trim();

        if (query.length < 2) {
            setError('Please enter a place name (e.g. Quezon City, Cebu, Davao).');
            return;
        }

        setGeocoding(true);
        setError(null);

        try {
            const response = await window.axios.post(route('nearby-places.geocode'), {
                place: query,
            });

            const { lat, lng, label } = response.data;
            searchFromCoordinates(lat, lng, label);
        } catch (err) {
            const message = err.response?.data?.message
                ?? 'Unable to find that place. Please try a different name.';

            setError(message);
        } finally {
            setGeocoding(false);
        }
    };

    const useDefaultLocation = () => {
        setPlaceName('Manila, Philippines');
        searchFromCoordinates(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng, DEFAULT_LOCATION.label);
    };

    useEffect(() => {
        if (!location) {
            return;
        }

        fetchPlaces(location.lat, location.lng, filter);
    }, [location, filter, fetchPlaces]);

    const {
        visibleItems: visiblePlaces,
        displayLimit,
        setDisplayLimit,
        totalCount: placeListCount,
        showingCount: placeShowingCount,
    } = useListDisplayLimit(places);

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Nearby Vet Clinics &amp; Pet Shops</h2>}>
            <Head title="Nearby Clinics" />
            <div className="py-8">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
                        <p>
                            Showing nearby veterinary clinics, pet shops, and grooming salons around Manila by default.
                            Use <strong>Use my location</strong> for GPS, or search another place by name.
                        </p>
                    </div>

                    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow">
                        <div>
                            <InputLabel value="Place type" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="all">All types</option>
                                <option value="vet">Veterinary clinics</option>
                                <option value="petshop">Pet shops / supplies</option>
                                <option value="grooming">Grooming salons</option>
                            </select>
                        </div>

                        <PrimaryButton type="button" onClick={() => detectLocation(true)} disabled={loading || locating}>
                            {loading || locating ? 'Updating...' : 'Use my location'}
                        </PrimaryButton>

                        <SecondaryButton type="button" onClick={() => setShowManualEntry((value) => !value)}>
                            {showManualEntry ? 'Hide place search' : 'Search by place name'}
                        </SecondaryButton>
                    </div>

                    {showManualEntry && (
                        <form onSubmit={searchByPlaceName} className="mb-6 space-y-4 rounded-lg bg-white p-4 shadow">
                            <div>
                                <InputLabel htmlFor="place-name" value="Place name" />
                                <TextInput
                                    id="place-name"
                                    type="text"
                                    className="mt-1 block w-full"
                                    value={placeName}
                                    onChange={(e) => setPlaceName(e.target.value)}
                                    placeholder="e.g. Quezon City, Cebu, Makati"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Enter a city, barangay, or area name to search nearby clinics and pet shops there.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <PrimaryButton type="submit" disabled={loading || geocoding}>
                                    {geocoding ? 'Finding place...' : 'Search this place'}
                                </PrimaryButton>
                                <SecondaryButton type="button" onClick={useDefaultLocation} disabled={loading || geocoding}>
                                    Use default (Manila)
                                </SecondaryButton>
                            </div>
                        </form>
                    )}

                    <div className="mb-6 grid gap-6 lg:grid-cols-2">
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-800">Map</h3>
                                {location && (
                                    <span className="text-xs text-gray-500">
                                        {location.label ?? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
                                    </span>
                                )}
                            </div>
                            <NearbyPlacesMap
                                location={location}
                                places={places}
                                selectedIndex={selectedIndex}
                                onSelectPlace={setSelectedIndex}
                                locating={locating}
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                Blue dot = search center. Red markers = nearby places. Circle shows 5 km search radius.
                            </p>
                        </div>

                        <div>
                            <h3 className="mb-2 text-sm font-semibold text-gray-800">
                                Results {places.length > 0 && `(${places.length})`}
                            </h3>

                            {error && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            {(loading || locating) && places.length === 0 && (
                                <p className="text-sm text-gray-500">
                                    {locating ? 'Detecting your location...' : 'Loading nearby places...'}
                                </p>
                            )}

                            {!loading && !locating && !error && location && places.length === 0 && (
                                <p className="text-sm text-gray-500">No places found within 5 km. Try a different filter or location.</p>
                            )}

                            {!location && !loading && !locating && !error && (
                                <p className="text-sm text-gray-500">Allow location access or search by place name.</p>
                            )}

                            {places.length > 0 && (
                                <div>
                                    <div className="space-y-3">
                                    {visiblePlaces.map((place, index) => {
                                        const hours = formatOpeningHours(place.opening_hours);
                                        const isSelected = selectedIndex === index;

                                        return (
                                            <button
                                                key={`${place.lat}-${place.lng}-${index}`}
                                                type="button"
                                                onClick={() => setSelectedIndex(index)}
                                                className={`w-full rounded-lg border p-4 text-left shadow-sm transition ${
                                                    isSelected
                                                        ? 'border-indigo-400 bg-indigo-50'
                                                        : 'border-gray-200 bg-white hover:border-indigo-200'
                                                }`}
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <h4 className="font-semibold text-gray-900">{place.name}</h4>
                                                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                                                        {formatDistance(place.distance_m)}
                                                    </span>
                                                </div>

                                                {place.address && (
                                                    <p className="mt-1 text-sm text-gray-600">{place.address}</p>
                                                )}

                                                {place.phone && (
                                                    <p className="mt-2 text-sm text-gray-700">
                                                        Phone:{' '}
                                                        <a
                                                            href={`tel:${place.phone}`}
                                                            className="text-indigo-600 hover:underline"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {place.phone}
                                                        </a>
                                                    </p>
                                                )}

                                                {place.website && (
                                                    <p className="mt-1 text-sm">
                                                        <a
                                                            href={place.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-indigo-600 hover:underline"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            Visit website
                                                        </a>
                                                    </p>
                                                )}

                                                {hours && (
                                                    <p className="mt-1 text-sm text-gray-600">{hours}</p>
                                                )}

                                                {place.lat && place.lng && (
                                                    <a
                                                        href={`https://www.google.com/maps?q=${place.lat},${place.lng}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        Open in Google Maps
                                                    </a>
                                                )}
                                            </button>
                                        );
                                    })}
                                    </div>
                                    <ListDisplayControls
                                        totalCount={placeListCount}
                                        showingCount={placeShowingCount}
                                        displayLimit={displayLimit}
                                        onLimitChange={setDisplayLimit}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
