export type CityVotesRow = {
  city: string;
  state: string;
  confirmed: number;
  probable: number;
  // usar bracket notation quando acessar "undefined" no TS
  undefined: number; // mapearemos com cuidado ao ler do supabase
  total_people: number;
};

export type NeighborhoodVotesRow = {
  city: string;
  state: string;
  neighborhood: string;
  confirmed: number;
  probable: number;
  undefined: number;
  total_people: number;
};

export type CityGoal = {
  city: string;
  state: string;
  goal: number;           // UI (mapeia goal_total do DB)
  deadline: string | null;
};

export type NeighborhoodGoal = {
  id: string;
  city: string;
  state: string;
  neighborhood: string;
  goal: number;           // UI (mapeia goal_total do DB)
  city_goal_id: string | null;
  deadline: string | null; // sempre null para bairros
  created_at?: string;
  updated_at?: string;
};

export type CityProjection = {
  city: string;
  state: string;
  meta: number;           // city_goals.goal_total
  confirmados: number;
  provaveis: number;
  indefinidos: number;
  total: number;          // total_people
  realizado: number;      // confirmados + provaveis
  cobertura_pct: number;  // realizado / meta
  gap: number;            // meta - realizado
};

export type NeighborhoodProjection = {
  city: string;
  state: string;
  neighborhood: string;
  confirmed: number;
  probable: number;
  undefined: number;
  total_people: number;
};