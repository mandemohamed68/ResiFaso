import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BURKINA_LOCATIONS, City } from '../constants/locations';

export function useLocations() {
  const [platformLocations, setPlatformLocations] = useState<City[]>([]);
  const [allLocations, setAllLocations] = useState<City[]>([...BURKINA_LOCATIONS]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'locations'), (snap) => {
      const dynLocs: City[] = [];
      snap.forEach(docSnap => {
        dynLocs.push({ id: docSnap.id, ...docSnap.data() } as City);
      });
      setPlatformLocations(dynLocs);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const merged = [...BURKINA_LOCATIONS];
    platformLocations.forEach(pLoc => {
      const existingIdx = merged.findIndex(l => l.id === pLoc.id || l.name.toLowerCase() === pLoc.name.toLowerCase());
      if (existingIdx > -1) {
        // Merge neighborhoods
        const existing = { ...merged[existingIdx] };
        const existingNeighborhoods = [...existing.neighborhoods];
        
        pLoc.neighborhoods?.forEach((pn) => {
          if (!existingNeighborhoods.find(en => en.id === pn.id || en.name.toLowerCase() === pn.name.toLowerCase())) {
            existingNeighborhoods.push(pn);
          }
        });
        
        merged[existingIdx] = { ...existing, neighborhoods: existingNeighborhoods };
      } else {
        merged.push(pLoc);
      }
    });
    setAllLocations(merged);
  }, [platformLocations]);

  return { allLocations, platformLocations };
}
