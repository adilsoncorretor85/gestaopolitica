export type CityVotesRow = {
    city: string;
    state: string;
    confirmed: number;
    probable: number;
    undefined: number;
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
    goal: number;
    deadline: string | null;
};
export type NeighborhoodGoal = {
    id: string;
    city: string;
    state: string;
    neighborhood: string;
    goal: number;
    city_goal_id: string | null;
    deadline: string | null;
    created_at?: string;
    updated_at?: string;
};
export type CityProjection = {
    city: string;
    state: string;
    meta: number;
    confirmados: number;
    provaveis: number;
    indefinidos: number;
    total: number;
    realizado: number;
    cobertura_pct: number;
    gap: number;
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
