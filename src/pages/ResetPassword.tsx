import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/convite`,
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setMsg("Se este e-mail existe, enviamos um link para redefinir a senha.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Esqueci minha senha
        </h1>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            inputMode="email"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button 
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </form>
        {msg && <p className="mt-4 text-green-600 dark:text-green-400 text-center">{msg}</p>}
        {err && <p className="mt-4 text-red-600 dark:text-red-400 text-center">{err}</p>}
      </div>
    </div>
  );
}
