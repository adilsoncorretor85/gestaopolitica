import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";

export default function ProtectedAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-sm text-gray-600">Carregando…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}