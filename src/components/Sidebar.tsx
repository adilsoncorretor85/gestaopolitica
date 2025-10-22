import { devLog } from '@/lib/logger';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Shield, X, MapPin, BarChart3, Tags } from 'lucide-react';
import useAuth from '@/hooks/useAuth';
import { useAccessibility } from '@/hooks/useAccessibility';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeTab, setActiveTab }) => {
  const { profile } = useAuth();
  const { announceToScreenReader } = useAccessibility();
  const isAdmin = profile?.role === 'ADMIN';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: Home },
    { id: 'pessoas', label: 'Pessoas', to: '/pessoas', icon: Users },
    // { id: 'agenda', label: 'Agenda', to: '/agenda', icon: Calendar }, // Temporariamente removido
    { id: 'lideres', label: 'Líderes', to: '/lideres', icon: Shield, onlyAdmin: true },
    { id: 'tags', label: 'Tags', to: '/admin/tags', icon: Tags, onlyAdmin: true },
    { id: 'projecao', label: 'Projeção', to: '/projecao', icon: BarChart3, onlyAdmin: true },
    { id: 'mapa', label: 'Mapa', to: '/mapa', icon: MapPin },
  ];

  const visibleItems = menuItems.filter(item => !item.onlyAdmin || isAdmin);

  const handleNavigation = (id: string, label: string) => {
    setActiveTab(id);
    announceToScreenReader(`Navegando para ${label}`);
    onClose();
  };

  // Debug info apenas em desenvolvimento
  if (import.meta.env.DEV) {
    devLog('Sidebar - Profile:', profile, 'IsAdmin:', isAdmin);
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        id="sidebar"
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-all duration-300 ease-in-out
          md:relative md:translate-x-0 md:shadow-none md:border-r md:border-gray-200 dark:md:border-gray-700
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Menu principal"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 md:hidden">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
          <button
            onClick={onClose}
            className="btn-accessible p-1 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            aria-label="Fechar menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="mt-4 px-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <NavLink
                key={item.id}
                to={item.to}
                onClick={() => handleNavigation(item.id, item.label)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium mb-1 transition-colors btn-accessible ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;