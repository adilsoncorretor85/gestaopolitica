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
import ContaBloqueada from "@/pages/ContaBloqueada";
import ProtectedAdmin from "@/components/ProtectedAdmin";
import RouteGuard from "@/components/RouteGuard";


export default function App() {
  return (
    <ThemeProvider>
      {supabase && (
        <ElectionProvider supabase={supabase}>
          <BrowserRouter>
          <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/conta-bloqueada" element={<ContaBloqueada />} />
          
          <Route
            path="/dashboard"
            element={
              <RouteGuard>
                <Dashboard />
              </RouteGuard>
            }
          />
          
          <Route
            path="/pessoas"
            element={
              <RouteGuard>
                <Pessoas />
              </RouteGuard>
            }
          />
          <Route
            path="/pessoas/nova"
            element={
              <RouteGuard>
                <PessoasForm />
              </RouteGuard>
            }
          />
          <Route
            path="/pessoas/:id"
            element={
              <RouteGuard>
                <PessoasForm />
              </RouteGuard>
            }
          />
          
          <Route
            path="/mapa"
            element={
              <RouteGuard>
                <Mapa />
              </RouteGuard>
            }
          />
          
          <Route
            path="/lideres"
            element={
              <RouteGuard>
                <ProtectedAdmin>
                  <Lideres />
                </ProtectedAdmin>
              </RouteGuard>
            }
          />
          <Route
            path="/lideres/novo"
            element={
              <RouteGuard>
                <ProtectedAdmin>
                  <LideresForm />
                </ProtectedAdmin>
              </RouteGuard>
            }
          />
          <Route
            path="/lideres/:id"
            element={
              <RouteGuard>
                <ProtectedAdmin>
                  <LideresForm />
                </ProtectedAdmin>
              </RouteGuard>
            }
          />
          
          <Route
            path="/projecao"
            element={
              <RouteGuard>
                <ProtectedAdmin>
                  <Projecao />
                </ProtectedAdmin>
              </RouteGuard>
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