import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { Home, Users, Shield, X, MapPin, BarChart3 } from 'lucide-react';
import useAuth from '@/hooks/useAuth';
const Sidebar = ({ isOpen, onClose, activeTab, setActiveTab }) => {
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'ADMIN';
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: Home },
        { id: 'pessoas', label: 'Pessoas', to: '/pessoas', icon: Users },
        { id: 'lideres', label: 'Líderes', to: '/lideres', icon: Shield, onlyAdmin: true },
        { id: 'projecao', label: 'Projeção', to: '/projecao', icon: BarChart3, onlyAdmin: true },
        { id: 'mapa', label: 'Mapa', to: '/mapa', icon: MapPin },
    ];
    const visibleItems = menuItems.filter(item => !item.onlyAdmin || isAdmin);
    const handleNavigation = (id) => {
        setActiveTab(id);
        onClose();
    };
    // Debug info (remover em produção)
    console.log('Sidebar - Profile:', profile, 'IsAdmin:', isAdmin);
    return (_jsxs(_Fragment, { children: [isOpen && (_jsx("div", { className: "fixed inset-0 bg-gray-600 bg-opacity-50 z-40 md:hidden", onClick: onClose })), _jsxs("div", { className: `
        fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-all duration-300 ease-in-out
        md:relative md:translate-x-0 md:shadow-none md:border-r md:border-gray-200 dark:md:border-gray-700
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `, children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 md:hidden", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-white", children: "Menu" }), _jsx("button", { onClick: onClose, className: "p-1 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300", children: _jsx(X, { className: "h-6 w-6" }) })] }), _jsx("nav", { className: "mt-4 px-4", children: visibleItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (_jsxs(NavLink, { to: item.to, onClick: () => handleNavigation(item.id), className: `w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium mb-1 transition-colors ${isActive
                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}`, children: [_jsx(Icon, { className: "h-5 w-5" }), _jsx("span", { children: item.label })] }, item.id));
                        }) })] })] }));
};
export default Sidebar;
