import React from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

export default function AuditoriaPage() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('auditoria');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      <div className="flex">
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="flex-1 overflow-x-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Auditoria</h2>
            <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
          </div>
        </main>
      </div>
    </div>
  );
}