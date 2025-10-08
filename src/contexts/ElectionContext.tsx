import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getElectionSettings, type ElectionSettings } from '@/services/election';
import { getPublicSettings } from '@/services/publicSettings';
import { devLog } from '@/lib/logger';

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
      try {
        // Tentar public_settings primeiro (mais rápido)
        const publicSettings = await getPublicSettings(supabase);
        
        if (publicSettings) {
          // Converter public_settings para ElectionSettings
          const electionData = {
            id: publicSettings.id.toString(),
            election_name: publicSettings.election_name,
            election_date: publicSettings.election_date,
            timezone: publicSettings.timezone,
            election_level: publicSettings.election_level as 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL',
            election_type: publicSettings.election_level as 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL', // Mapear election_level para election_type
            scope_state: publicSettings.scope_state,
            scope_city: publicSettings.scope_city,
            scope_city_ibge: publicSettings.scope_city_ibge,
            uf: publicSettings.scope_state, // Mapear scope_state para uf
            city: publicSettings.scope_city, // Mapear scope_city para city
            created_at: publicSettings.created_at,
            updated_at: publicSettings.updated_at,
          };
          setElection(electionData);
          return;
        }
        
        // Fallback para RPC se public_settings não disponível
        const e = await getElectionSettings(supabase);
        setElection(e);
      } catch (error) {
        devLog('Erro ao carregar configurações de eleição:', error);
        setElection(null);
      }
    })();
  }, [supabase]);

  const defaultFilters = useMemo<Filters>(() => {
    devLog('ElectionContext - election:', election);
    if (!election?.election_level) return {};
    if (election.election_level === 'MUNICIPAL') {
      // Municipal: filtra por cidade específica
      const filters = { state: election.scope_state ?? undefined, city: election.scope_city ?? undefined };
      devLog('ElectionContext - MUNICIPAL filters:', filters);
      return filters;
    }
    if (election.election_level === 'ESTADUAL') {
      // Estadual: filtra por estado (permite meta por cidade)
      const filters = { state: election.scope_state ?? undefined };
      devLog('ElectionContext - ESTADUAL filters:', filters);
      return filters;
    }
    if (election.election_level === 'FEDERAL') {
      // Federal: filtra por estado (sem meta por cidade)
      const filters = { state: election.scope_state ?? undefined };
      devLog('ElectionContext - FEDERAL filters:', filters);
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
