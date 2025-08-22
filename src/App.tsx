import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import DefinirSenha from "@/pages/DefinirSenha";
import Pessoas from "@/pages/Pessoas";
import PessoasForm from "@/pages/PessoasForm";
import Lideres from "@/pages/Lideres";
import LideresForm from "@/pages/LideresForm";
import ConviteAccept from "@/pages/ConviteAccept";
import AcceptInvite from "@/pages/AcceptInvite";
import Auditoria from "@/pages/Auditoria";
import ProtectedAdmin from "@/components/ProtectedAdmin";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
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
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/definir-senha" element={<DefinirSenha />} />
          
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
            path="/auditoria"
            element={
              <ProtectedAdmin>
                <Auditoria />
              </ProtectedAdmin>
            }
          />
          
          <Route path="/convite/:token" element={<ConviteAccept />} />
          <Route path="/convite" element={<AcceptInvite />} />
          
          {/* Redirects for compatibility */}
          <Route path="/contatos" element={<Navigate to="/pessoas" replace />} />
          <Route path="/contacts" element={<Navigate to="/pessoas" replace />} />
          <Route path="/contatos/*" element={<Navigate to="/pessoas" replace />} />
          <Route path="/contacts/*" element={<Navigate to="/pessoas" replace />} />
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}