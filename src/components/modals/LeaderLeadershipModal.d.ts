interface Props {
    isOpen: boolean;
    onClose: () => void;
    leaderProfileId: string;
    leaderCity?: string;
    leaderState?: string;
}
export default function LeaderLeadershipModal({ isOpen, onClose, leaderProfileId, leaderCity, leaderState }: Props): import("react/jsx-runtime").JSX.Element | null;
export {};
