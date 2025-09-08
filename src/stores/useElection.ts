import { create } from 'zustand';
import type { ElectionSettings } from '@/services/election';

type ElectionState = {
  election: ElectionSettings | null;
  setElection: (e: ElectionSettings | null) => void;
  hasAppliedMapLock: boolean;         // garante aplicar centralização 1x
  setHasAppliedMapLock: (v: boolean) => void;
};

export const useElection = create<ElectionState>((set) => ({
  election: null,
  setElection: (e) => set({ election: e }),
  hasAppliedMapLock: false,
  setHasAppliedMapLock: (v) => set({ hasAppliedMapLock: v }),
}));
