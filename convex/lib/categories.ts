/**
 * Single source of truth for categories and responsible agencies.
 * Mirrors COMPETENCIAS.md: 16 categories + "other" (no agency).
 * Any change here must be reflected in COMPETENCIAS.md and vice versa.
 */

export const AGENCY_SLUGS = [
  "servicos-publicos",
  "idepplan",
  "segtran",
  "meio-ambiente",
  "obras",
  "aserfa",
  "agricultura",
] as const;

export type AgencySlug = (typeof AGENCY_SLUGS)[number];

export type AgencyInfo = {
  slug: AgencySlug;
  name: string;
  /** Institutional contact only. Never a person's name. */
  phone: string;
  email: string;
  url: string;
};

// The city website only publishes the general city hall contact; agency-specific
// channels are a follow-up. All values are public institutional data.
const CITY_HALL_PHONE = "(43) 3422-4000";
const CITY_HALL_EMAIL = "prefeitura@apucarana.pr.gov.br";
const AGENCIES_URL =
  "https://www.apucarana.pr.gov.br/site/orgaos-da-administracao/";

export const AGENCIES: Record<AgencySlug, AgencyInfo> = {
  "servicos-publicos": {
    slug: "servicos-publicos",
    name: "Secretaria de Serviços Públicos",
    phone: CITY_HALL_PHONE,
    email: CITY_HALL_EMAIL,
    url: AGENCIES_URL,
  },
  idepplan: {
    slug: "idepplan",
    name: "Idepplan",
    phone: CITY_HALL_PHONE,
    email: CITY_HALL_EMAIL,
    url: AGENCIES_URL,
  },
  segtran: {
    slug: "segtran",
    name: "Segtran",
    phone: CITY_HALL_PHONE,
    email: CITY_HALL_EMAIL,
    url: AGENCIES_URL,
  },
  "meio-ambiente": {
    slug: "meio-ambiente",
    name: "Secretaria de Meio Ambiente",
    phone: CITY_HALL_PHONE,
    email: CITY_HALL_EMAIL,
    url: AGENCIES_URL,
  },
  obras: {
    slug: "obras",
    name: "Secretaria de Obras",
    phone: CITY_HALL_PHONE,
    email: CITY_HALL_EMAIL,
    url: AGENCIES_URL,
  },
  aserfa: {
    slug: "aserfa",
    name: "Aserfa",
    phone: CITY_HALL_PHONE,
    email: CITY_HALL_EMAIL,
    url: AGENCIES_URL,
  },
  agricultura: {
    slug: "agricultura",
    name: "Secretaria de Agricultura",
    phone: CITY_HALL_PHONE,
    email: CITY_HALL_EMAIL,
    url: AGENCIES_URL,
  },
};

export const CATEGORY_KEYS = [
  "pavement",
  "rural_roads",
  "drainage",
  "urban_cleaning",
  "public_spaces",
  "street_lighting",
  "traffic_light",
  "traffic_signs",
  "public_transport",
  "risk_area",
  "tree_assessment",
  "tree_removal",
  "environmental",
  "construction",
  "cemeteries",
  "rural_area",
  "other",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export type CategoryInfo = {
  key: CategoryKey;
  /** pt-BR label shown to citizens and on the dashboard. */
  label: string;
  /** pt-BR examples, used in the AI prompt and in the UI. */
  examples: string;
  agency: AgencySlug | null;
  /** Pin color on the map. */
  color: string;
};

export const CATEGORIES: Record<CategoryKey, CategoryInfo> = {
  pavement: {
    key: "pavement",
    label: "Buracos / pavimento",
    examples: "Buraco no asfalto, pavimento afundado",
    agency: "servicos-publicos",
    color: "#b45309",
  },
  rural_roads: {
    key: "rural_roads",
    label: "Estradas rurais",
    examples: "Estrada de terra danificada, ponte rural",
    agency: "servicos-publicos",
    color: "#92400e",
  },
  drainage: {
    key: "drainage",
    label: "Drenagem",
    examples: "Boca de lobo entupida, bueiro",
    agency: "servicos-publicos",
    color: "#0369a1",
  },
  urban_cleaning: {
    key: "urban_cleaning",
    label: "Limpeza urbana",
    examples: "Capina, terreno baldio com mato, entulho na via",
    agency: "servicos-publicos",
    color: "#4d7c0f",
  },
  public_spaces: {
    key: "public_spaces",
    label: "Praças, parques e calçadas públicas",
    examples: "Banco quebrado, calçada pública danificada",
    agency: "servicos-publicos",
    color: "#15803d",
  },
  street_lighting: {
    key: "street_lighting",
    label: "Iluminação pública",
    examples: "Lâmpada queimada, poste apagado, luminária quebrada",
    agency: "idepplan",
    color: "#ca8a04",
  },
  traffic_light: {
    key: "traffic_light",
    label: "Semáforo",
    examples: "Semáforo apagado ou com defeito",
    agency: "segtran",
    color: "#dc2626",
  },
  traffic_signs: {
    key: "traffic_signs",
    label: "Sinalização de trânsito",
    examples: "Placa caída, faixa apagada, lombada irregular",
    agency: "segtran",
    color: "#ea580c",
  },
  public_transport: {
    key: "public_transport",
    label: "Transporte urbano",
    examples: "Problema em ponto ou terminal de ônibus",
    agency: "segtran",
    color: "#7c3aed",
  },
  risk_area: {
    key: "risk_area",
    label: "Área de risco",
    examples: "Encosta, erosão, alagamento recorrente",
    agency: "segtran",
    color: "#be123c",
  },
  tree_assessment: {
    key: "tree_assessment",
    label: "Árvores (avaliação)",
    examples: "Árvore condenada, pedido de corte ou poda",
    agency: "meio-ambiente",
    color: "#166534",
  },
  tree_removal: {
    key: "tree_removal",
    label: "Árvores (execução)",
    examples: "Galhos caídos, recolhimento de poda",
    agency: "servicos-publicos",
    color: "#65a30d",
  },
  environmental: {
    key: "environmental",
    label: "Ambiental",
    examples: "Poluição, queimada, descarte irregular, barulho",
    agency: "meio-ambiente",
    color: "#0f766e",
  },
  construction: {
    key: "construction",
    label: "Obras e construções",
    examples: "Obra pública parada, obra particular irregular, uso do solo",
    agency: "obras",
    color: "#57534e",
  },
  cemeteries: {
    key: "cemeteries",
    label: "Cemitérios",
    examples: "Manutenção de cemitério ou capela mortuária",
    agency: "aserfa",
    color: "#475569",
  },
  rural_area: {
    key: "rural_area",
    label: "Área rural",
    examples: "Questões agropecuárias",
    agency: "agricultura",
    color: "#a16207",
  },
  other: {
    key: "other",
    label: "Outros",
    examples: "Problema urbano que não se encaixa nas demais categorias",
    agency: null,
    color: "#6b7280",
  },
};

export function agencyForCategory(category: CategoryKey): AgencyInfo | null {
  const slug = CATEGORIES[category].agency;
  return slug ? AGENCIES[slug] : null;
}

export function isCategoryKey(value: string): value is CategoryKey {
  return (CATEGORY_KEYS as readonly string[]).includes(value);
}

export function isAgencySlug(value: string): value is AgencySlug {
  return (AGENCY_SLUGS as readonly string[]).includes(value);
}
