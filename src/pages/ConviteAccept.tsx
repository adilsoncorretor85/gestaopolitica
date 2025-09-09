import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Vote } from 'lucide-react';

export default function ConviteAcceptPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Página descontinuada - redirecionar automaticamente para /convite
    navigate('/convite', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-600 p-3 rounded-full">
            <Vote className="h-8 w-8 text-white animate-pulse" />
          </div>
        </div>
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  );
}