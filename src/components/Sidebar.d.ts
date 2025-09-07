import React from 'react';
interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}
declare const Sidebar: React.FC<SidebarProps>;
export default Sidebar;
