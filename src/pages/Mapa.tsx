import { devLog, logger } from '@/lib/logger';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '@/lib/supabaseClient';
import { loadGoogleMaps } from '@/lib/googleMaps';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { TagFilter } from '@/components/TagFilter';
import useAuth from '@/hooks/useAuth';
import { useElection } from '@/contexts/ElectionContext';
import { useElection as useElectionStore } from '@/stores/useElection';
import { getActiveElection } from '@/services/election';
import { normalizeKey } from '@/lib/normalize';
import { Profile } from '@/types/database';
import { ESTADOS_BRASIL } from '@/data/estadosBrasil';
import { useThemeContext } from '@/components/ThemeProvider';
import { tagsService, type Tag } from '@/services/tags';

// Declaração de tipos para Google Maps
declare const google: any;

const personIcon = (_g: typeof google) =>
  ({
    path: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z',
    fillColor: '#3B82F6',
    fillOpacity: 1,
    strokeWeight: 0,
    scale: 1.3,
    anchor: new google.maps.Point(12, 12),
  });

const leaderIcon = (_g: typeof google) =>
  ({
    path: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z',
    fillColor: '#10B981',
    fillOpacity: 1,
    strokeWeight: 0,
    scale: 1.3,
    anchor: new google.maps.Point(12, 12),
  });

// Componente React para popup de pessoa
const PersonPopup = ({ person }: { person: any }) => (
  <div className="p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[280px]">
    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">{person.full_name}</h3>
    <div className="mt-2 space-y-1 text-sm">
      {person.whatsapp && <p className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">WhatsApp:</strong> {person.whatsapp}</p>}
      {person.city && <p className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">Cidade:</strong> {person.city}</p>}
      {person.neighborhood && <p className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">Bairro:</strong> {person.neighborhood}</p>}
      {person.state && <p className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">UF:</strong> {person.state}</p>}
      {person.vote_status && <p className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">Status do voto:</strong> {person.vote_status}</p>}
      {person.leader_name && <p className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">Líder:</strong> {person.leader_name}</p>}
      
      {/* Tags */}
      {person.tags && Array.isArray(person.tags) && person.tags.length > 0 && (
        <div className="text-gray-700 dark:text-gray-300">
          <strong className="text-gray-900 dark:text-white">Tags:</strong>
          <div className="flex flex-wrap gap-1 mt-1">
            {person.tags.map((tag: any, index: number) => (
              <span 
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                style={{ 
                  backgroundColor: tag.color ? tag.color + '20' : '#e5e7eb', 
                  borderColor: tag.color || '#9ca3af',
                  color: tag.color || '#374151'
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
      <div className="flex gap-2">
        {person.whatsapp && (
          <a 
            href={`https://wa.me/55${person.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
            WhatsApp
          </a>
        )}
        {person.latitude && person.longitude && (
          <a 
            href={`https://www.google.com/maps/dir/?api=1&destination=${person.latitude},${person.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Rota
          </a>
        )}
      </div>
    </div>
  </div>
);

// Componente React para popup de líder
const LeaderPopup = ({ leader }: { leader: any }) => (
  <div className="p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[280px]">
    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">{leader.name}</h3>
    <div className="mt-2 space-y-1 text-sm">
      {leader.email && <p className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">Email:</strong> {leader.email}</p>}
      {leader.phone && <p className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">Telefone:</strong> {leader.phone}</p>}
      {leader.city && <p className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">Cidade:</strong> {leader.city}</p>}
      {leader.neighborhood && <p className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">Bairro:</strong> {leader.neighborhood}</p>}
      {leader.state && <p className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">UF:</strong> {leader.state}</p>}
    </div>
    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
      <a 
        href={`/lideres/${leader.id}`} 
        className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
      >
        Editar
      </a>
    </div>
  </div>
);

// Função para criar InfoWindow com React
const createReactInfoWindow = (g: typeof google, content: React.ReactElement) => {
  const div = document.createElement('div');
  const root = createRoot(div);
  root.render(content);
  
  const infoWindow = new g.maps.InfoWindow({
    content: div,
  });
  
  return infoWindow;
};

export default function Mapa() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('mapa');
  const { profile: authProfile, isAdmin } = useAuth();
  const { defaultFilters } = useElection();
  const { election, setElection, hasAppliedMapLock, setHasAppliedMapLock } = useElectionStore();
  const { isDark } = useThemeContext();
  
  // Converter o profile do useAuth para o tipo esperado pelo Header
  const profile: Profile | undefined = authProfile ? {
    id: authProfile.id,
    role: authProfile.role || 'LEADER',
    full_name: authProfile.full_name || null,
    email: (authProfile as any).email || '',
    created_at: (authProfile as any).created_at || new Date().toISOString(),
    updated_at: (authProfile as any).updated_at || new Date().toISOString()
  } : undefined;

  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const gRef   = useRef<typeof google | null>(null);

  const peopleMarkersRef = useRef<google.maps.Marker[]>([]);
  const leaderMarkersRef = useRef<google.maps.Marker[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [totals, setTotals]   = useState({ people: 0, leaders: 0 });

  // filtros
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("__all__"); // só admin usa
  const [leadersOptions, setLeadersOptions] = useState<{ id: string; name: string }[]>([]);

  const [selectedUF, setSelectedUF] = useState<string>("__all__");
  const [selectedCity, setSelectedCity] = useState<string>("__all__");
  const [selectedCityKey, setSelectedCityKey] = useState<string>(""); // chave normalizada da cidade
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("__all__");
  const [selectedVoteStatus, setSelectedVoteStatus] = useState<string>("__all__");
  const [overrode, setOverrode] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // filtros de tags
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tagMode, setTagMode] = useState<'ANY' | 'ALL'>('ANY');
  const [loadingTags, setLoadingTags] = useState(false);

  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [nbOptions, setNbOptions] = useState<string[]>([]);

  // InfoWindow único
  const infoRef = useRef<any>(null);

  // Buscar eleição ativa uma vez (se não estiver no store)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!election) {
        const data = await getActiveElection(supabase);
        if (mounted) setElection(data);
      }
    })();
    return () => { mounted = false; };
  }, [election, setElection, supabase]);

  // Aplicar filtros padrão da eleição
  useEffect(() => {
    devLog('Mapa - defaultFilters:', defaultFilters, 'overrode:', overrode);
    if (!overrode && defaultFilters) {
      if (defaultFilters.state) {
        devLog('Aplicando filtro de estado:', defaultFilters.state);
        setSelectedUF(defaultFilters.state);
      }
      if (defaultFilters.city) {
        devLog('Aplicando filtro de cidade:', defaultFilters.city);
        setSelectedCity(defaultFilters.city);
        setSelectedCityKey(normalizeKey(defaultFilters.city));
      }
      setFiltersApplied(true);
    } else if (overrode) {
      setFiltersApplied(true);
    }
  }, [defaultFilters, overrode]);

  // Centralização/zoom (apenas 1x por navegação)
  useEffect(() => {
    if (!election || !mapRef.current || hasAppliedMapLock) return;

    const g = (window as any).google;
    if (!g?.maps) return;

    const addr =
      election.election_level === 'MUNICIPAL' && election.scope_city && election.scope_state
        ? `${election.scope_city}, ${election.scope_state}, Brasil`
        : election.election_level === 'ESTADUAL' && election.scope_state
        ? `${election.scope_state}, Brasil`
        : 'Brasil';

    const geocoder = new g.maps.Geocoder();
    geocoder.geocode({ address: addr }, (results: any, status: any) => {
      if (status === 'OK' && results?.[0]) {
        const r = results[0];
        const bounds = r.geometry.bounds ??
          new g.maps.LatLngBounds(r.geometry.location, r.geometry.location);
        mapRef.current!.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        setTimeout(() => {
          if (election.election_level === 'MUNICIPAL') mapRef.current!.setZoom(11);
          else if (election.election_level === 'ESTADUAL') mapRef.current!.setZoom(8);
          else mapRef.current!.setZoom(4);
        }, 250);
      }
      setHasAppliedMapLock(true);
    });
  }, [election, hasAppliedMapLock, setHasAppliedMapLock]);

  // Cria o mapa UMA vez
  useLayoutEffect(() => {
    if (!divRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const g = await loadGoogleMaps();
        if (cancelled || !divRef.current) return;

        gRef.current = g;
        
        // Estilo dark para o Google Maps
        const darkMapStyle = [
          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }]
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }]
          },
          {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#263c3f" }]
          },
          {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b9a76" }]
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }]
          },
          {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }]
          },
          {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#9ca5b3" }]
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }]
          },
          {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }]
          },
          {
            featureType: "road.highway",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f3d19c" }]
          },
          {
            featureType: "transit",
            elementType: "geometry",
            stylers: [{ color: "#2f3948" }]
          },
          {
            featureType: "transit.station",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }]
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }]
          },
          {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#515c6d" }]
          },
          {
            featureType: "water",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#17263c" }]
          }
        ];

        mapRef.current = new g.maps.Map(divRef.current, {
          center: { lat: -26.304, lng: -48.846 },
          zoom: 10, // Zoom menor para melhor visualização
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
          styles: isDark ? darkMapStyle : undefined
        });

        // Inicializar InfoWindow
        if (!infoRef.current) {
          infoRef.current = new g.maps.InfoWindow();
        }

        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          logger.error('Erro ao criar mapa:', e);
          setError(e?.message ?? 'Falha ao criar o mapa.');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [isDark]);

  // Carregar opções do filtro de liderança (apenas admin)
  useEffect(() => {
    if (!isAdmin) return;

    (async () => {
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from("leader_profiles")
        .select("id, status, profiles(full_name)")
        .eq("status", "ACTIVE")
        .limit(2000);

      if (error) {
        devLog("[MAP] falha ao buscar líderes p/ filtro:", error);
        setLeadersOptions([]);
        return;
      }

      const opts = (data ?? [])
        .map((r: any) => ({ id: r.id as string, name: (r.profiles?.full_name as string) ?? "Líder" }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

      setLeadersOptions(opts);
    })();
  }, [isAdmin]);

  // Carregar tags disponíveis
  useEffect(() => {
    const loadTags = async () => {
      setLoadingTags(true);
      try {
        const tags = await tagsService.getAvailableTags();
        setAvailableTags(tags);
      } catch (error) {
        logger.error('[MAP] Erro ao carregar tags:', error);
      } finally {
        setLoadingTags(false);
      }
    };

    loadTags();
  }, []);

  // Busca people + leaders e plota
  useEffect(() => {
    const g = gRef.current;
    const map = mapRef.current;
    if (!g || !map || !filtersApplied) return;

    let cancelled = false;
    if (!infoRef.current) infoRef.current = new g.maps.InfoWindow();

    async function fetchAndDraw() {
      setError(null);

      if (!supabase) return;

      // --------- PESSOAS ----------
      let peopleData: any[] = [];
      let peopleErr: any = null;

      if (selectedTags.length > 0) {
        // Usar RPC para busca com tags
        try {
          const tagIds = selectedTags.map(tag => tag.id);
          const searchResult = await tagsService.searchPeopleWithTags({ tag_ids: tagIds });
          
          // Filtrar resultados baseado nos outros filtros
          peopleData = searchResult.filter((person: any) => {
            // Filtrar coordenadas válidas
            if (!person.latitude || !person.longitude) return false;
            
            // Filtro de líder (admin only)
            if (isAdmin && selectedLeaderId !== "__all__" && person.owner_id !== selectedLeaderId) {
              return false;
            }
            
            // Filtro de posse (líder não admin)
            if (!isAdmin && person.owner_id !== authProfile?.id) {
              return false;
            }
            
            // Filtro de UF
            if (selectedUF !== "__all__") {
              const uf = selectedUF.toUpperCase();
              const est = ESTADOS_BRASIL.find(e =>
                e.sigla.toUpperCase() === uf || e.nome.toLowerCase() === selectedUF.toLowerCase()
              );
              
              if (est) {
                const stateMatch = person.state && (
                  person.state.toUpperCase().includes(est.sigla) || 
                  person.state.toLowerCase().includes(est.nome.toLowerCase())
                );
                if (!stateMatch) return false;
              } else {
                if (person.state !== selectedUF) return false;
              }
            }
            
            // Filtro de cidade
            if (selectedCityKey && person.city) {
              if (!person.city.toLowerCase().includes(selectedCityKey.toLowerCase())) {
                return false;
              }
            }
            
            // Filtro de bairro
            if (selectedNeighborhood !== "__all__" && person.neighborhood !== selectedNeighborhood) {
              return false;
            }
            
            // Filtro de status do voto
            if (selectedVoteStatus !== "__all__" && person.vote_status !== selectedVoteStatus) {
              return false;
            }
            
            return true;
          });
        } catch (error) {
          logger.error('[MAP] Erro na busca com tags:', error);
          peopleErr = error;
          peopleData = [];
        }
      } else {
        // Busca tradicional sem tags
        let peopleQuery = supabase
          .from("people")
          .select(`
            id, full_name, whatsapp, city, neighborhood, state, vote_status,
            latitude, longitude, owner_id,
            profiles:owner_id(full_name)
          `)
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .limit(5000);

        if (isAdmin) {
          if (selectedLeaderId !== "__all__") {
            peopleQuery = peopleQuery.eq("owner_id", selectedLeaderId);
          }
        } else {
          // líder logado: apenas seus contatos
          if (!authProfile?.id) return;
          peopleQuery = peopleQuery.eq("owner_id", authProfile.id);
        }

        if (selectedUF !== "__all__") {
          // Usar a mesma lógica corrigida da página de Pessoas
          const ESTADOS_BRASIL = [
            { sigla: 'SC', nome: 'Santa Catarina' },
            { sigla: 'PR', nome: 'Paraná' },
            { sigla: 'RS', nome: 'Rio Grande do Sul' }
            // ... outros estados
          ];
          
          const uf = selectedUF.toUpperCase();
          const est = ESTADOS_BRASIL.find(e =>
            e.sigla.toUpperCase() === uf || e.nome.toLowerCase() === selectedUF.toLowerCase()
          );
          
          if (est) {
            peopleQuery = peopleQuery.or(`state.ilike.%${est.sigla}%,state.ilike.%${est.nome}%`);
          } else {
            peopleQuery = peopleQuery.eq("state", selectedUF);
          }
        }
        if (selectedNeighborhood !== "__all__") peopleQuery = peopleQuery.eq("neighborhood", selectedNeighborhood);
        if (selectedVoteStatus !== "__all__") peopleQuery = peopleQuery.eq("vote_status", selectedVoteStatus);
        if (selectedCityKey) {
          // Usar ILIKE em vez de city_norm que pode não existir
          peopleQuery = peopleQuery.ilike("city", `%${selectedCityKey}%`);
        }

        const result = await peopleQuery;
        peopleData = result.data || [];
        peopleErr = result.error;
      }
      if (peopleErr) logger.error("[MAP] erro pessoas:", peopleErr);
      
      devLog("[MAP] Pessoas encontradas:", peopleData?.length || 0);
      if (peopleData && peopleData.length > 0) {
        devLog("[MAP] Primeira pessoa:", {
          nome: peopleData[0].full_name,
          cidade: peopleData[0].city,
          estado: peopleData[0].state,
          lat: peopleData[0].latitude,
          lng: peopleData[0].longitude
        });
      }

      // Mapear dados sem filtro adicional de cidade
      const people = (peopleData ?? [])
        .map((r: any) => ({
        id: r.id as string,
        full_name: r.full_name as string,
        whatsapp: r.whatsapp as string | null,
        city: r.city as string | null,
        neighborhood: r.neighborhood as string | null,
        state: r.state as string | null,
        vote_status: r.vote_status as string | null,
        leader_name: selectedTags.length > 0 ? 'Líder não disponível' : (r.profiles?.full_name as string) ?? null,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        tags: r.tags || null, // incluir tags se vieram do RPC
      }));
      
      devLog("[MAP] Pessoas mapeadas:", people.length);

      // Popular opções cascateadas (com base no dataset atual)
      if (!cancelled) {
        const cities = Array.from(new Set(people.map(p => p.city).filter(Boolean))) as string[];
        cities.sort((a, b) => a.localeCompare(b, "pt-BR"));
        setCityOptions(cities);

        // Só reseta a cidade se não foi aplicada pelo auto-filtro
        if (selectedCity !== "__all__" && !cities.includes(selectedCity) && overrode) {
          setSelectedCity("__all__");
          setSelectedCityKey("");
          setSelectedNeighborhood("__all__");
        }

        const nbs = Array.from(
          new Set(
            people
              .filter(p => selectedCity === "__all__" || p.city === selectedCity)
              .map(p => p.neighborhood)
              .filter(Boolean)
          )
        ) as string[];
        nbs.sort((a, b) => a.localeCompare(b, "pt-BR"));
        setNbOptions(nbs);

        if (selectedNeighborhood !== "__all__" && !nbs.includes(selectedNeighborhood)) {
          setSelectedNeighborhood("__all__");
        }
      }

      // --------- LÍDERES (apenas admin) ----------
      let leaders: any[] = [];
      if (isAdmin) {
        let leadersQuery = supabase
          .from("leader_profiles")
          .select("id, latitude, longitude, status, email, phone, city, neighborhood, state, profiles(full_name)")
          .eq("status", "ACTIVE")
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .limit(5000);

        if (selectedLeaderId !== "__all__") leadersQuery = leadersQuery.eq("id", selectedLeaderId);
        if (selectedUF !== "__all__") {
          // Buscar por UF ou nome completo do estado (mesmo problema das pessoas)
          const estado = ESTADOS_BRASIL.find(est => est.sigla === selectedUF);
          if (estado) {
            leadersQuery = leadersQuery.or(`state.ilike.%${estado.sigla}%,state.ilike.%${estado.nome}%`);
          }
        }
        if (selectedNeighborhood !== "__all__") leadersQuery = leadersQuery.eq("neighborhood", selectedNeighborhood);
        if (selectedCityKey) leadersQuery = leadersQuery.ilike("city", `%${selectedCityKey}%`);

        const { data: leadersRaw, error: leadersErr } = await leadersQuery;
        if (leadersErr) logger.error("[MAP] erro leaders:", leadersErr);

        // Mapear dados sem filtro adicional de cidade
        leaders = (leadersRaw ?? [])
          .map((r: any) => ({
          id: r.id as string,
          name: (r.profiles?.full_name as string) ?? "Líder",
          email: r.email as string | null,
          phone: r.phone as string | null,
          city: r.city as string | null,
          neighborhood: r.neighborhood as string | null,
          state: r.state as string | null,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
        }));
      }

      if (cancelled) return;

      // --------- DESENHAR ----------
      peopleMarkersRef.current.forEach(m => m.setMap(null));
      leaderMarkersRef.current.forEach(m => m.setMap(null));
      peopleMarkersRef.current = [];
      leaderMarkersRef.current = [];


      // Pessoas (azul)
      const pMarkers = people.map(p => {
        const marker = new g.maps.Marker({
          position: { lat: p.latitude, lng: p.longitude },
          title: p.leader_name ? `${p.full_name} — Líder: ${p.leader_name}` : p.full_name,
          icon: personIcon(g),
          map,
        });
        marker.addListener("click", () => {
          const reactInfoWindow = createReactInfoWindow(g, <PersonPopup person={p} />);
          reactInfoWindow.open({ anchor: marker, map });
        });
        return marker;
      });

      // Lideranças (verde) — só admin
      const lMarkers = leaders.map(l => {
        const marker = new g.maps.Marker({
          position: { lat: l.latitude, lng: l.longitude },
          title: `Liderança: ${l.name}`,
          icon: leaderIcon(g),
          zIndex: 2,
          map,
        });
        marker.addListener("click", () => {
          const reactInfoWindow = createReactInfoWindow(g, <LeaderPopup leader={l} />);
          reactInfoWindow.open({ anchor: marker, map });
        });
        return marker;
      });

      peopleMarkersRef.current = pMarkers;
      leaderMarkersRef.current = lMarkers;
      setTotals({ people: pMarkers.length, leaders: lMarkers.length });

      // Bounds
      const all = [...pMarkers, ...lMarkers];
      if (all.length) {
        const bounds = new g.maps.LatLngBounds();
        all.forEach(m => {
          const pos = m.getPosition();
          if (pos) bounds.extend(pos);
        });
        // Ajustar bounds com padding para melhor visualização
        map?.fitBounds(bounds, { 
          top: 50, 
          right: 50, 
          bottom: 50, 
          left: 50 
        });
      } else {
        map?.setCenter({ lat: -26.304, lng: -48.846 });
        map?.setZoom(10); // Zoom menor quando não há marcadores
      }
    }

    fetchAndDraw().catch(err => {
      logger.error("Erro ao carregar dados do mapa:", err);
      setError("Falha ao carregar dados do mapa.");
    });

    return () => { cancelled = true; };
  }, [
    isAdmin,
    authProfile?.id,
    selectedLeaderId,
    selectedUF,
    selectedCity,
    selectedCityKey,
    selectedNeighborhood,
    selectedVoteStatus,
    selectedTags,
    tagMode,
    filtersApplied,
  ]);

  const total = totals.people + totals.leaders;

  // Handlers para tags
  const handleTagsChange = (tags: Tag[]) => {
    setSelectedTags(tags);
  };

  const handleTagModeChange = (mode: 'ANY' | 'ALL') => {
    setTagMode(mode);
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedUF("__all__");
    setSelectedCity("__all__");
    setSelectedCityKey("");
    setSelectedNeighborhood("__all__");
    setSelectedVoteStatus("__all__");
    if (isAdmin) {
      setSelectedLeaderId("__all__");
    }
    setOverrode(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        profile={profile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      <div className="flex">
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="flex-1 overflow-x-hidden">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mapa</h1>
                <p className="text-gray-600 dark:text-gray-400">Visualização geográfica de pessoas e lideranças</p>
              </div>
            </div>

            {/* Filtro por Tags */}
            <div className="mb-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <TagFilter
                    availableTags={availableTags}
                    selectedTags={selectedTags}
                    onTagsChange={handleTagsChange}
                    mode={tagMode}
                    onModeChange={handleTagModeChange}
                    loading={loadingTags}
                  />
                </div>
                <div className="flex items-end">
                  {(selectedTags.length > 0 || selectedUF !== "__all__" || selectedCity !== "__all__" || selectedNeighborhood !== "__all__" || selectedVoteStatus !== "__all__" || (isAdmin && selectedLeaderId !== "__all__")) && (
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Limpar todos os filtros
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Total de marcadores: {totals.people + totals.leaders}{" "}
                <span className="opacity-70">
                  ({totals.people} pessoas{isAdmin ? `, ${totals.leaders} lideranças` : ""})
                </span>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                {/* UF */}
                <label className="text-sm text-slate-600 dark:text-slate-400">UF:</label>
                <select
                  className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={selectedUF}
                  onChange={(e) => { 
                    setSelectedUF(e.target.value); 
                    setSelectedCity("__all__"); 
                    setSelectedNeighborhood("__all__"); 
                    setOverrode(true);
                  }}
                >
                  <option value="__all__">Todas</option>
                  {["SC","PR","RS","SP","RJ","MG","ES","BA","PE","CE","DF","GO","MT","MS","TO","PA","AM","RO","AC","RR","AP","MA","PI","RN","PB","AL","SE"].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>

                {/* Cidade */}
                <label className="text-sm text-slate-600 dark:text-slate-400">Cidade:</label>
                <select
                  className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={selectedCityKey || ""}
                  onChange={(e) => { 
                    const cityKey = e.target.value;
                    const cityName = cityKey ? cityOptions.find(c => normalizeKey(c) === cityKey) || "" : "__all__";
                    setSelectedCityKey(cityKey);
                    setSelectedCity(cityName);
                    setSelectedNeighborhood("__all__"); 
                    setOverrode(true);
                  }}
                  disabled={cityOptions.length === 0}
                >
                  <option value="">Todas</option>
                  {cityOptions.map(c => (
                    <option key={normalizeKey(c)} value={normalizeKey(c)}>{c}</option>
                  ))}
                </select>

                {/* Bairro */}
                <label className="text-sm text-slate-600 dark:text-slate-400">Bairro:</label>
                <select
                  className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={selectedNeighborhood}
                  onChange={(e) => setSelectedNeighborhood(e.target.value)}
                  disabled={nbOptions.length === 0}
                >
                  <option value="__all__">Todos</option>
                  {nbOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>

                {/* Status do Voto */}
                <label className="text-sm text-slate-600 dark:text-slate-400">Status:</label>
                <select
                  className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={selectedVoteStatus}
                  onChange={(e) => setSelectedVoteStatus(e.target.value)}
                >
                  <option value="__all__">Todos</option>
                  <option value="CONFIRMADO">Confirmado</option>
                  <option value="PROVAVEL">Provável</option>
                  <option value="INDEFINIDO">Indefinido</option>
                </select>

                {/* Filtrar por liderança — APENAS ADMIN */}
                {isAdmin && (
                  <>
                    <label className="text-sm text-slate-600 dark:text-slate-400">Filtrar por liderança:</label>
                    <select
                      className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      value={selectedLeaderId}
                      onChange={(e) => setSelectedLeaderId(e.target.value)}
                    >
                      <option value="__all__">Todas as lideranças</option>
                      {leadersOptions.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>

            <div ref={divRef} className="w-full h-[75vh] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" />

            {loading && <div className="mt-3 text-gray-600 dark:text-gray-400">Carregando mapa…</div>}
            {!loading && error && <div className="mt-3 text-red-600 dark:text-red-400">{error}</div>}
            {!loading && !error && total === 0 && (
              <div className="mt-3 text-gray-500 dark:text-gray-400">Nenhum marcador encontrado.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}