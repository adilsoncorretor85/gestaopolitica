import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ElectionProvider } from "@/contexts/ElectionContext";

import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import DefinirSenha from "@/pages/DefinirSenha";
import Dashboard from "@/pages/Dashboard";
import Pessoas from "@/pages/Pessoas";
import PessoasForm from "@/pages/PessoasForm";
import Mapa from "@/pages/Mapa";
import Lideres from "@/pages/Lideres";
import LideresForm from "@/pages/LideresForm";
import Projecao from "@/pages/Projecao";
import Convite from "@/pages/Convite";
import CompleteProfile from "@/pages/CompleteProfile";
import ContaBloqueada from "@/pages/ContaBloqueada";
import ProtectedAdmin from "@/components/ProtectedAdmin";
import RouteGuard from "@/components/RouteGuard";


export default function App() {
  if (!supabase) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                Configuração Necessária
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                O Supabase não está configurado. Verifique as variáveis de ambiente:
              </p>
              <ul className="mt-4 text-sm text-gray-600 dark:text-gray-300 text-left">
                <li>• VITE_SUPABASE_URL</li>
                <li>• VITE_SUPABASE_ANON_KEY</li>
              </ul>
              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                Copie o arquivo env.example para .env e preencha com seus valores.
              </p>
            </div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ElectionProvider supabase={supabase}>
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/definir-senha" element={<DefinirSenha />} />
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
          
          <Route
            path="/complete-profile"
            element={
              <RouteGuard>
                <CompleteProfile />
              </RouteGuard>
            }
          />
          
          {/* Redirects for compatibility */}
          <Route path="/contatos" element={<Navigate to="/pessoas" replace />} />
          <Route path="/contacts" element={<Navigate to="/pessoas" replace />} />
          <Route path="/contatos/*" element={<Navigate to="/pessoas" replace />} />
          <Route path="/contacts/*" element={<Navigate to="/pessoas" replace />} />
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        </ElectionProvider>
      </ThemeProvider>
    );
  }