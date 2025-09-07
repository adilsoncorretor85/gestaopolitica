import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
export default function useAuth() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const load = useCallback(async () => {
        setLoading(true);
        if (!supabase) {
            console.error('Supabase não configurado. Verifique o .env e reinicie o Vite.');
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
        }
        // sessão atual
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUser = sessionData.session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
            // busca o próprio perfil (RLS deve permitir SELECT do próprio id)
            const { data, error } = await supabase
                .from("profiles")
                .select("id, role, full_name")
                .eq("id", currentUser.id)
                .maybeSingle();
            if (!error)
                setProfile(data ?? null);
            else
                setProfile(null);
        }
        else {
            setProfile(null);
        }
        setLoading(false);
    }, []);
    useEffect(() => {
        // carrega inicialmente
        load();
        if (!supabase)
            return;
        // reage a mudanças de auth
        const { data: sub } = supabase.auth.onAuthStateChange(() => {
            // não confie no event; sempre recarrega sessão + perfil
            load();
        });
        return () => {
            sub?.subscription?.unsubscribe?.();
        };
    }, [load]);
    const isAdmin = !!profile && profile.role === "ADMIN";
    return {
        user,
        profile,
        loading,
        isAdmin,
        refresh: load,
    };
}
