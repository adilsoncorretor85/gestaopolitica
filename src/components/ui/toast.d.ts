export type ToastType = 'success' | 'error' | 'warning' | 'info';
interface ToastProps {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    onClose: (id: string) => void;
}
export declare function Toast({ id, type, title, message, duration, onClose }: ToastProps): import("react/jsx-runtime").JSX.Element;
export declare function useToast(): {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    ToastContainer: () => import("react/jsx-runtime").JSX.Element;
};
export {};
