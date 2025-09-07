import React from 'react';
import { Profile } from '../types';
interface HeaderProps {
    profile?: Profile;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}
declare const Header: React.FC<HeaderProps>;
export default Header;
