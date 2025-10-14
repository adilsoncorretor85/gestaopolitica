import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Vote } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Detectar convite e redirecionar para /convite
  useEffect(() => {
    if (window.location.hash.includes("type=invite")) {
      navigate("/convite" + window.location.hash);
      return;
    }
  }, [navigate]);

  useEffect(() => {
    const hash = window.location.hash?.slice(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type = params.get('type'); // 'invite', 'recovery', etc.

    (async () => {
      if (access_token && refresh_token) {
        const { error } = await supabase?.auth.setSession({ access_token, refresh_token }) || { error: null };
        // limpa o hash para não ficar poluído
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

        if (!error) {
          // se veio de convite ou recuperação, peça para definir senha
          if (type === 'invite' || type === 'recovery') {
            navigate('/convite', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          console.error('Erro ao setar sessão:', error);
        }
      }
    })();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await supabase?.auth.signInWithPassword({
        email,
        password,
      });

      if (result?.error) throw result.error;

      if (result?.data?.user) {
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Vote className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Acesso</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerenciador de Liderança Política</p>
          <p className="text-blue-600 dark:text-blue-400 font-medium">Vereador Wilian Tonezi - PL</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              inputMode="email"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              inputMode="text"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <button 
            onClick={() => navigate('/reset-password')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            Esqueci minha senha
          </button>
          <p className="mt-2">Precisa de ajuda? Entre em contato com o administrador.</p>
        </div>
      </div>
    </div>
  );
}