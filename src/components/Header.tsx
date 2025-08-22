import React from 'react';
import { Vote, Menu } from 'lucide-react';
import UserMenu from "@/components/auth/UserMenu";
import { Profile } from '../types';

interface HeaderProps {
  profile?: Profile;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ profile, sidebarOpen, setSidebarOpen }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Vote className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Gestão Política</h1>
                <p className="text-sm text-gray-500">Vereador Wilian Tonezi - PL</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">{profile?.full_name || profile?.email || 'Usuário'}</span>
              <UserMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;