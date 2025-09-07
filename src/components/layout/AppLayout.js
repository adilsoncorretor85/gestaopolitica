'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
export default function AppLayout({ children, profile }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(Header, { profile: profile, sidebarOpen: sidebarOpen, setSidebarOpen: setSidebarOpen }), _jsxs("div", { className: "flex", children: [_jsx("div", { className: "md:w-64 flex-shrink-0", children: _jsx(Sidebar, { isOpen: sidebarOpen, onClose: () => setSidebarOpen(false), activeTab: "", setActiveTab: () => { } }) }), _jsx("main", { className: "flex-1 overflow-x-hidden", children: children })] })] }));
}
