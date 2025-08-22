import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface DatabaseStatusProps {
  error?: string;
}

export default function DatabaseStatus({ error }: DatabaseStatusProps) {
  if (!error || !error.includes('does not exist')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-yellow-100 p-3 rounded-full">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Banco não inicializado
        </h2>
        
        <p className="text-gray-600 mb-6">
          As tabelas do banco de dados ainda não foram criadas. 
          Execute o SQL de configuração no Supabase para continuar.
        </p>
        
        <a
          href="/docs/db-setup.md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <span>Ver instruções</span>
          <ExternalLink className="h-4 w-4" />
        </a>
        
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Detalhes do erro
          </summary>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded text-gray-700 overflow-auto">
            {error}
          </pre>
        </details>
      </div>
    </div>
  );
}