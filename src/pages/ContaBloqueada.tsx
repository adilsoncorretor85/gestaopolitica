export default function ContaBloqueada() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center shadow-sm">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <span className="text-red-600 dark:text-red-400 text-2xl">🚫</span>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Conta Desativada
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Seu acesso foi suspenso. Entre em contato com o administrador para mais informações.
        </p>
        
        <div className="space-y-3">
          <a 
            className="inline-block w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors" 
            href="mailto:contato@gabitechnology.cloud"
          >
            Falar com o administrador
          </a>
          
          <button 
            onClick={() => window.location.href = '/login'}
            className="inline-block w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    </div>
  );
}
