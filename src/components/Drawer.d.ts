import React from 'react';
interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}
export default function Drawer({ isOpen, onClose, title, children }: DrawerProps): import("react/jsx-runtime").JSX.Element | null;
export {};
