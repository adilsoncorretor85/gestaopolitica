import type { CityVotesRow, NeighborhoodVotesRow, CityGoal, NeighborhoodGoal, CityProjection, NeighborhoodProjection } from "@/types/projecoes";
/** Lê votos agregados por cidade a partir da view — mapeia nomes reais */
export declare function listVotesByCity(): Promise<CityVotesRow[]>;
/** Lê votos por bairro */
export declare function listVotesByNeighborhood(): Promise<NeighborhoodVotesRow[]>;
/** Lê metas de cidade e normaliza goal_total -> goal */
export declare function listCityGoals(): Promise<CityGoal[]>;
/** Lê metas de bairro e normaliza goal_total -> goal */
export declare function listNeighborhoodGoals(): Promise<NeighborhoodGoal[]>;
/** Projeção por cidade: junta view + metas de cidade */
export declare function listCityProjection(): Promise<CityProjection[]>;
/** Projeção por bairro: junta view + metas de bairro */
export declare function listNeighborhoodProjection(city: string, state: string): Promise<NeighborhoodProjection[]>;
/** UPSERT: cidade (city,state) → goal_total */
export declare function upsertCityGoalWithUpsert(payload: {
    city: string;
    state: string;
    goal: number;
    deadline?: string | null;
}): Promise<{
    id: any;
}>;
export declare function saveNeighborhoodGoal(params: {
    id?: string;
    city: string;
    state: string;
    neighborhood: string;
    goal: number;
    city_goal_id?: string | null;
}): Promise<{
    mode: string;
    id: string;
}>;
export declare function listCitiesForFilter(): Promise<{
    city: string;
    state: string;
}[]>;
