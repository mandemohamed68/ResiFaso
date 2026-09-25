import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Residence } from '../../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatFCFA } from '../../lib/utils';
import { useCurrency } from '../../contexts/CurrencyContext';
import { MapPin } from 'lucide-react';
import { resolveResidenceCoordinates } from '../../utils/geo';

interface Props {
  residences: Residence[];
  onResidenceClick: (res: Residence) => void;
}

const MapContainerAny = MapContainer as any;
const TileLayerAny = TileLayer as any;
const MarkerComp = Marker as any;
const PopupComp = Popup as any;

// Custom HTML Price Tag Icon for Leaflet
function createPriceIcon(priceLabel: string, isPromoted?: boolean) {
  const html = `
    <div style="
      background-color: ${isPromoted ? '#dc2626' : '#0f172a'};
      color: #ffffff;
      padding: 4px 9px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      border: 1.5px solid #ffffff;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transform: translate(-50%, -100%);
      cursor: pointer;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <span style="background-color: #ef4444; width: 6px; height: 6px; border-radius: 50%; display: inline-block;"></span>
      <span>${priceLabel}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-map-price-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

// Component to handle auto-resizing Leaflet viewport upon tab switch / animation
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timers = [
      setTimeout(() => map.invalidateSize(), 50),
      setTimeout(() => map.invalidateSize(), 200),
      setTimeout(() => map.invalidateSize(), 500),
      setTimeout(() => map.invalidateSize(), 1000)
    ];

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

// Component to adjust bounds when residences list changes
function MapBoundsUpdater({ residences }: { residences: Array<{ resolvedLat: number; resolvedLng: number }> }) {
  const map = useMap();
  useEffect(() => {
    if (residences && residences.length > 0) {
      const validPoints = residences
        .filter(r => r.resolvedLat && r.resolvedLng && !isNaN(r.resolvedLat) && !isNaN(r.resolvedLng))
        .map(r => [r.resolvedLat, r.resolvedLng] as [number, number]);

      if (validPoints.length > 1) {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else if (validPoints.length === 1) {
        map.setView(validPoints[0], 14);
      }
    }
  }, [residences, map]);
  return null;
}

export const MapView: React.FC<Props> = ({ residences, onResidenceClick }) => {
  const defaultCenter: [number, number] = [12.3714, -1.5197]; // Center of Ouagadougou
  const { currency, formatPrice } = useCurrency();

  const validResidencesWithCoords = useMemo(() => {
    return residences.map(res => {
      const coords = resolveResidenceCoordinates(res);
      return {
        ...res,
        resolvedLat: coords.lat,
        resolvedLng: coords.lng
      };
    });
  }, [residences]);

  return (
    <div className="h-[600px] sm:h-[680px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-md relative z-0">
      <MapContainerAny 
        center={defaultCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapResizer />
        <MapBoundsUpdater residences={validResidencesWithCoords} />

        <TileLayerAny
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {validResidencesWithCoords.map((res) => {
          const price = res.promoPrice || res.promo_price || res.pricePerNight || res.price_per_night || 0;
          const label = currency === 'XOF'
            ? (price > 0 ? `${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k F` : 'Promo')
            : formatPrice(price, { showEquivalent: false });

          const customIcon = createPriceIcon(label, res.promoted || res.recommended);

          return (
            <MarkerComp 
              key={res.id} 
              position={[res.resolvedLat, res.resolvedLng]}
              icon={customIcon}
            >
              <PopupComp className="custom-leaflet-popup">
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
                    <span className="text-sm font-black text-red-600">
                      {currency === 'XOF' ? formatFCFA(price) : formatPrice(price, { showEquivalent: false })}
                    </span>
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
              </PopupComp>
            </MarkerComp>
          );
        })}
      </MapContainerAny>
    </div>
  );
};
