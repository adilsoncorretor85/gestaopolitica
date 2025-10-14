import React from 'react';
import { Vote, Menu, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserMenu from "@/components/auth/UserMenu";
import { Profile } from '../types';
import { useAccessibility } from '@/hooks/useAccessibility';
import { usePWA } from '@/hooks/usePWA';

interface HeaderProps {
  profile?: Profile;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ profile, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const { announceToScreenReader } = useAccessibility();
  const { isOnline } = usePWA();

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
    announceToScreenReader(
      sidebarOpen ? 'Menu lateral fechado' : 'Menu lateral aberto'
    );
  };

  return (
    <header 
      className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200"
      role="banner"
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button
              onClick={handleSidebarToggle}
              className="md:hidden btn-accessible p-2 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              aria-label={sidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
              aria-expanded={sidebarOpen}
              aria-controls="sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-1" role="img" aria-label="Logo do Vereador Wilian Tonezi">
                <img 
                  src="/logo_tonezi.png" 
                  alt="Logo Wilian Tonezi" 
                  className="h-10 w-10 object-contain" 
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  <button 
                    onClick={() => navigate('/dashboard')} 
                    className="focus-visible hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Gestão Política
                  </button>
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Wilian Tonezi - 2026</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Indicador de status offline */}
            {!isOnline && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-orange-100 dark:bg-orange-900 rounded-md">
                <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  Offline
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">{profile?.full_name || 'Usuário'}</span>
              <UserMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;