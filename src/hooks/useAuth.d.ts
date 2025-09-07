import { User } from "@supabase/supabase-js";
export type Profile = {
    id: string;
    role: "ADMIN" | "LEADER" | null;
    full_name?: string | null;
};
type UseAuth = {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    isAdmin: boolean;
    refresh: () => Promise<void>;
};
export default function useAuth(): UseAuth;
export {};
