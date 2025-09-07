export type LeaderRow = {
    id: string;
    email: string;
    full_name: string | null;
    status: "PENDING" | "ACTIVE" | "INACTIVE";
    invited_at: string | null;
};
type ToggleBanInput = {
    user_id: string;
    ban: boolean;
    until?: number | string;
    reason?: string;
    mirrorLeaderStatus?: "ACTIVE" | "INACTIVE" | null;
};
export declare function toggleUserBan(input: ToggleBanInput): Promise<{
    ok: true;
    user_id: string;
    banned_until: string | null;
}>;
export declare function fetchLeaders(status?: "PENDING" | "ACTIVE" | "INACTIVE"): Promise<LeaderRow[]>;
export declare function countPendingLeaders(): Promise<any>;
export declare function countActiveLeaders(): Promise<number>;
export declare function listLeaders(includePending?: boolean): Promise<any[]>;
export declare function reinviteLeader(payload: {
    full_name: string;
    email: string;
    phone?: string;
}): Promise<any>;
export declare function countLeaders(_profile?: any): Promise<any>;
export declare function countPeople(profile?: any): Promise<any>;
export declare function countVotes(kind: "CONFIRMADO" | "PROVAVEL", profile?: any): Promise<any>;
export declare function getDefaultGoal(): Promise<any>;
export declare function listLeaderStats(): Promise<any>;
export declare function setRole(userId: string, role: "ADMIN" | "LEADER"): Promise<any>;
export declare function upsertLeaderGoal(leaderId: string, goal: number): Promise<any>;
export {};
