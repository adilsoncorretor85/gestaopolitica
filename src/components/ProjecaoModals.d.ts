import type { CityGoal, NeighborhoodGoal } from '@/types/projecoes';
interface CityGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editData?: CityGoal | null;
    defaultDeadline?: string;
    onToast: (message: string, type: 'success' | 'error') => void;
}
export declare function CityGoalModal({ isOpen, onClose, onSuccess, editData, defaultDeadline, onToast }: CityGoalModalProps): import("react/jsx-runtime").JSX.Element | null;
interface NeighborhoodGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editData?: NeighborhoodGoal | null;
    defaultDeadline?: string;
    onToast: (message: string, type: 'success' | 'error') => void;
}
export declare function NeighborhoodGoalModal({ isOpen, onClose, onSuccess, editData, onToast }: NeighborhoodGoalModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
