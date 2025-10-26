import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ElectionProvider } from "@/contexts/ElectionContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { usePreload } from "@/lib/preload-manager";
import { performanceMonitor } from "@/lib/performance-monitor";

// Lazy loading otimizado para páginas com preload
const Login = lazy(() => import("@/pages/Login"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Pessoas = lazy(() => import("@/pages/Pessoas"));
const PessoasForm = lazy(() => import("@/pages/PessoasForm"));
const Mapa = lazy(() => import("@/pages/Mapa"));
const Lideres = lazy(() => import("@/pages/Lideres"));
const LideresForm = lazy(() => import("@/pages/LideresForm"));
const Projecao = lazy(() => import("@/pages/Projecao"));
const AdminTags = lazy(() => import("@/pages/AdminTags"));
const Convite = lazy(() => import("@/pages/Convite"));
const CompleteProfile = lazy(() => import("@/pages/CompleteProfile"));
const ContaBloqueada = lazy(() => import("@/pages/ContaBloqueada"));
// const Agenda = lazy(() => import("@/pages/Agenda")); // Temporariamente desabilitado

// Preload das páginas mais importantes
const preloadDashboard = () => import("@/pages/Dashboard");
const preloadPessoas = () => import("@/pages/Pessoas");

// Preload automático após carregamento inicial
if (typeof window !== 'undefined') {
  setTimeout(() => {
    preloadDashboard();
    preloadPessoas();
  }, 2000);
}

// Componentes que não precisam de lazy loading (são pequenos)
import ProtectedAdmin from "@/components/ProtectedAdmin";
import RouteGuard from "@/components/RouteGuard";
import LoadingSpinner from "@/components/LoadingSpinner";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";


function AppWithPreload() {
  // Inicializa sistema de preload (agora dentro do Router)
  usePreload();

  return (
    <>
      {/* Skip Link para acessibilidade */}
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo principal
      </a>
      <Suspense fallback={<LoadingSpinner text="Carregando página..." />}>
        <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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

          <Route
            path="/admin/tags"
            element={
              <RouteGuard>
                <ProtectedAdmin>
                  <AdminTags />
                </ProtectedAdmin>
              </RouteGuard>
            }
          />

          {/* Temporariamente desabilitado - Agenda */}
          {/* <Route
            path="/agenda"
            element={
              <RouteGuard>
                <Agenda />
              </RouteGuard>
            }
          /> */}
          
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
      </Suspense>
    </>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <AppWithPreload />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ElectionProvider supabase={supabase}>
          <AppContent />
        </ElectionProvider>
      </ThemeProvider>
      
      {/* PWA Components */}
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
    </ErrorBoundary>
  );
}