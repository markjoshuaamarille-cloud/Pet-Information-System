import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

const pinIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

function MapController({ lat, lng }) {
    const map = useMap();

    useEffect(() => {
        if (lat && lng) {
            map.flyTo([lat, lng], 16, { duration: 0.6 });
        }
    }, [lat, lng, map]);

    return null;
}

function DraggableMarker({ lat, lng, onMove }) {
    useMapEvents({
        click(e) {
            onMove(e.latlng.lat, e.latlng.lng);
        },
    });

    if (!lat || !lng) return null;

    return (
        <Marker
            position={[lat, lng]}
            icon={pinIcon}
            draggable
            eventHandlers={{
                dragend(e) {
                    const pos = e.target.getLatLng();
                    onMove(pos.lat, pos.lng);
                },
            }}
        />
    );
}

/**
 * A reusable interactive map for picking/confirming a location.
 *
 * Props:
 *   lat, lng         – current pin coordinates (controlled)
 *   onMove(lat, lng) – called when the user drags the pin or clicks the map
 *   height           – Tailwind h-* class (default "h-64")
 */
export default function LocationPickerMap({ lat, lng, onMove, height = 'h-64' }) {
    const defaultCenter = [14.5995, 120.9842]; // Manila fallback

    return (
        <div className={`overflow-hidden rounded-lg border border-gray-200 shadow-sm ${height}`}>
            <MapContainer
                center={lat && lng ? [lat, lng] : defaultCenter}
                zoom={lat && lng ? 16 : 12}
                scrollWheelZoom
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController lat={lat} lng={lng} />
                <DraggableMarker lat={lat} lng={lng} onMove={onMove} />
            </MapContainer>
        </div>
    );
}
