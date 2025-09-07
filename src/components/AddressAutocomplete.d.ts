export type AddressParts = {
    street: string | null;
    number: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    cep: string | null;
    latitude: number | null;
    longitude: number | null;
    formatted: string;
};
type Props = {
    label?: string;
    placeholder?: string;
    defaultValue?: string;
    onSelect: (parts: AddressParts) => void;
    className?: string;
};
export default function AddressAutocomplete({ label, placeholder, defaultValue, onSelect, className }: Props): import("react/jsx-runtime").JSX.Element;
export {};
