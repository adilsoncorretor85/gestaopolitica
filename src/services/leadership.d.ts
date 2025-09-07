import type { ProfileLeadership, LeadershipFormValues } from '@/types/leadership';
export declare function getProfileLeadershipByLeader(profileId: string): Promise<ProfileLeadership | null>;
export declare function upsertProfileLeadership(profileId: string, payload: LeadershipFormValues): Promise<ProfileLeadership>;
export declare function upsertProfileLeadershipLegacy(payload: {
    profile_id: string;
    role_code: string;
    organization?: string;
    title?: string;
    level?: number;
    reach_scope?: 'FAMILIA' | 'BAIRRO' | 'CIDADE' | 'REGIAO' | 'ONLINE';
    reach_size?: number;
    extra?: Record<string, any>;
}): Promise<ProfileLeadership>;
export declare function deleteProfileLeadership(profileLeadershipId: string): Promise<void>;
export declare function getLeadershipCatalog(): {
    code: import("@/types/leadership").RoleCode;
    label: string;
    group: "Institucional" | "Social" | "Pol\u00EDtica" | "Midi\u00E1tica" | "Informal";
}[];
