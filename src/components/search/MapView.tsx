import { formatCurrency } from '../../utils/currency';
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Residence } from '../../types';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
  residences: Residence[];
  onResidenceClick: (res: Residence) => void;
}

const MapContainerAny = MapContainer as any;
const TileLayerAny = TileLayer as any;

export const MapView: React.FC<Props> = ({ residences, onResidenceClick }) => {
  const center: [number, number] = [12.3714, -1.5197]; // Ouaga center

  return (
    <div className="h-[600px] rounded-3xl overflow-hidden border border-gray-100 shadow-inner z-0">
      <MapContainerAny center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayerAny
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {residences.map((res) => {
          const lat = res.address?.coordinates?.lat || res.lat;
          const lng = res.address?.coordinates?.lng || res.lng;
          if (!lat || !lng) return null;
          return (
            <Marker 
              key={res.id} 
              position={[lat, lng]}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <img src={res.images[0]} alt={res.title} className="w-full h-24 object-cover rounded-lg mb-2" />
                  <h4 className="font-bold text-gray-900">{res.title}</h4>
                  <p className="text-sm font-black text-red-600 mb-2">{formatCurrency(res.pricePerNight || res.price_per_night)} FCFA / nuit</p>
                  <button 
                    onClick={() => onResidenceClick(res)}
                    className="w-full bg-red-600 text-white py-2 rounded-lg text-xs font-bold"
                  >
                    Voir détails
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainerAny>
    </div>
  );
};
