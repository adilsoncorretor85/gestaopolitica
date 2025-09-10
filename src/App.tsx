import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ElectionProvider } from "@/contexts/ElectionContext";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Pessoas from "@/pages/Pessoas";
import PessoasForm from "@/pages/PessoasForm";
import Mapa from "@/pages/Mapa";
import Lideres from "@/pages/Lideres";
import LideresForm from "@/pages/LideresForm";
import Projecao from "@/pages/Projecao";
import Convite from "@/pages/Convite";
import ProtectedAdmin from "@/components/ProtectedAdmin";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (!supabase) {
      console.error('Supabase não configurado. Verifique o .env e reinicie o Vite.');
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return <div>Carregando…</div>;
  if (!supabase) return <div>Erro: Supabase não configurado. Verifique o .env e reinicie o Vite.</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      {supabase && (
        <ElectionProvider supabase={supabase}>
          <BrowserRouter>
          <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/pessoas"
            element={
              <ProtectedRoute>
                <Pessoas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pessoas/nova"
            element={
              <ProtectedRoute>
                <PessoasForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pessoas/:id"
            element={
              <ProtectedRoute>
                <PessoasForm />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/mapa"
            element={
              <ProtectedRoute>
                <Mapa />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/lideres"
            element={
              <ProtectedAdmin>
                <Lideres />
              </ProtectedAdmin>
            }
          />
          <Route
            path="/lideres/novo"
            element={
              <ProtectedAdmin>
                <LideresForm />
              </ProtectedAdmin>
            }
          />
          <Route
            path="/lideres/:id"
            element={
              <ProtectedAdmin>
                <LideresForm />
              </ProtectedAdmin>
            }
          />
          
          <Route
            path="/projecao"
            element={
              <ProtectedAdmin>
                <Projecao />
              </ProtectedAdmin>
            }
          />
          
          <Route path="/convite" element={<Convite />} />
          
          {/* Redirects for compatibility */}
          <Route path="/contatos" element={<Navigate to="/pessoas" replace />} />
          <Route path="/contacts" element={<Navigate to="/pessoas" replace />} />
          <Route path="/contatos/*" element={<Navigate to="/pessoas" replace />} />
          <Route path="/contacts/*" element={<Navigate to="/pessoas" replace />} />
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        </ElectionProvider>
      )}
    </ThemeProvider>
  );
}