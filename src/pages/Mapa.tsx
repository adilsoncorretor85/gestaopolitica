import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '@/lib/supabaseClient';
import { loadGoogleMaps } from '@/lib/googleMaps';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import useAuth from '@/hooks/useAuth';
import { useElection } from '@/contexts/ElectionContext';
import { Profile } from '@/types';

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
    </div>
    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
      <a 
        href={`/pessoas/${person.id}`} 
        className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
      >
        Editar
      </a>
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
  
  // Converter o profile do useAuth para o tipo esperado pelo Header
  const profile: Profile | undefined = authProfile ? {
    id: authProfile.id,
    role: authProfile.role || 'LEADER',
    full_name: authProfile.full_name || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
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
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("__all__");
  const [selectedVoteStatus, setSelectedVoteStatus] = useState<string>("__all__");
  const [overrode, setOverrode] = useState(false);

  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [nbOptions, setNbOptions] = useState<string[]>([]);

  // InfoWindow único
  const infoRef = useRef<any>(null);

  // Aplicar filtros padrão da eleição
  useEffect(() => {
    console.log('Mapa - defaultFilters:', defaultFilters, 'overrode:', overrode);
    if (!overrode && defaultFilters) {
      if (defaultFilters.state) {
        console.log('Aplicando filtro de estado:', defaultFilters.state);
        setSelectedUF(defaultFilters.state);
      }
      if (defaultFilters.city) {
        console.log('Aplicando filtro de cidade:', defaultFilters.city);
        setSelectedCity(defaultFilters.city);
      }
    }
  }, [defaultFilters, overrode]);

  // Cria o mapa UMA vez
  useLayoutEffect(() => {
    if (!divRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const g = await loadGoogleMaps();
        if (cancelled || !divRef.current) return;

        gRef.current = g;
        mapRef.current = new g.maps.Map(divRef.current, {
          center: { lat: -26.304, lng: -48.846 },
          zoom: 12,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
        });

        // Inicializar InfoWindow
        if (!infoRef.current) {
          infoRef.current = new g.maps.InfoWindow();
        }

        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          console.error('Erro ao criar mapa:', e);
          setError(e?.message ?? 'Falha ao criar o mapa.');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

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
        console.warn("[MAP] falha ao buscar líderes p/ filtro:", error);
        setLeadersOptions([]);
        return;
      }

      const opts = (data ?? [])
        .map((r: any) => ({ id: r.id as string, name: (r.profiles?.full_name as string) ?? "Líder" }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

      setLeadersOptions(opts);
    })();
  }, [isAdmin]);

  // Busca people + leaders e plota
  useEffect(() => {
    const g = gRef.current;
    const map = mapRef.current;
    if (!g || !map) return;

    let cancelled = false;
    if (!infoRef.current) infoRef.current = new g.maps.InfoWindow();

    async function fetchAndDraw() {
      setError(null);

      if (!supabase) return;

      // --------- PESSOAS ----------
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

      if (selectedUF !== "__all__") peopleQuery = peopleQuery.eq("state", selectedUF);
      if (selectedCity !== "__all__") peopleQuery = peopleQuery.eq("city", selectedCity);
      if (selectedNeighborhood !== "__all__") peopleQuery = peopleQuery.eq("neighborhood", selectedNeighborhood);
      if (selectedVoteStatus !== "__all__") peopleQuery = peopleQuery.eq("vote_status", selectedVoteStatus);

      const { data: peopleData, error: peopleErr } = await peopleQuery;
      if (peopleErr) console.error("[MAP] erro pessoas:", peopleErr);

      const people = (peopleData ?? []).map((r: any) => ({
        id: r.id as string,
        full_name: r.full_name as string,
        whatsapp: r.whatsapp as string | null,
        city: r.city as string | null,
        neighborhood: r.neighborhood as string | null,
        state: r.state as string | null,
        vote_status: r.vote_status as string | null,
        leader_name: (r.profiles?.full_name as string) ?? null,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
      }));

      // Popular opções cascateadas (com base no dataset atual)
      if (!cancelled) {
        const cities = Array.from(new Set(people.map(p => p.city).filter(Boolean))) as string[];
        cities.sort((a, b) => a.localeCompare(b, "pt-BR"));
        setCityOptions(cities);

        if (selectedCity !== "__all__" && !cities.includes(selectedCity)) {
          setSelectedCity("__all__");
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
        if (selectedUF !== "__all__") leadersQuery = leadersQuery.eq("state", selectedUF);
        if (selectedCity !== "__all__") leadersQuery = leadersQuery.eq("city", selectedCity);
        if (selectedNeighborhood !== "__all__") leadersQuery = leadersQuery.eq("neighborhood", selectedNeighborhood);

        const { data: leadersRaw, error: leadersErr } = await leadersQuery;
        if (leadersErr) console.error("[MAP] erro leaders:", leadersErr);

        leaders = (leadersRaw ?? []).map((r: any) => ({
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
        map?.fitBounds(bounds);
      } else {
        map?.setCenter({ lat: -26.304, lng: -48.846 });
        map?.setZoom(12);
      }
    }

    fetchAndDraw().catch(err => {
      console.error("Erro ao carregar dados do mapa:", err);
      setError("Falha ao carregar dados do mapa.");
    });

    return () => { cancelled = true; };
  }, [
    isAdmin,
    authProfile?.id,
    selectedLeaderId,
    selectedUF,
    selectedCity,
    selectedNeighborhood,
    selectedVoteStatus,
  ]);

  const total = totals.people + totals.leaders;

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
                  value={selectedCity}
                  onChange={(e) => { 
                    setSelectedCity(e.target.value); 
                    setSelectedNeighborhood("__all__"); 
                    setOverrode(true);
                  }}
                  disabled={cityOptions.length === 0}
                >
                  <option value="__all__">Todas</option>
                  {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
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