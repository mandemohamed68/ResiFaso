import React, { useState } from 'react';
import { Search, MapPin, Building2, Users, Wifi, Wind, Car, HelpCircle, Check, MapPinIcon, ShieldCheck, Utensils, Trees, Zap, Droplet, Filter, X, ChevronDown } from 'lucide-react';
import { useLocations } from '../../hooks/useLocations';
import { useGlobalSettings } from '../../hooks/useQueries';
import { cn } from '../../lib/utils';
import { CustomSelect } from '../common/CustomSelect';
import { motion, AnimatePresence } from 'motion/react';

interface SearchFormProps {
  onSearch: (filters: {
    cityId: string;
    neighborhoodId: string;
    type: string;
    capacity: number;
    amenities: string[];
    autonomousOnly?: boolean;
  }) => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const { allLocations } = useLocations();
  const { data: gsData } = useGlobalSettings();
  const autonomyFilterEnabled = gsData?.autonomyFilterEnabled !== false;

  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState('');
  const [housingType, setHousingType] = useState('Tout type');
  const [capacity, setCapacity] = useState(1);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [autonomousOnly, setAutonomousOnly] = useState(false);
  const [isAmenityDropdownOpen, setIsAmenityDropdownOpen] = useState(false);

  const currentCity = allLocations.find(c => c.id === selectedCityId);

  const amenitiesList = [
    { label: 'Wi-Fi', icon: Wifi },
    { label: 'Climatisation', icon: Wind },
    { label: 'Piscine', icon: Building2 },
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
      amenities: selectedAmenities,
      autonomousOnly
    });
  };

  return (
    <form onSubmit={handleSearchSubmit} className="w-full max-w-6xl mx-auto px-4 mt-[-40px] md:mt-[-50px] relative z-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="bg-white rounded-xl shadow-lg p-5 md:p-6 border border-slate-200/80 flex flex-col gap-5 md:gap-6">
        
        {/* Main Search Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-end gap-4">
          
          <div className="lg:flex-1">
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
          </div>

          <div className="lg:flex-1">
            <CustomSelect
              label="Quartier"
              icon={MapPinIcon}
              value={selectedNeighborhoodId}
              onChange={setSelectedNeighborhoodId}
              options={currentCity?.neighborhoods.map(n => ({ id: n.id, name: n.name })) || []}
              placeholder={selectedCityId ? "Tous les quartiers" : "Ville d'abord"}
            />
          </div>

          <div className="lg:w-48">
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
          </div>

          <div className="lg:w-48">
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
          </div>

          {/* SEARCH BUTTON */}
          <div className="sm:col-span-2 lg:col-span-1 lg:w-auto mt-2 lg:mt-0">
            <button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 md:py-3.5 rounded-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-md shadow-red-600/20 active:scale-98 group shrink-0 cursor-pointer"
            >
              <Search size={18} className="text-yellow-400 group-hover:scale-110 transition-transform" />
              <span className="tracking-wider">RECHERCHER</span>
            </button>
          </div>
        </div>

        {/* Amenities & Autonomy Row */}
        <div className="border-t border-slate-100 pt-3 flex flex-col md:flex-row md:items-center gap-2.5 md:gap-3 px-1 md:px-3">
          {autonomyFilterEnabled && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* 100% Autonome Toggle Pill */}
              <button
                type="button"
                onClick={() => setAutonomousOnly(prev => !prev)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border select-none",
                  autonomousOnly
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/80"
                )}
                title="Filtrer uniquement les logements avec Forage d'eau garanti ET Groupe électrogène ou Solaire"
              >
                <Zap size={13} className={autonomousOnly ? "text-amber-400 fill-amber-400" : "text-slate-600"} />
                <span>100% Autonome (Eau & Élec)</span>
                {autonomousOnly && <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded">✓</span>}
              </button>
            </div>
          )}
          
          <div className="flex-1 relative group">
            <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 flex flex-wrap gap-2 min-h-[48px] items-center">
              {selectedAmenities.length === 0 ? (
                <span className="text-slate-400 text-xs font-bold px-2 italic">Aucun équipement sélectionné (Tous affichés)</span>
              ) : (
                selectedAmenities.map(amenityLabel => {
                  const amenity = amenitiesList.find(a => a.label === amenityLabel);
                  return (
                    <span 
                      key={amenityLabel}
                      className="bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-tight px-2.5 py-1 rounded-md border border-red-100 flex items-center gap-1.5 animate-in zoom-in-95 duration-200"
                    >
                      {amenity?.icon && <amenity.icon size={12} />}
                      {amenityLabel}
                      <button 
                        type="button"
                        onClick={() => handleAmenityToggle(amenityLabel)}
                        className="hover:text-red-900 ml-0.5"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })
              )}
              
              <div className="ml-auto">
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => setIsAmenityDropdownOpen(!isAmenityDropdownOpen)}
                    className={cn(
                      "bg-white border text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2",
                      isAmenityDropdownOpen ? "border-red-500 text-red-600 shadow-xs" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Filter size={12} />
                    Ajouter
                    <ChevronDown size={12} className={cn("transition-transform duration-200", isAmenityDropdownOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {isAmenityDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-30" 
                          onClick={() => setIsAmenityDropdownOpen(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 bottom-full mb-3 w-64 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 z-40 overflow-hidden"
                        >
                          <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sélectionner</span>
                          </div>
                          <div className="max-h-60 overflow-y-auto p-2">
                            {amenitiesList.map(a => {
                              const isSelected = selectedAmenities.includes(a.label);
                              return (
                                <button
                                  key={a.label}
                                  type="button"
                                  onClick={() => {
                                    handleAmenityToggle(a.label);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all",
                                    isSelected 
                                      ? "bg-red-50 text-red-700" 
                                      : "text-slate-600 hover:bg-slate-50"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <a.icon size={14} />
                                    <span>{a.label}</span>
                                  </div>
                                  {isSelected && <Check size={14} />}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </form>
  );
};
