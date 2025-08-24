import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Shield, X } from 'lucide-react';
import useAuth from '@/hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeTab, setActiveTab }) => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: Home },
    { id: 'pessoas', label: 'Pessoas', to: '/pessoas', icon: Users },
    { id: 'lideres', label: 'Líderes', to: '/lideres', icon: Shield, onlyAdmin: true },
  ];

  const visibleItems = menuItems.filter(item => !item.onlyAdmin || isAdmin);

  const handleNavigation = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  // Debug info (remover em produção)
  console.log('Sidebar - Profile:', profile, 'IsAdmin:', isAdmin);

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
      <div className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:shadow-none md:border-r md:border-gray-200
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 md:hidden">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500"
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
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium mb-1 transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
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