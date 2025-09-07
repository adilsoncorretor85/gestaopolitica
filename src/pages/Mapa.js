import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { loadGoogleMaps } from '@/lib/googleMaps';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import useAuth from '@/hooks/useAuth';
const personIcon = (_g) => ({
    path: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z',
    fillColor: '#3B82F6',
    fillOpacity: 1,
    strokeWeight: 0,
    scale: 1.3,
    anchor: new google.maps.Point(12, 12),
});
const leaderIcon = (_g) => ({
    path: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z',
    fillColor: '#10B981',
    fillOpacity: 1,
    strokeWeight: 0,
    scale: 1.3,
    anchor: new google.maps.Point(12, 12),
});
const personInfoHtml = (person) => `
  <div class="p-3">
    <h3 class="font-semibold text-lg">${person.full_name}</h3>
    <div class="mt-2 space-y-1 text-sm">
      ${person.whatsapp ? `<p><strong>WhatsApp:</strong> ${person.whatsapp}</p>` : ''}
      ${person.city ? `<p><strong>Cidade:</strong> ${person.city}</p>` : ''}
      ${person.neighborhood ? `<p><strong>Bairro:</strong> ${person.neighborhood}</p>` : ''}
      ${person.state ? `<p><strong>UF:</strong> ${person.state}</p>` : ''}
      ${person.vote_status ? `<p><strong>Status do voto:</strong> ${person.vote_status}</p>` : ''}
      ${person.leader_name ? `<p><strong>Líder:</strong> ${person.leader_name}</p>` : ''}
    </div>
    <div class="mt-3">
      <a href="/pessoas/${person.id}" class="text-blue-600 hover:text-blue-800 text-sm">Editar</a>
    </div>
  </div>
`;
const leaderInfoHtml = (leader) => `
  <div class="p-3">
    <h3 class="font-semibold text-lg">${leader.name}</h3>
    <div class="mt-2 space-y-1 text-sm">
      ${leader.email ? `<p><strong>Email:</strong> ${leader.email}</p>` : ''}
      ${leader.phone ? `<p><strong>Telefone:</strong> ${leader.phone}</p>` : ''}
      ${leader.city ? `<p><strong>Cidade:</strong> ${leader.city}</p>` : ''}
      ${leader.neighborhood ? `<p><strong>Bairro:</strong> ${leader.neighborhood}</p>` : ''}
      ${leader.state ? `<p><strong>UF:</strong> ${leader.state}</p>` : ''}
    </div>
    <div class="mt-3">
      <a href="/lideres/${leader.id}" class="text-blue-600 hover:text-blue-800 text-sm">Editar</a>
    </div>
  </div>
`;
export default function Mapa() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('mapa');
    const { profile: authProfile, isAdmin } = useAuth();
    // Converter o profile do useAuth para o tipo esperado pelo Header
    const profile = authProfile ? {
        id: authProfile.id,
        role: authProfile.role || 'LEADER',
        full_name: authProfile.full_name || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    } : undefined;
    const divRef = useRef(null);
    const mapRef = useRef(null);
    const gRef = useRef(null);
    const peopleMarkersRef = useRef([]);
    const leaderMarkersRef = useRef([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totals, setTotals] = useState({ people: 0, leaders: 0 });
    // filtros
    const [selectedLeaderId, setSelectedLeaderId] = useState("__all__"); // só admin usa
    const [leadersOptions, setLeadersOptions] = useState([]);
    const [selectedUF, setSelectedUF] = useState("__all__");
    const [selectedCity, setSelectedCity] = useState("__all__");
    const [selectedNeighborhood, setSelectedNeighborhood] = useState("__all__");
    const [selectedVoteStatus, setSelectedVoteStatus] = useState("__all__");
    const [cityOptions, setCityOptions] = useState([]);
    const [nbOptions, setNbOptions] = useState([]);
    // InfoWindow único
    const infoRef = useRef(null);
    // Cria o mapa UMA vez
    useLayoutEffect(() => {
        if (!divRef.current || mapRef.current)
            return;
        let cancelled = false;
        (async () => {
            try {
                const g = await loadGoogleMaps();
                if (cancelled || !divRef.current)
                    return;
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
            }
            catch (e) {
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
        if (!isAdmin)
            return;
        (async () => {
            if (!supabase)
                return;
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
                .map((r) => ({ id: r.id, name: r.profiles?.full_name ?? "Líder" }))
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
            setLeadersOptions(opts);
        })();
    }, [isAdmin]);
    // Busca people + leaders e plota
    useEffect(() => {
        const g = gRef.current;
        const map = mapRef.current;
        if (!g || !map)
            return;
        let cancelled = false;
        if (!infoRef.current)
            infoRef.current = new g.maps.InfoWindow();
        async function fetchAndDraw() {
            setError(null);
            if (!supabase)
                return;
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
            }
            else {
                // líder logado: apenas seus contatos
                if (!authProfile?.id)
                    return;
                peopleQuery = peopleQuery.eq("owner_id", authProfile.id);
            }
            if (selectedUF !== "__all__")
                peopleQuery = peopleQuery.eq("state", selectedUF);
            if (selectedCity !== "__all__")
                peopleQuery = peopleQuery.eq("city", selectedCity);
            if (selectedNeighborhood !== "__all__")
                peopleQuery = peopleQuery.eq("neighborhood", selectedNeighborhood);
            if (selectedVoteStatus !== "__all__")
                peopleQuery = peopleQuery.eq("vote_status", selectedVoteStatus);
            const { data: peopleData, error: peopleErr } = await peopleQuery;
            if (peopleErr)
                console.error("[MAP] erro pessoas:", peopleErr);
            const people = (peopleData ?? []).map((r) => ({
                id: r.id,
                full_name: r.full_name,
                whatsapp: r.whatsapp,
                city: r.city,
                neighborhood: r.neighborhood,
                state: r.state,
                vote_status: r.vote_status,
                leader_name: r.profiles?.full_name ?? null,
                latitude: Number(r.latitude),
                longitude: Number(r.longitude),
            }));
            // Popular opções cascateadas (com base no dataset atual)
            if (!cancelled) {
                const cities = Array.from(new Set(people.map(p => p.city).filter(Boolean)));
                cities.sort((a, b) => a.localeCompare(b, "pt-BR"));
                setCityOptions(cities);
                if (selectedCity !== "__all__" && !cities.includes(selectedCity)) {
                    setSelectedCity("__all__");
                    setSelectedNeighborhood("__all__");
                }
                const nbs = Array.from(new Set(people
                    .filter(p => selectedCity === "__all__" || p.city === selectedCity)
                    .map(p => p.neighborhood)
                    .filter(Boolean)));
                nbs.sort((a, b) => a.localeCompare(b, "pt-BR"));
                setNbOptions(nbs);
                if (selectedNeighborhood !== "__all__" && !nbs.includes(selectedNeighborhood)) {
                    setSelectedNeighborhood("__all__");
                }
            }
            // --------- LÍDERES (apenas admin) ----------
            let leaders = [];
            if (isAdmin) {
                let leadersQuery = supabase
                    .from("leader_profiles")
                    .select("id, latitude, longitude, status, email, phone, city, neighborhood, state, profiles(full_name)")
                    .eq("status", "ACTIVE")
                    .not("latitude", "is", null)
                    .not("longitude", "is", null)
                    .limit(5000);
                if (selectedLeaderId !== "__all__")
                    leadersQuery = leadersQuery.eq("id", selectedLeaderId);
                if (selectedUF !== "__all__")
                    leadersQuery = leadersQuery.eq("state", selectedUF);
                if (selectedCity !== "__all__")
                    leadersQuery = leadersQuery.eq("city", selectedCity);
                if (selectedNeighborhood !== "__all__")
                    leadersQuery = leadersQuery.eq("neighborhood", selectedNeighborhood);
                const { data: leadersRaw, error: leadersErr } = await leadersQuery;
                if (leadersErr)
                    console.error("[MAP] erro leaders:", leadersErr);
                leaders = (leadersRaw ?? []).map((r) => ({
                    id: r.id,
                    name: r.profiles?.full_name ?? "Líder",
                    email: r.email,
                    phone: r.phone,
                    city: r.city,
                    neighborhood: r.neighborhood,
                    state: r.state,
                    latitude: Number(r.latitude),
                    longitude: Number(r.longitude),
                }));
            }
            if (cancelled)
                return;
            // --------- DESENHAR ----------
            peopleMarkersRef.current.forEach(m => m.setMap(null));
            leaderMarkersRef.current.forEach(m => m.setMap(null));
            peopleMarkersRef.current = [];
            leaderMarkersRef.current = [];
            const info = infoRef.current;
            // Pessoas (azul)
            const pMarkers = people.map(p => {
                const marker = new g.maps.Marker({
                    position: { lat: p.latitude, lng: p.longitude },
                    title: p.leader_name ? `${p.full_name} — Líder: ${p.leader_name}` : p.full_name,
                    icon: personIcon(g),
                    map,
                });
                marker.addListener("click", () => {
                    info.setContent(personInfoHtml(p));
                    info.open({ anchor: marker, map });
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
                    info.setContent(leaderInfoHtml(l));
                    info.open({ anchor: marker, map });
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
                    if (pos)
                        bounds.extend(pos);
                });
                map?.fitBounds(bounds);
            }
            else {
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
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900", children: [_jsx(Header, { profile: profile, sidebarOpen: sidebarOpen, setSidebarOpen: setSidebarOpen }), _jsxs("div", { className: "flex", children: [_jsx(Sidebar, { activeTab: activeTab, setActiveTab: setActiveTab, isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsx("main", { className: "flex-1 overflow-x-hidden", children: _jsxs("div", { className: "p-6 space-y-6", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Mapa" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Visualiza\u00E7\u00E3o geogr\u00E1fica de pessoas e lideran\u00E7as" })] }) }), _jsxs("div", { className: "mb-3 flex flex-wrap items-center gap-3", children: [_jsxs("div", { className: "text-sm text-slate-600 dark:text-slate-400", children: ["Total de marcadores: ", totals.people + totals.leaders, " ", _jsxs("span", { className: "opacity-70", children: ["(", totals.people, " pessoas", isAdmin ? `, ${totals.leaders} lideranças` : "", ")"] })] }), _jsxs("div", { className: "ml-auto flex flex-wrap items-center gap-2", children: [_jsx("label", { className: "text-sm text-slate-600 dark:text-slate-400", children: "UF:" }), _jsxs("select", { className: "rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white", value: selectedUF, onChange: (e) => { setSelectedUF(e.target.value); setSelectedCity("__all__"); setSelectedNeighborhood("__all__"); }, children: [_jsx("option", { value: "__all__", children: "Todas" }), ["SC", "PR", "RS", "SP", "RJ", "MG", "ES", "BA", "PE", "CE", "DF", "GO", "MT", "MS", "TO", "PA", "AM", "RO", "AC", "RR", "AP", "MA", "PI", "RN", "PB", "AL", "SE"].map(uf => (_jsx("option", { value: uf, children: uf }, uf)))] }), _jsx("label", { className: "text-sm text-slate-600 dark:text-slate-400", children: "Cidade:" }), _jsxs("select", { className: "rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white", value: selectedCity, onChange: (e) => { setSelectedCity(e.target.value); setSelectedNeighborhood("__all__"); }, disabled: cityOptions.length === 0, children: [_jsx("option", { value: "__all__", children: "Todas" }), cityOptions.map(c => _jsx("option", { value: c, children: c }, c))] }), _jsx("label", { className: "text-sm text-slate-600 dark:text-slate-400", children: "Bairro:" }), _jsxs("select", { className: "rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white", value: selectedNeighborhood, onChange: (e) => setSelectedNeighborhood(e.target.value), disabled: nbOptions.length === 0, children: [_jsx("option", { value: "__all__", children: "Todos" }), nbOptions.map(n => _jsx("option", { value: n, children: n }, n))] }), _jsx("label", { className: "text-sm text-slate-600 dark:text-slate-400", children: "Status:" }), _jsxs("select", { className: "rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white", value: selectedVoteStatus, onChange: (e) => setSelectedVoteStatus(e.target.value), children: [_jsx("option", { value: "__all__", children: "Todos" }), _jsx("option", { value: "CONFIRMADO", children: "Confirmado" }), _jsx("option", { value: "PROVAVEL", children: "Prov\u00E1vel" }), _jsx("option", { value: "INDEFINIDO", children: "Indefinido" })] }), isAdmin && (_jsxs(_Fragment, { children: [_jsx("label", { className: "text-sm text-slate-600 dark:text-slate-400", children: "Filtrar por lideran\u00E7a:" }), _jsxs("select", { className: "rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white", value: selectedLeaderId, onChange: (e) => setSelectedLeaderId(e.target.value), children: [_jsx("option", { value: "__all__", children: "Todas as lideran\u00E7as" }), leadersOptions.map(l => (_jsx("option", { value: l.id, children: l.name }, l.id)))] })] }))] })] }), _jsx("div", { ref: divRef, className: "w-full h-[75vh] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" }), loading && _jsx("div", { className: "mt-3 text-gray-600 dark:text-gray-400", children: "Carregando mapa\u2026" }), !loading && error && _jsx("div", { className: "mt-3 text-red-600 dark:text-red-400", children: error }), !loading && !error && total === 0 && (_jsx("div", { className: "mt-3 text-gray-500 dark:text-gray-400", children: "Nenhum marcador encontrado." }))] }) })] })] }));
}
