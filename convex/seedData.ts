import type { CategoryKey } from "./lib/categories";

/**
 * Synthetic occurrences for the demo (rule 9 of the Hack Brasil rules):
 * real street names of Apucarana, made-up problems, no personal data.
 * Coordinates sit on the named street: an IBGE CNEFE address point (the same
 * data the bot geocodes with), or Google Geocoding for places that are not a
 * street (Lago Jaboti, Cemitério Cristo Rei). Districts and rural roads are
 * placed on a CNEFE road nearby, not on a verified district boundary.
 */
export type SeedOccurrence = {
  category: CategoryKey;
  address: string;
  lat: number;
  lng: number;
  summary: string;
  appeal: number;
  /** How many days ago it was opened. */
  daysAgo: number;
};

export const SEED_OCCURRENCES: SeedOccurrence[] = [
  {
    category: "pavement",
    address: "Avenida Curitiba, Centro",
    lat: -23.551429,
    lng: -51.459209,
    summary: "Buraco grande na faixa da direita, perto do cruzamento.",
    appeal: 14,
    daysAgo: 6,
  },
  {
    category: "pavement",
    address: "Rua Ponta Grossa, Centro",
    lat: -23.553564,
    lng: -51.463465,
    summary: "Asfalto afundado em frente à faixa de pedestres.",
    appeal: 7,
    daysAgo: 3,
  },
  {
    category: "street_lighting",
    address: "Avenida Minas Gerais, Centro",
    lat: -23.546792,
    lng: -51.452135,
    summary: "Três postes seguidos apagados à noite.",
    appeal: 9,
    daysAgo: 4,
  },
  {
    category: "street_lighting",
    address: "Rua Osvaldo Cruz, Centro",
    lat: -23.559263,
    lng: -51.460771,
    summary: "Luminária quebrada, pendurada no poste.",
    appeal: 3,
    daysAgo: 1,
  },
  {
    category: "traffic_light",
    address: "Avenida Central do Paraná, Jardim Diamantina",
    lat: -23.540934,
    lng: -51.456373,
    summary: "Semáforo piscando amarelo o dia todo.",
    appeal: 11,
    daysAgo: 2,
  },
  {
    category: "traffic_signs",
    address: "Rua Rio Branco, Centro",
    lat: -23.55229,
    lng: -51.460338,
    summary: "Placa de pare caída na calçada.",
    appeal: 4,
    daysAgo: 5,
  },
  {
    category: "drainage",
    address: "Avenida Santos Dumont, Vila Nova",
    lat: -23.559235,
    lng: -51.429405,
    summary: "Boca de lobo entupida; a rua alaga quando chove.",
    appeal: 12,
    daysAgo: 8,
  },
  {
    category: "drainage",
    address: "Rua Munhoz da Rocha, Centro",
    lat: -23.550252,
    lng: -51.460559,
    summary: "Bueiro sem tampa no meio da rua.",
    appeal: 6,
    daysAgo: 2,
  },
  {
    category: "urban_cleaning",
    address: "Rua Nagib Daher, Centro",
    lat: -23.554381,
    lng: -51.461868,
    summary: "Terreno baldio com mato alto e entulho.",
    appeal: 5,
    daysAgo: 10,
  },
  {
    category: "urban_cleaning",
    address: "Avenida Aviação, Jardim Trabalhista",
    lat: -23.553663,
    lng: -51.439809,
    summary: "Entulho de obra descartado na via.",
    appeal: 2,
    daysAgo: 1,
  },
  {
    category: "public_spaces",
    address: "Praça Ruy Barbosa, Centro",
    lat: -23.551928,
    lng: -51.459555,
    summary: "Bancos quebrados e calçada da praça solta.",
    appeal: 8,
    daysAgo: 12,
  },
  {
    category: "public_spaces",
    address: "Lago Jaboti, Jardim Menegazzo",
    lat: -23.567603,
    lng: -51.472206,
    summary: "Trecho da pista de caminhada com piso quebrado.",
    appeal: 10,
    daysAgo: 7,
  },
  {
    category: "tree_assessment",
    address: "Rua Clotário Portugal, Centro",
    lat: -23.54871,
    lng: -51.457567,
    summary: "Árvore com tronco oco, precisa de avaliação.",
    appeal: 3,
    daysAgo: 9,
  },
  {
    category: "tree_removal",
    address: "Rua Dom Romeu Alberti, Jardim Flamingos",
    lat: -23.55921,
    lng: -51.440745,
    summary: "Galhos de poda acumulados na calçada há uma semana.",
    appeal: 4,
    daysAgo: 6,
  },
  {
    category: "public_transport",
    address: "Terminal Urbano, Centro",
    lat: -23.554946,
    lng: -51.459719,
    summary: "Cobertura do ponto de ônibus com goteiras.",
    appeal: 6,
    daysAgo: 4,
  },
  {
    category: "risk_area",
    address: "Rua Argentina, Jardim Diamantina",
    lat: -23.536285,
    lng: -51.455609,
    summary: "Erosão avançando na margem da rua.",
    appeal: 5,
    daysAgo: 15,
  },
  {
    category: "environmental",
    address: "Avenida Minas Gerais, Vila São Miguel",
    lat: -23.564563,
    lng: -51.433671,
    summary: "Queimada recorrente em terreno no fim da avenida.",
    appeal: 3,
    daysAgo: 3,
  },
  {
    category: "construction",
    address: "Rua Ponta Grossa, Vila Agari",
    lat: -23.551655,
    lng: -51.455167,
    summary: "Obra pública parada com tapume ocupando a calçada.",
    appeal: 2,
    daysAgo: 20,
  },
  {
    category: "cemeteries",
    address: "Cemitério Cristo Rei",
    lat: -23.57113,
    lng: -51.458856,
    summary: "Muro lateral do cemitério com rachaduras.",
    appeal: 1,
    daysAgo: 11,
  },
  {
    category: "rural_roads",
    address: "Estrada do Bilote, zona rural",
    lat: -23.572063,
    lng: -51.514171,
    summary: "Estrada de terra com valetas que impedem a passagem.",
    appeal: 4,
    daysAgo: 13,
  },
  {
    category: "rural_area",
    address: "Distrito de São Pedro",
    lat: -23.505815,
    lng: -51.575335,
    summary: "Mata-burro quebrado na entrada da comunidade.",
    appeal: 2,
    daysAgo: 5,
  },
  {
    category: "other",
    address: "Rua Rio Branco, Centro",
    lat: -23.556002,
    lng: -51.459313,
    summary: "Lixeira pública arrancada.",
    appeal: 1,
    daysAgo: 2,
  },
];
