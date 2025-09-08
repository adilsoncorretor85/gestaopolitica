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
    console.log('ElectionContext - election:', election);
    if (!election?.election_level) return {};
    if (election.election_level === 'MUNICIPAL') {
      // Municipal: filtra por cidade específica
      const filters = { state: election.scope_state ?? undefined, city: election.scope_city ?? undefined };
      console.log('ElectionContext - MUNICIPAL filters:', filters);
      return filters;
    }
    if (election.election_level === 'ESTADUAL') {
      // Estadual: filtra por estado (permite meta por cidade)
      const filters = { state: election.scope_state ?? undefined };
      console.log('ElectionContext - ESTADUAL filters:', filters);
      return filters;
    }
    if (election.election_level === 'FEDERAL') {
      // Federal: filtra por estado (sem meta por cidade)
      const filters = { state: election.scope_state ?? undefined };
      console.log('ElectionContext - FEDERAL filters:', filters);
      return filters;
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
