import React, { useState } from 'react';
import { Search, MapPin, Building2, Users, Wifi, Wind, Car, HelpCircle, Check, MapPinIcon, ShieldCheck, Utensils, Trees, Zap, Droplet } from 'lucide-react';
import { BURKINA_LOCATIONS } from '../../constants/locations';
import { useLocations } from '../../hooks/useLocations';
import { cn } from '../../lib/utils';
import { CustomSelect } from '../common/CustomSelect';

interface SearchFormProps {
  onSearch: (filters: {
    cityId: string;
    neighborhoodId: string;
    type: string;
    capacity: number;
    amenities: string[];
  }) => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const { allLocations } = useLocations();
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState('');
  const [housingType, setHousingType] = useState('Tout type');
  const [capacity, setCapacity] = useState(1);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const currentCity = allLocations.find(c => c.id === selectedCityId);

  const amenitiesList = [
    { label: 'Wi-Fi', icon: Wifi },
    { label: 'Climatisation', icon: Wind },
    { label: 'Piscine', icon: HelpCircle, customIcon: '🏊‍♂️' },
    { label: 'Parking', icon: Car },
    { label: 'Sécurité 24/7', icon: ShieldCheck },
    { label: 'Cuisine équipée', icon: Utensils },
    { label: 'Jardin', icon: Trees },
    { label: 'Groupe Électrogène', icon: Zap },
    { label: 'Forage Eau', icon: Droplet }
  ];

  const handleAmenityToggle = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      cityId: selectedCityId,
      neighborhoodId: selectedNeighborhoodId,
      type: housingType,
      capacity,
      amenities: selectedAmenities
    });
  };

  return (
    <form onSubmit={handleSearchSubmit} className="w-full max-w-6xl mx-auto px-4 mt-[-60px] relative z-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="bg-white rounded-[40px] shadow-2xl p-6 border border-slate-100 flex flex-col gap-6">
        
        {/* Main Search Row */}
        <div className="flex flex-col lg:flex-row items-end gap-4 overflow-visible">
          
          <CustomSelect
            label="Destination"
            icon={MapPin}
            value={selectedCityId}
            onChange={(val) => {
              setSelectedCityId(val);
              setSelectedNeighborhoodId('');
            }}
            options={allLocations.map(c => ({ id: c.id, name: c.name }))}
            placeholder="Où allez-vous ?"
          />

          <CustomSelect
            label="Quartier"
            icon={MapPinIcon}
            value={selectedNeighborhoodId}
            onChange={setSelectedNeighborhoodId}
            options={currentCity?.neighborhoods.map(n => ({ id: n.id, name: n.name })) || []}
            placeholder={selectedCityId ? "Tous les quartiers" : "Ville d'abord"}
          />

          <CustomSelect
            label="Logement"
            icon={Building2}
            value={housingType}
            onChange={setHousingType}
            options={[
              { id: 'Tout type', name: 'Tout type' },
              { id: 'villa', name: 'Villa' },
              { id: 'appartement', name: 'Appartement' },
              { id: 'chambre', name: 'Chambre' },
              { id: 'auberge', name: 'Auberge' }
            ]}
          />

          <CustomSelect
            label="Voyageurs"
            icon={Users}
            value={capacity.toString()}
            onChange={(val) => setCapacity(Number(val))}
            options={[1, 2, 3, 4, 5, 6, 8, 10].map(n => ({ 
              id: n.toString(), 
              name: `${n} voyageur${n > 1 ? 's' : ''}` 
            }))}
          />

          {/* SEARCH BUTTON */}
          <div className="w-full lg:w-auto">
            <button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 transition-all shadow-xl shadow-red-100 active:scale-95 group shrink-0"
            >
              <Search size={16} className="text-white group-hover:scale-110 transition-transform" />
              <span className="tracking-widest uppercase italic">Rechercher</span>
            </button>
          </div>
        </div>

        {/* Amenities Amenities Row */}
        <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center gap-4 px-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Équipements populaires :</span>
          <div className="flex flex-wrap gap-2">
            {amenitiesList.map(amenity => {
              const isSelected = selectedAmenities.includes(amenity.label);
              return (
                <button
                  key={amenity.label}
                  type="button"
                  onClick={() => handleAmenityToggle(amenity.label)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer",
                    isSelected 
                      ? "bg-red-50 border-red-200 text-red-700 shadow-sm" 
                      : "bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600"
                  )}
                >
                  {amenity.customIcon ? <span className="text-xs">{amenity.customIcon}</span> : <amenity.icon size={14} />}
                  <span>{amenity.label}</span>
                  {isSelected && <Check size={12} className="text-red-700 ml-1 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </form>
  );
};
