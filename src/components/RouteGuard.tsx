import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabaseClient';
import useAuth from '@/hooks/useAuth';

interface RouteGuardProps {
  children: React.ReactNode;
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    const checkUserStatus = async () => {
      if (loading) return;
      
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        const supabase = getSupabaseClient();
        
        // Verifica se o usuário está banido no auth
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user) {
          navigate('/login');
          return;
        }

        // Verifica o status no banco de dados
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erro ao verificar perfil:', error);
          navigate('/login');
          return;
        }

        // Verifica se é líder e se está ativo
        if (profile?.role === 'LEADER') {
          console.log('Verificando status do líder:', user.id);
          
          // 1. Verifica se está banido no Supabase Auth
          const { data: authUser } = await supabase.auth.getUser();
          console.log('Auth user ban status:', authUser?.user?.banned_until);
          
          if (authUser?.user?.banned_until && new Date(authUser.user.banned_until) > new Date()) {
            console.log('Usuário banido no Auth, redirecionando...');
            setIsBlocked(true);
            navigate('/conta-bloqueada');
            return;
          }

          // 2. Verifica status no leader_profiles
          const { data: leaderProfile, error: leaderError } = await supabase
            .from('leader_profiles')
            .select('status')
            .eq('id', user.id)
            .single();

          if (leaderError) {
            console.error('Erro ao verificar status do líder:', leaderError);
            navigate('/login');
            return;
          }

          console.log('Status do líder no banco:', leaderProfile?.status);

          // Se o líder está inativo, redireciona para página de bloqueio
          if (leaderProfile?.status === 'INACTIVE') {
            console.log('Líder inativo, redirecionando...');
            setIsBlocked(true);
            navigate('/conta-bloqueada');
            return;
          }
        }

        setIsChecking(false);
      } catch (error) {
        console.error('Erro ao verificar status do usuário:', error);
        navigate('/login');
      }
    };

    checkUserStatus();
  }, [user, loading, navigate]);

  // Mostra loading enquanto verifica
  if (isChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Se está bloqueado, não renderiza nada (já redirecionou)
  if (isBlocked) {
    return null;
  }

  // Se passou em todas as verificações, renderiza o conteúdo
  return <>{children}</>;
}
