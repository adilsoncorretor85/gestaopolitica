import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
const toastStyles = {
    success: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        icon: CheckCircle,
        iconColor: 'text-green-600 dark:text-green-400',
        titleColor: 'text-green-800 dark:text-green-200',
    },
    error: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        icon: XCircle,
        iconColor: 'text-red-600 dark:text-red-400',
        titleColor: 'text-red-800 dark:text-red-200',
    },
    warning: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: AlertCircle,
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        titleColor: 'text-yellow-800 dark:text-yellow-200',
    },
    info: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        icon: AlertCircle,
        iconColor: 'text-blue-600 dark:text-blue-400',
        titleColor: 'text-blue-800 dark:text-blue-200',
    },
};
export function Toast({ id, type, title, message, duration = 5000, onClose }) {
    const [isVisible, setIsVisible] = useState(false);
    const styles = toastStyles[type];
    const Icon = styles.icon;
    useEffect(() => {
        // Animar entrada
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => onClose(id), 300); // Aguarda animação de saída
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, id, onClose]);
    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300);
    };
    return (_jsx("div", { className: `
        max-w-sm w-full ${styles.bg} ${styles.border} border rounded-lg shadow-lg p-4
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `, children: _jsxs("div", { className: "flex items-start", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx(Icon, { className: `h-5 w-5 ${styles.iconColor}` }) }), _jsxs("div", { className: "ml-3 w-0 flex-1", children: [_jsx("p", { className: `text-sm font-medium ${styles.titleColor}`, children: title }), message && (_jsx("p", { className: "mt-1 text-sm text-gray-600 dark:text-gray-400", children: message }))] }), _jsx("div", { className: "ml-4 flex-shrink-0 flex", children: _jsx("button", { className: "inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none", onClick: handleClose, children: _jsx(X, { className: "h-4 w-4" }) }) })] }) }));
}
// Hook para gerenciar toasts
export function useToast() {
    const [toasts, setToasts] = useState([]);
    const addToast = (toast) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { ...toast, id }]);
    };
    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };
    const success = (title, message) => addToast({ type: 'success', title, message });
    const error = (title, message) => addToast({ type: 'error', title, message });
    const warning = (title, message) => addToast({ type: 'warning', title, message });
    const info = (title, message) => addToast({ type: 'info', title, message });
    const ToastContainer = () => (_jsx("div", { className: "fixed top-4 right-4 z-50 space-y-2", children: toasts.map(toast => (_jsx(Toast, { ...toast, onClose: removeToast }, toast.id))) }));
    return {
        success,
        error,
        warning,
        info,
        ToastContainer,
    };
}
