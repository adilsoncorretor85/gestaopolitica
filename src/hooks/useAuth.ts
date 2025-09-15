import { useCallback, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient, handleSupabaseError } from "@/lib/supabaseClient";
import { ensureLeaderActivated } from "@/services/leadership";

export type Profile = {
  id: string;
  role: "ADMIN" | "LEADER" | null;
  full_name?: string | null;
};

type UseAuth = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
};

export default function useAuth(): UseAuth {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Debug: verificar se o hook está sendo chamado
  console.log('🔍 [useAuth] Hook sendo executado');
  console.log('🔍 [useAuth] Estado inicial:', { user, session, profile, loading });

  const load = useCallback(async () => {
    console.log('🔍 [useAuth] Função load sendo executada');
    setLoading(true);

    try {
      const supabase = getSupabaseClient();

      // sessão atual
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Erro ao obter sessão:', handleSupabaseError(sessionError, 'obter sessão'));
        setUser(null);
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const currentSession = sessionData.session;
      const currentUser = currentSession?.user ?? null;
      
      setUser(currentUser);
      setSession(currentSession);

      if (currentUser) {
        // busca o próprio perfil (RLS deve permitir SELECT do próprio id)
        const { data, error } = await supabase
          .from("profiles")
          .select("id, role, full_name")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (!error) {
          setProfile((data as Profile) ?? null);
          
          // ✅ ativa líder quando já logado (hard refresh, deep link, etc.)
          ensureLeaderActivated();
        } else {
          console.error('Erro ao carregar perfil:', handleSupabaseError(error, 'carregar perfil'));
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Erro no useAuth:', error);
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // carrega inicialmente
    load();

    try {
      const supabase = getSupabaseClient();

      // reage a mudanças de auth
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        // Atualiza sessão e usuário diretamente
        setSession(session);
        setUser(session?.user ?? null);
        
        // ✅ ativa líder quando o usuário acabou de criar senha/logar
        // eventos típicos: SIGNED_IN, USER_UPDATED
        if (session?.user?.id && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED')) {
          ensureLeaderActivated();
        }
        
        // Recarrega perfil se necessário
        if (session?.user) {
          load();
        } else {
          setProfile(null);
          setLoading(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Erro ao configurar listener de auth:', error);
    }
  }, [load]);

  // TEMPORÁRIO: Simplificar verificação de admin para debug
  const isAdmin = !!profile && profile.role === "ADMIN";
  
  // Debug: verificar o cálculo do isAdmin
  console.log('🔍 [useAuth] Cálculo do isAdmin:', {
    hasProfile: !!profile,
    profileRole: profile?.role,
    finalIsAdmin: isAdmin
  });

  return {
    user,
    session,
    profile,
    loading,
    isAdmin,
    refresh: load,
  };
}