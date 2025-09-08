import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentElection, type ElectionSettings } from '@/services/elections';

type Filters = { state?: string; city?: string };
type Ctx = {
  election: ElectionSettings | null;
  defaultFilters: Filters;
  setElection: (e: ElectionSettings | null) => void;
};

const ElectionContext = createContext<Ctx>({
  election: null,
  defaultFilters: {},
  setElection: () => {},
});

export function ElectionProvider({
  supabase,
  children,
}: { supabase: SupabaseClient; children: React.ReactNode }) {
  const [election, setElection] = useState<ElectionSettings | null>(null);

  useEffect(() => {
    (async () => {
      const e = await getCurrentElection(supabase);
      setElection(e);
    })();
  }, [supabase]);

  const defaultFilters = useMemo<Filters>(() => {
    if (!election?.election_level) return {};
    if (election.election_level === 'MUNICIPAL') {
      // Municipal: filtra por cidade específica
      return { state: election.scope_state ?? undefined, city: election.scope_city ?? undefined };
    }
    if (election.election_level === 'ESTADUAL') {
      // Estadual: filtra por estado (permite meta por cidade)
      return { state: election.scope_state ?? undefined };
    }
    if (election.election_level === 'FEDERAL') {
      // Federal: filtra por estado (sem meta por cidade)
      return { state: election.scope_state ?? undefined };
    }
    return {};
  }, [election]);

  return (
    <ElectionContext.Provider value={{ election, defaultFilters, setElection }}>
      {children}
    </ElectionContext.Provider>
  );
}

export const useElection = () => useContext(ElectionContext);
