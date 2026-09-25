import { Residence } from '../types';

export const BURKINA_CITY_COORDS: Record<string, [number, number]> = {
  'ouagadougou': [12.3714, -1.5197],
  'ouaga': [12.3714, -1.5197],
  'bobo-dioulasso': [11.1772, -4.2979],
  'bobo': [11.1772, -4.2979],
  'koudougou': [12.2500, -2.3667],
  'banfora': [10.6333, -4.7500],
  'ouahigouya': [13.5833, -2.4167],
  'kaya': [13.0917, -1.0847],
  'fada': [12.0617, 0.3583],
  'fada n\'gourma': [12.0617, 0.3583],
  'tenkodogo': [11.7800, -0.3697],
  'dedougou': [12.4633, -3.4600],
  'dédougou': [12.4633, -3.4600],
  'pouytenga': [12.2500, -0.4333],
  'ziniare': [12.5819, -1.2964],
  'ziniaré': [12.5819, -1.2964],
  'manga': [11.6639, -1.0731],
  'po': [11.1697, -1.1450],
  'pô': [11.1697, -1.1450],
  'hounde': [11.5000, -3.5167],
  'houndé': [11.5000, -3.5167],
  'boromo': [11.7458, -2.9300],
  'gaoua': [10.3300, -3.1800],
  'diebougou': [10.9667, -3.2500],
  'diébougou': [10.9667, -3.2500],
  'leo': [11.1000, -2.1000],
  'léo': [11.1000, -2.1000],
  'koupela': [12.1800, -0.3500],
  'koupéla': [12.1800, -0.3500],
  'dori': [14.0300, -0.0300],
};

export const BURKINA_NEIGHBORHOOD_COORDS: Record<string, [number, number]> = {
  // Ouagadougou
  'bonheur ville': [12.3264, -1.5547],
  'bonheur-ville': [12.3264, -1.5547],
  'bonheurville': [12.3264, -1.5547],
  'ouaga 2000': [12.3084, -1.5047],
  'ouaga-2000': [12.3084, -1.5047],
  'ouaga2000': [12.3084, -1.5047],
  'patte d\'oie': [12.3354, -1.5297],
  'patte-doie': [12.3354, -1.5297],
  'patte doie': [12.3354, -1.5297],
  'gounghin': [12.3554, -1.5547],
  'pissy': [12.3464, -1.5747],
  'dassasgho': [12.3804, -1.4847],
  'koulouba': [12.3684, -1.5217],
  'paspanga': [12.3794, -1.5187],
  'somgande': [12.4094, -1.4907],
  'somgandé': [12.4094, -1.4907],
  'tampouy': [12.4164, -1.5597],
  'zogona': [12.3734, -1.4997],
  'karpala': [12.3234, -1.4777],
  'saaba': [12.3614, -1.4497],
  'nagrin': [12.3114, -1.5397],
  'tanghin': [12.3980, -1.5180],
  'larle': [12.3820, -1.5380],
  'larlé': [12.3820, -1.5380],
  'wemtenga': [12.3650, -1.4980],
  'kalgondin': [12.3480, -1.5080],
  'cissin': [12.3350, -1.5450],
  'kamboinsin': [12.4550, -1.5550],
  'kamboinse': [12.4550, -1.5550],
  'kamboinsé': [12.4550, -1.5550],
  'paglayiri': [12.3380, -1.5320],
  'pag-la-yiri': [12.3380, -1.5320],
  'balkuy': [12.3050, -1.4750],
  'zone 1': [12.3680, -1.4820],
  'zone 1 zad': [12.3680, -1.4820],
  'wayalghin': [12.3850, -1.4680],
  'bendogo': [12.3920, -1.4550],
  'yamtenga': [12.3180, -1.4520],
  'tingandogo': [12.2850, -1.5220],
  'kossodo': [12.4250, -1.4550],
  'sanyiri': [12.3400, -1.4900],
  'nioko': [12.4100, -1.4400],
  '1200 logements': [12.3680, -1.4950],
  'zone du bois': [12.3780, -1.4950],
  'centre-ville': [12.3660, -1.5240],

  // Bobo-Dioulasso
  'accart-ville': [11.1700, -4.3050],
  'accart ville': [11.1700, -4.3050],
  'colma': [11.1920, -4.2850],
  'diarradougou': [11.1780, -4.2920],
  'koko': [11.1820, -4.3120],
  'lafia': [11.1650, -4.2900],
  'sarfalao': [11.1550, -4.2750],
  'bolomakote': [11.1880, -4.3020],
  'bolomakoté': [11.1880, -4.3020],
  'bindougousso': [11.1620, -4.3200],
  'farakan': [11.1720, -4.2950],

  // Koudougou
  'palogo': [12.2610, -2.3550],
  'dapoya': [12.2420, -2.3800],
  'nayalgue': [12.2580, -2.3750],
  'nayalgué': [12.2580, -2.3750],

  // Banfora
  'tengrela': [10.6500, -4.8300],
  'cascades': [10.6400, -4.8000],
};

function normalizeString(str: string = ''): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Returns deterministic coordinates based on residence info if exact GPS not explicitly saved
 */
export function getCoordinatesForLocation(cityStr: string = '', neighborhoodStr: string = '', residenceId: string = ''): { lat: number; lng: number } {
  const normCity = normalizeString(cityStr);
  const normNeigh = normalizeString(neighborhoodStr);

  // 1. Check direct neighborhood match
  for (const [key, coords] of Object.entries(BURKINA_NEIGHBORHOOD_COORDS)) {
    const normKey = normalizeString(key);
    if (normNeigh.includes(normKey) || normKey.includes(normNeigh)) {
      if (normNeigh.length >= 3 || normKey === normNeigh) {
        // Apply slight unique micro-offset per residence so markers don't overlap 100%
        let hashOffsetLat = 0;
        let hashOffsetLng = 0;
        if (residenceId) {
          let hash = 0;
          for (let i = 0; i < residenceId.length; i++) {
            hash = (hash << 5) - hash + residenceId.charCodeAt(i);
            hash |= 0;
          }
          hashOffsetLat = ((Math.abs(hash) % 40) - 20) / 10000; // +- 0.002 deg (~200m)
          hashOffsetLng = ((Math.abs(hash >> 2) % 40) - 20) / 10000;
        }
        return { lat: coords[0] + hashOffsetLat, lng: coords[1] + hashOffsetLng };
      }
    }
  }

  // 2. Check city match
  let baseCoords: [number, number] = [12.3714, -1.5197]; // Ouaga default
  for (const [key, coords] of Object.entries(BURKINA_CITY_COORDS)) {
    const normKey = normalizeString(key);
    if (normCity.includes(normKey) || normKey.includes(normCity)) {
      baseCoords = coords;
      break;
    }
  }

  // If residence ID is present, scatter realistically around city center
  if (residenceId) {
    let hash = 0;
    for (let i = 0; i < residenceId.length; i++) {
      hash = (hash << 5) - hash + residenceId.charCodeAt(i);
      hash |= 0;
    }
    const latOffset = ((Math.abs(hash) % 60) - 30) / 2000;
    const lngOffset = ((Math.abs(hash >> 3) % 60) - 30) / 2000;
    return { lat: baseCoords[0] + latOffset, lng: baseCoords[1] + lngOffset };
  }

  return { lat: baseCoords[0], lng: baseCoords[1] };
}

/**
 * Resolves exact coordinates for a residence object with multiple fallback heuristics
 */
export function resolveResidenceCoordinates(residence: Residence | any): { lat: number; lng: number } {
  if (!residence) return { lat: 12.3714, lng: -1.5197 };

  let rawLat = residence.address?.coordinates?.lat ?? residence.lat ?? residence.latitude;
  let rawLng = residence.address?.coordinates?.lng ?? residence.lng ?? residence.longitude;

  if (typeof rawLat === 'string') rawLat = parseFloat(rawLat);
  if (typeof rawLng === 'string') rawLng = parseFloat(rawLng);

  const city = residence.address?.city || residence.city || '';
  const neighborhood = residence.address?.neighborhood || residence.neighborhood || '';

  // Check if raw coords are valid numbers and not generic origin [0, 0]
  const isValidNumber = typeof rawLat === 'number' && !isNaN(rawLat) && typeof rawLng === 'number' && !isNaN(rawLng) && rawLat !== 0 && rawLng !== 0;

  // If coordinates are exactly the generic Ouagadougou placeholder [12.3714, -1.5197] but the residence is in a specific neighborhood or other city, calculate accurate coords
  const isGenericCenter = Math.abs(rawLat - 12.3714) < 0.0001 && Math.abs(rawLng - -1.5197) < 0.0001;
  const hasSpecificLocation = (neighborhood && normalizeString(neighborhood) !== 'ouagadougou') || (city && !normalizeString(city).includes('ouaga'));

  if (isValidNumber && (!isGenericCenter || !hasSpecificLocation)) {
    return { lat: rawLat, lng: rawLng };
  }

  return getCoordinatesForLocation(city, neighborhood, residence.id || residence._id || '');
}

/**
 * Builds Google Maps navigation directions link
 */
export function getGoogleMapsNavigationUrl(residence: Residence | any): string {
  const { lat, lng } = resolveResidenceCoordinates(residence);
  const city = residence.address?.city || residence.city || 'Burkina Faso';
  const neighborhood = residence.address?.neighborhood || residence.neighborhood || '';
  const title = residence.title || 'Résidence ResiFaso';

  const label = encodeURIComponent(`${title}, ${neighborhood}, ${city}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}&destination_place_id=&travelmode=driving`;
}

/**
 * Builds Waze navigation link
 */
export function getWazeNavigationUrl(residence: Residence | any): string {
  const { lat, lng } = resolveResidenceCoordinates(residence);
  return `https://waze.com/ul?ll=${lat.toFixed(6)},${lng.toFixed(6)}&navigate=yes`;
}
