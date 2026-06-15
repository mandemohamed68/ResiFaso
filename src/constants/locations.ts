export interface Neighborhood {
  id: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
  neighborhoods: Neighborhood[];
}

export const BURKINA_LOCATIONS: City[] = [
  {
    id: 'ouaga',
    name: 'Ouagadougou',
    neighborhoods: [
      { id: 'ouaga-2000', name: 'Ouaga 2000' },
      { id: 'koulouba', name: 'Koulouba' },
      { id: 'paspanga', name: 'Paspanga' },
      { id: 'dassasgho', name: 'Dassasgho' },
      { id: 'patte-doie', name: 'Patte d\'Oie' },
      { id: 'somgande', name: 'Somgandé' },
      { id: 'gounghin', name: 'Gounghin' },
      { id: 'zogona', name: 'Zogona' },
      { id: 'tampouy', name: 'Tampouy' },
    ]
  },
  {
    id: 'bobo',
    name: 'Bobo-Dioulasso',
    neighborhoods: [
      { id: 'accart-ville', name: 'Accart-ville' },
      { id: 'colma', name: 'Colma' },
      { id: 'diarradougou', name: 'Diarradougou' },
      { id: 'koko', name: 'Koko' },
      { id: 'lafia', name: 'Lafia' },
      { id: 'sarfalao', name: 'Sarfalao' },
    ]
  },
  {
    id: 'koudougou',
    name: 'Koudougou',
    neighborhoods: [
      { id: 'secteur-1', name: 'Secteur 1' },
      { id: 'secteur-2', name: 'Secteur 2' },
      { id: 'palogo', name: 'Palogo' },
    ]
  },
  {
    id: 'banfora',
    name: 'Banfora',
    neighborhoods: [
      { id: 'secteur-1', name: 'Secteur 1' },
      { id: 'secteur-2', name: 'Secteur 2' },
    ]
  }
];
