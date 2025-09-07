export type ElectionSettings = {
    id?: string;
    election_name: string;
    election_date: string;
    timezone: string;
};
export declare function getElectionSettings(): Promise<ElectionSettings | null>;
export declare function upsertElectionSettings(payload: ElectionSettings): Promise<ElectionSettings>;
/** Helper: diferença de dias entre hoje e a data da eleição (>=0) */
export declare function daysUntil(dateISO: string): number;
/** Helper: formata contagem regressiva em anos, meses e dias */
export declare function formatCountdown(dateISO: string): {
    text: string;
    days: number;
};
