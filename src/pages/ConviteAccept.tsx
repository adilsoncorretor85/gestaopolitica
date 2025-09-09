import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getInviteToken, acceptInvite, type InviteToken } from '@/services/invite';
import { Vote, Loader2, CheckCircle, XCircle } from 'lucide-react';

const acceptInviteSchema = z.object({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>;

export default function ConviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [inviteData, setInviteData] = useState<InviteToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema)
  });

  useEffect(() => {
    if (token) {
      loadInviteData();
    }
  }, [token]);

  const loadInviteData = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError('');
      const data = await getInviteToken(token);
      setInviteData(data);
    } catch (error) {
      console.error('Erro ao carregar convite:', error);
      setError('Convite inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AcceptInviteFormData) => {
    if (!token) return;
    
    try {
      setAccepting(true);
      setError('');
      
      // Este fluxo não é mais usado - o fluxo principal é via /convite
      // Manter apenas para compatibilidade
      alert('Este fluxo foi descontinuado. Use o link do email para aceitar o convite.');
      navigate('/login');
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      setError(error instanceof Error ? error.message : 'Erro ao criar conta');
    } finally {
      setAccepting(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Validando convite...</p>
        </div>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Convite Inválido</h2>
          <p className="text-gray-600 mb-4">
            {error || 'Este convite não é válido ou já expirou.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Vote className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Aceitar Convite</h1>
          <p className="text-gray-600">Gestão Política - Vereador Wilian Tonezi</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">Convite Válido</span>
          </div>
          <p className="text-sm text-blue-800">
            Você foi convidado como <strong>{inviteData.full_name}</strong>
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Email: {inviteData.email}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={inviteData.email}
              disabled
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha *
            </label>
            <input
              type="password"
              {...register('password')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Mínimo 6 caracteres"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Senha *
            </label>
            <input
              type="password"
              {...register('confirmPassword')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite a senha novamente"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={accepting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {accepting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{accepting ? 'Criando conta...' : 'Criar Conta'}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Já tem uma conta? <a href="/login" className="text-blue-600 hover:text-blue-800">Fazer login</a></p>
        </div>
      </div>
    </div>
  );
}