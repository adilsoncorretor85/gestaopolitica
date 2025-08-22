import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Vote } from 'lucide-react';

export default function DefinirSenha() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    // garante que existe sessão (veio do convite)
    supabase.auth.getUser().then(({ data, error }) => {
      if (!data.user || error) {
        navigate('/login', { replace: true });
      } else {
        setUserEmail(data.user.email || '');
      }
    });
  }, [navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!password || password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      // 1) define a senha do usuário autenticado
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) throw upErr;

      // 2) marca o convite como aceito (se sua tabela tiver essas colunas)
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await supabase
          .from('invite_tokens')
          .update({ accepted_at: new Date().toISOString() })
          .eq('email', user.email)
          .is('accepted_at', null);

        await supabase
          .from('leader_profiles')
          .update({ status: 'ACTIVE' })
          .eq('id', user.id);
      }

      // pronto!
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Falha ao definir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Vote className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Crie sua senha</h1>
          <p className="text-gray-600">Gestão Política - Vereador Wilian Tonezi</p>
          {userEmail && (
            <p className="text-sm text-blue-600 mt-2">
              Bem-vindo, {userEmail}
            </p>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nova Senha *
            </label>
            <input
              type="password"
              autoFocus
              placeholder="Mínimo 6 caracteres"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Senha *
            </label>
            <input
              type="password"
              placeholder="Digite a senha novamente"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Salvando...' : 'Salvar senha e entrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Após definir sua senha, você terá acesso completo ao sistema.</p>
        </div>
      </div>
    </div>
  );
}