import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

const defaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const selectedIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [35, 57],
    iconAnchor: [17, 57],
    popupAnchor: [1, -48],
    shadowSize: [57, 57],
    className: 'nearby-place-selected-marker',
});

function MapViewport({ location, places, selectedIndex }) {
    const map = useMap();

    useEffect(() => {
        if (!location) {
            return;
        }

        if (selectedIndex !== null && places[selectedIndex]) {
            const place = places[selectedIndex];
            map.flyTo([place.lat, place.lng], 16, { duration: 0.8 });
            return;
        }

        if (places.length > 0) {
            const bounds = L.latLngBounds([
                [location.lat, location.lng],
                ...places.map((place) => [place.lat, place.lng]),
            ]);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            return;
        }

        map.flyTo([location.lat, location.lng], 14, { duration: 0.8 });
    }, [location, places, selectedIndex, map]);

    return null;
}

export default function NearbyPlacesMap({
    location,
    places,
    selectedIndex,
    onSelectPlace,
    radiusM = 5000,
    locating = false,
}) {
    if (!location) {
        return (
            <div className="flex h-[28rem] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 text-center text-sm text-gray-500">
                {locating
                    ? 'Detecting your location...'
                    : 'Location unavailable. Allow location access, refresh, or search by place name.'}
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            <MapContainer
                center={[location.lat, location.lng]}
                zoom={14}
                scrollWheelZoom
                className="h-[28rem] w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapViewport location={location} places={places} selectedIndex={selectedIndex} />

                <Circle
                    center={[location.lat, location.lng]}
                    radius={radiusM}
                    pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.08, weight: 2 }}
                />

                <Marker
                    position={[location.lat, location.lng]}
                    icon={L.divIcon({
                        className: '',
                        html: '<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 2px #2563eb;"></div>',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8],
                    })}
                >
                    <Popup>You are here</Popup>
                </Marker>

                {places.map((place, index) => (
                    <Marker
                        key={`${place.lat}-${place.lng}-${index}`}
                        position={[place.lat, place.lng]}
                        icon={selectedIndex === index ? selectedIcon : defaultIcon}
                        eventHandlers={{
                            click: () => onSelectPlace?.(index),
                        }}
                    >
                        <Popup>
                            <div className="text-sm">
                                <p className="font-semibold">{place.name}</p>
                                {place.address && <p className="mt-1 text-gray-600">{place.address}</p>}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
