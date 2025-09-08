import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Vote } from "lucide-react";
import ThemeToggle from '@/components/ThemeToggle';

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  // Lê os parâmetros do fragmento (#) inseridos pelo Supabase (type=invite, access_token, etc.)
  const params = useMemo(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    return new URLSearchParams(hash);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const type = params.get("type");
        const accessToken = params.get("access_token");
        if (type !== "invite" || !accessToken) {
          setError("Link de convite inválido ou expirado.");
          setChecking(false);
          return;
        }

        // Troca o token do link por uma sessão válida
        const { data, error } = await supabase?.auth.getUser(accessToken) || { data: null, error: null };
        if (error || !data?.user) {
          setError("Não foi possível validar o convite.");
        } else {
          setEmail(data?.user?.email ?? null);
        }
      } catch (e: any) {
        setError(e.message ?? "Erro ao validar convite.");
      } finally {
        setChecking(false);
      }
    })();
  }, [params]);

  async function handleCreate() {
    setError(null);

    if (!password || password.length < 6) {
      setError("Defina uma senha com ao menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setSaving(true);
    try {
      // Define a senha do usuário convidado
      const { error } = await supabase?.auth.updateUser({ password }) || { error: null };
      if (error) throw error;

      // Opcional: encerra a sessão e manda para o login
      await supabase?.auth.signOut();
      navigate("/login?ok=invite");
    } catch (e: any) {
      setError(e.message ?? "Falha ao criar a conta.");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
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

  if (error) {
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
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => (window.location.href = "/login")}
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

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Senha *
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Crie uma senha (mínimo 6 caracteres)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmar senha *
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a senha"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Criando conta..." : "Criar Conta"}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Já tem uma conta? <a href="/login" className="text-blue-600 hover:text-blue-800">Fazer login</a></p>
        </div>
      </div>
    </div>
  );
}