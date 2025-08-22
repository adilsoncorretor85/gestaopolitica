import { useCallback, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

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

export default function useAuth(): UseAuth {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    setLoading(true);

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

      if (!error) setProfile((data as Profile) ?? null);
      else setProfile(null);
    } else {
      setProfile(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // carrega inicialmente
    load();

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