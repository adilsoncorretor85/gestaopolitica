import { ElectionSettings } from "@/services/election";
type Props = {
    open: boolean;
    onClose: () => void;
    onSaved?: (s: ElectionSettings) => void;
};
export default function ElectionSettingsModal({ open, onClose, onSaved }: Props): import("react/jsx-runtime").JSX.Element | null;
export {};
