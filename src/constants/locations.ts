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
      { id: 'nagrin', name: 'Nagrin' },
      { id: 'karpala', name: 'Karpala' },
      { id: 'saaba', name: 'Saaba' },
      { id: 'pissy', name: 'Pissy' },
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
      { id: 'bolomakote', name: 'Bolomakoté' },
    ]
  },
  {
    id: 'koudougou',
    name: 'Koudougou',
    neighborhoods: [
      { id: 'secteur-1', name: 'Secteur 1' },
      { id: 'secteur-2', name: 'Secteur 2' },
      { id: 'palogo', name: 'Palogo' },
      { id: 'dapoya', name: 'Dapoya' },
    ]
  },
  {
    id: 'banfora',
    name: 'Banfora',
    neighborhoods: [
      { id: 'secteur-1', name: 'Secteur 1' },
      { id: 'secteur-2', name: 'Secteur 2' },
      { id: 'tengrela', name: 'Tengrela' },
    ]
  },
  { id: 'ouahigouya', name: 'Ouahigouya', neighborhoods: [] },
  { id: 'kaya', name: 'Kaya', neighborhoods: [] },
  { id: 'fada', name: 'Fada N\'Gourma', neighborhoods: [] },
  { id: 'tenkodogo', name: 'Tenkodogo', neighborhoods: [] },
  { id: 'dedougou', name: 'Dédougou', neighborhoods: [] },
  { id: 'pouytenga', name: 'Pouytenga', neighborhoods: [] },
  { id: 'reofao', name: 'Réo', neighborhoods: [] },
  { id: 'leo', name: 'Léo', neighborhoods: [] },
  { id: 'koupela', name: 'Koupéla', neighborhoods: [] },
  { id: 'ziniare', name: 'Ziniaré', neighborhoods: [] },
  { id: 'dori', name: 'Dori', neighborhoods: [] },
  { id: 'gaoua', name: 'Gaoua', neighborhoods: [] },
  { id: 'diebougou', name: 'Diébougou', neighborhoods: [] },
  { id: 'manga', name: 'Manga', neighborhoods: [] },
  { id: 'po', name: 'Pô', neighborhoods: [] },
  { id: 'zorgo', name: 'Zorgo', neighborhoods: [] },
  { id: 'kombissiri', name: 'Kombissiri', neighborhoods: [] },
  { id: 'boromo', name: 'Boromo', neighborhoods: [] },
  { id: 'oundoue', name: 'Houndé', neighborhoods: [] },
  { id: 'nouna', name: 'Nouna', neighborhoods: [] },
  { id: 'tougan', name: 'Tougan', neighborhoods: [] },
  { id: 'boulsa', name: 'Boulsa', neighborhoods: [] },
  { id: 'gorom', name: 'Gorom-Gorom', neighborhoods: [] },
  { id: 'bousse', name: 'Boussé', neighborhoods: [] },
  { id: 'bogande', name: 'Bogandé', neighborhoods: [] },
  { id: 'djibo', name: 'Djibo', neighborhoods: [] }
];
