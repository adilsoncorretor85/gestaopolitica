import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { finalizeInvite } from '@/services/invite';
import { Vote } from 'lucide-react';

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
      nav('/dashboard');
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao finalizar convite.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border px-6 py-5 text-center">
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border px-6 py-5 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <Vote className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-xl font-semibold mb-2">Convite inválido</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{err ?? 'Convite inválido.'}</p>
          <button onClick={() => nav('/login')} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Ir para login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border px-6 py-5 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Vote className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1">Definir Senha</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Gestão Política - Vereador Wilian Tonezi</p>
          {email && <p className="text-sm text-blue-600 mt-2">Bem-vindo, {email}</p>}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{err}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Nova Senha *</label>
            <input type="password" value={pwd} onChange={(e)=>setPwd(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirmar Senha *</label>
            <input type="password" value={pwd2} onChange={(e)=>setPwd2(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          </div>

          <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white rounded-lg py-2">
            {saving ? 'Criando conta…' : 'Criar Conta'}
          </button>
        </form>
      </div>
    </div>
  );
}