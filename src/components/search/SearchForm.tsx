import React, { useState } from 'react';
import { Search, MapPin, Building2, Users, Wifi, Wind, Car, HelpCircle, Check, MapPinIcon, ShieldCheck, Utensils, Trees, Zap, Droplet, Filter, X, ChevronDown } from 'lucide-react';
import { BURKINA_LOCATIONS } from '../../constants/locations';
import { useLocations } from '../../hooks/useLocations';
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
  }) => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const { allLocations } = useLocations();
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState('');
  const [housingType, setHousingType] = useState('Tout type');
  const [capacity, setCapacity] = useState(1);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [isAmenityDropdownOpen, setIsAmenityDropdownOpen] = useState(false);

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
    <form onSubmit={handleSearchSubmit} className="w-full max-w-6xl mx-auto px-4 mt-[-40px] md:mt-[-60px] relative z-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-2xl p-5 md:p-6 border border-slate-100 flex flex-col gap-5 md:gap-6">
        
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
              className="w-full bg-red-600 hover:bg-red-700 text-white px-10 py-4.5 md:py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 transition-all shadow-xl shadow-red-100 active:scale-95 group shrink-0"
            >
              <Search size={18} className="text-white group-hover:scale-110 transition-transform" />
              <span className="tracking-widest uppercase italic">Rechercher</span>
            </button>
          </div>
        </div>

        {/* Amenities Dropdown Row */}
        <div className="border-t border-slate-100 pt-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 px-1 md:px-4">
          <div className="flex items-center justify-between w-full md:w-auto shrink-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Équipements :</span>
          </div>
          
          <div className="flex-1 relative group">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-wrap gap-2 min-h-[50px] items-center">
              {selectedAmenities.length === 0 ? (
                <span className="text-slate-400 text-xs font-bold px-2 italic">Aucun équipement sélectionné (Tous affichés)</span>
              ) : (
                selectedAmenities.map(amenityLabel => {
                  const amenity = amenitiesList.find(a => a.label === amenityLabel);
                  return (
                    <span 
                      key={amenityLabel}
                      className="bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-tight px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-2 animate-in zoom-in-95 duration-200"
                    >
                      {amenity?.customIcon || (amenity?.icon && <amenity.icon size={12} />)}
                      {amenityLabel}
                      <button 
                        type="button"
                        onClick={() => handleAmenityToggle(amenityLabel)}
                        className="hover:text-red-900 ml-1"
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
                      "bg-white border text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-2",
                      isAmenityDropdownOpen ? "border-red-500 text-red-600 shadow-sm" : "border-slate-200 text-slate-600 hover:bg-slate-50"
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
                          className="absolute right-0 bottom-full mb-3 w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/50 z-40 overflow-hidden"
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
                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                                    isSelected 
                                      ? "bg-red-50 text-red-700" 
                                      : "text-slate-600 hover:bg-slate-50"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    {a.customIcon ? <span>{a.customIcon}</span> : <a.icon size={14} />}
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
