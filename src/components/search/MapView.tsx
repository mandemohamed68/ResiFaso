import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Residence } from '../../types';
import L from 'leaflet';
import { formatFCFA } from '../../lib/utils';
import { MapPin, Star, Phone, MessageSquare } from 'lucide-react';

interface Props {
  residences: Residence[];
  onResidenceClick: (res: Residence) => void;
}

const MapContainerAny = MapContainer as any;
const TileLayerAny = TileLayer as any;

// Coordinate lookup for Burkina cities & neighborhoods
const CITY_COORDS: Record<string, [number, number]> = {
  'ouagadougou': [12.3714, -1.5197],
  'ouaga': [12.3714, -1.5197],
  'bobo-dioulasso': [11.1772, -4.2979],
  'bobo': [11.1772, -4.2979],
  'koudougou': [12.2500, -2.3667],
  'banfora': [10.6333, -4.7500],
  'ouahigouya': [13.5833, -2.4167],
};

const NEIGHBORHOOD_OFFSETS: Record<string, [number, number]> = {
  'ouaga-2000': [-0.063, 0.015],
  'ouaga 2000': [-0.063, 0.015],
  'bonheur ville': [-0.045, -0.035],
  'bonheur-ville': [-0.045, -0.035],
  'dassasgho': [0.009, 0.035],
  'koulouba': [-0.003, -0.002],
  'patte-doie': [-0.036, -0.010],
  'patte d\'oie': [-0.036, -0.010],
  'gounghin': [-0.016, -0.035],
  'somgande': [0.038, 0.029],
  'tampouy': [0.045, -0.040],
  'zogona': [0.002, 0.020],
  'saaba': [-0.010, 0.070],
  'karpala': [-0.048, 0.042],
  'pissy': [-0.025, -0.055],
};

// Simple string hash to deterministic pseudo-coords if missing
function getDeterministicCoords(id: string, cityStr: string = '', neighborhoodStr: string = ''): [number, number] {
  const cityLower = (cityStr || '').toLowerCase();
  const neighLower = (neighborhoodStr || '').toLowerCase();

  let base: [number, number] = [12.3714, -1.5197]; // Ouaga default
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (cityLower.includes(key)) {
      base = coords;
      break;
    }
  }

  // Check neighborhood offset
  for (const [key, offset] of Object.entries(NEIGHBORHOOD_OFFSETS)) {
    if (neighLower.includes(key)) {
      return [base[0] + offset[0], base[1] + offset[1]];
    }
  }

  // Hash ID to scatter evenly around city base
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 100) - 50) / 1200; // ~ +-0.04 deg
  const lngOffset = ((Math.abs(hash >> 3) % 100) - 50) / 1200;

  return [base[0] + latOffset, base[1] + lngOffset];
}

// Custom HTML Price Tag Icon for Leaflet
function createPriceIcon(price: number, isPromoted?: boolean) {
  const formatted = price > 0 ? `${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k F` : 'Promo';
  const html = `
    <div style="
      background-color: ${isPromoted ? '#dc2626' : '#0f172a'};
      color: #ffffff;
      padding: 4px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border: 2px solid #ffffff;
      display: flex;
      align-items: center;
      gap: 4px;
      transform: translate(-50%, -100%);
      cursor: pointer;
    ">
      <span style="background-color: #ef4444; width: 6px; height: 6px; border-radius: 50%; display: inline-block;"></span>
      <span>${formatted}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-map-price-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

export const MapView: React.FC<Props> = ({ residences, onResidenceClick }) => {
  const center: [number, number] = [12.3714, -1.5197]; // Center of Ouagadougou

  const validResidencesWithCoords = useMemo(() => {
    return residences.map(res => {
      let lat = res.address?.coordinates?.lat || res.lat;
      let lng = res.address?.coordinates?.lng || res.lng;

      if (typeof lat === 'string') lat = parseFloat(lat);
      if (typeof lng === 'string') lng = parseFloat(lng);

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        const [fallbackLat, fallbackLng] = getDeterministicCoords(
          res.id,
          res.address?.city || res.city,
          res.address?.neighborhood || res.neighborhood
        );
        lat = fallbackLat;
        lng = fallbackLng;
      }

      return {
        ...res,
        resolvedLat: lat,
        resolvedLng: lng
      };
    });
  }, [residences]);

  return (
    <div className="h-[600px] sm:h-[680px] rounded-3xl overflow-hidden border border-slate-200 shadow-md relative z-0">
      <MapContainerAny 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayerAny
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {validResidencesWithCoords.map((res) => {
          const price = res.promoPrice || res.promo_price || res.pricePerNight || res.price_per_night || 0;
          const customIcon = createPriceIcon(price, res.promoted || res.recommended);

          return (
            <Marker 
              key={res.id} 
              position={[res.resolvedLat, res.resolvedLng]}
              icon={customIcon}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-1 min-w-[220px] max-w-[260px]">
                  <div className="relative rounded-xl overflow-hidden mb-2 bg-slate-100 aspect-video">
                    <img 
                      src={res.images?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=400"} 
                      alt={res.title} 
                      className="w-full h-full object-cover" 
                    />
                    <span className="absolute bottom-1.5 left-1.5 bg-slate-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
                      {res.type || 'Résidence'}
                    </span>
                  </div>

                  <h4 className="font-black text-slate-900 text-xs line-clamp-1 mb-1">{res.title}</h4>
                  
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mb-2">
                    <MapPin size={11} className="text-red-500 shrink-0" />
                    <span className="truncate">{res.address?.neighborhood || res.neighborhood || 'Ouagadougou'}</span>
                  </div>

                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-sm font-black text-red-600">{formatFCFA(price)}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">/ nuit</span>
                  </div>

                  <button 
                    type="button"
                    onClick={() => onResidenceClick(res)}
                    className="w-full bg-slate-900 hover:bg-red-600 text-white py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                  >
                    Réserver maintenant
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
