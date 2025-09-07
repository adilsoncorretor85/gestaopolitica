type LeaderDrawerProps = {
    open: boolean;
    leaderId: string | null;
    onClose: () => void;
    onEdited?: () => void;
};
export default function LeaderDrawer({ open, leaderId, onClose, onEdited }: LeaderDrawerProps): import("react/jsx-runtime").JSX.Element | null;
export {};
