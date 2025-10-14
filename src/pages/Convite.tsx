import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { finalizeInvite } from '@/services/invite';
import { Vote } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

function useInviteParams() {
  return useMemo(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1)); // #...
    const query = new URLSearchParams(window.location.search);       // ?...
    return { hash, query };
  }, []);
}

export default function Convite() {
  const nav = useNavigate();
  const { hash, query } = useInviteParams();

  const [loading, setLoading] = useState(true);
  const [sessionOk, setSessionOk] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 1) Trocar o link por sessão (hash: invite; query: recovery)
  useEffect(() => {
    (async () => {
      try {
        setErr(null);

        const typeHash = hash.get('type');
        const at = hash.get('access_token');
        const rt = hash.get('refresh_token');

        const typeQuery = query.get('type');
        const code = query.get('code');

        if (typeHash === 'invite' && at && rt) {
          const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
          if (error) throw error;
        } else if (typeQuery === 'recovery' && code) {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } else {
          throw new Error('Link de convite inválido ou expirado.');
        }

        // sessão válida ⇒ obter e-mail
        const { data } = await supabase.auth.getUser();
        setEmail(data.user?.email ?? null);

        // limpar parâmetros visuais
        history.replaceState(null, '', window.location.pathname);
        setSessionOk(true);
      } catch (e: any) {
        setErr(e.message ?? 'Erro ao validar convite.');
      } finally {
        setLoading(false);
      }
    })();
  }, [hash, query]);

  // 2) Definir senha + RPC activate_leader
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setErr(null);
      if (pwd.length < 6) throw new Error('A senha precisa ter ao menos 6 caracteres.');
      if (pwd !== pwd2) throw new Error('As senhas não conferem.');

      setSaving(true);
      await finalizeInvite(pwd);
      // Redirecionar para completar perfil em vez de ir direto para dashboard
      nav('/complete-profile');
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao finalizar convite.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
          {/* Theme Toggle */}
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Vote className="h-8 w-8 text-white animate-pulse" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">Validando convite…</p>
        </div>
      </div>
    );
  }

  if (!sessionOk) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 max-w-md text-center">
          {/* Theme Toggle */}
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <Vote className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Convite Inválido</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{err ?? 'Convite inválido.'}</p>
          <button 
            onClick={() => nav('/login')} 
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 w-full max-w-lg">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Vote className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">Aceitar Convite</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Gestão Política - Vereador Wilian Tonezi</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            {email ? (
              <>Você foi convidado para o sistema com o e-mail <strong>{email}</strong>.</>
            ) : (
              "Convite válido."
            )}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Senha *
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Crie uma senha (mínimo 6 caracteres)"
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              inputMode="text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmar senha *
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              placeholder="Repita a senha"
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              inputMode="text"
            />
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Criando conta..." : "Criar Conta"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Já tem uma conta? <a href="/login" className="text-blue-600 hover:text-blue-800">Fazer login</a></p>
        </div>
      </div>
    </div>
  );
}