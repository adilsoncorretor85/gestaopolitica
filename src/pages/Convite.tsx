import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Vote } from "lucide-react";
import ThemeToggle from '@/components/ThemeToggle';
import { finalizeInvite } from "@/services/invite";

function useInviteHash() {
  return useMemo(() => {
    const p = new URLSearchParams(window.location.hash.slice(1)); // remove "#"
    return {
      type: p.get("type"),
      access_token: p.get("access_token"),
      refresh_token: p.get("refresh_token"),
      error: p.get("error_description"),
    };
  }, []);
}

export default function Convite() {
  const nav = useNavigate();
  const { type, access_token, refresh_token, error } = useInviteHash();
  const [loading, setLoading] = useState(true);
  const [sessionOk, setSessionOk] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  // 1) Garantir sessão a partir do hash
  useEffect(() => {
    (async () => {
      try {
        if (error) throw new Error(error);
        if (!access_token || !refresh_token) {
          throw new Error("Link inválido ou expirado.");
        }
        if (type !== "invite" && type !== "recovery") {
          throw new Error("Tipo de link inválido.");
        }

        const { error: sErr } = await getSupabaseClient().auth.setSession({
          access_token,
          refresh_token,
        });
        if (sErr) throw sErr;

        // Pegar email do usuário
        const { data: { user } } = await getSupabaseClient().auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
        }

        // limpa o hash para não ficar poluindo a URL
        window.history.replaceState(null, "", window.location.pathname);
        setSessionOk(true);
      } catch (e: any) {
        setMsg(e.message ?? "Erro ao validar convite.");
      } finally {
        setLoading(false);
      }
    })();
  }, [type, access_token, refresh_token, error]);

  // 2) Submeter nova senha
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    
    try {
      if (pwd.length < 6) throw new Error("A senha precisa ter ao menos 6 caracteres.");
      if (pwd !== pwd2) throw new Error("As senhas não conferem.");

      // Usar a função finalizeInvite que chama o RPC activate_leader
      await finalizeInvite(pwd);

      setMsg("Senha definida com sucesso! Redirecionando...");
      setTimeout(() => nav("/dashboard"), 1200);
    } catch (e: any) {
      setMsg(e.message ?? "Erro ao definir senha.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Vote className="h-8 w-8 text-white animate-pulse" />
            </div>
          </div>
          <p className="text-gray-600">Validando convite…</p>
        </div>
      </div>
    );
  }

  if (!sessionOk) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <Vote className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-xl font-semibold mb-2 text-gray-900">Convite Inválido</h1>
          <p className="text-sm text-gray-600 mb-4">{msg ?? "Convite inválido."}</p>
          <button
            onClick={() => nav("/login")}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Definir Senha</h1>
          <p className="text-gray-600 dark:text-gray-300">Gestão Política - Vereador Wilian Tonezi</p>
          {userEmail && (
            <p className="text-sm text-blue-600 mt-2">
              Bem-vindo, {userEmail}
            </p>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {msg && (
            <div className={`px-4 py-3 rounded-lg ${
              msg.includes('sucesso') 
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {msg}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nova Senha *
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Mínimo 6 caracteres"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmar Senha *
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite a senha novamente"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-2 px-4 hover:bg-blue-700 transition-colors"
          >
            Criar Conta
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Após definir sua senha, você terá acesso completo ao sistema.</p>
        </div>
      </div>
    </div>
  );
}