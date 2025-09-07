type Props = {
    open: boolean;
    onClose: () => void;
    initialCoords?: {
        lat: number;
        lng: number;
    } | null;
    initialAddress?: any;
    onConfirm: (coords: {
        lat: number;
        lng: number;
    }) => void;
};
export default function MapPicker({ open, onClose, initialCoords, onConfirm }: Props): import("react/jsx-runtime").JSX.Element | null;
export {};
