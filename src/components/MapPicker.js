import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/MapPicker.tsx
import { useEffect, useRef, useState } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { loadGoogleMaps } from '@/lib/googleMaps';
export default function MapPicker({ open, onClose, initialCoords, onConfirm }) {
    const ref = useRef(null);
    const [loading, setLoading] = useState(false);
    const [map, setMap] = useState(null);
    const [marker, setMarker] = useState(null);
    const [error, setError] = useState(null);
    // reset ao abrir
    useEffect(() => {
        if (!open)
            return;
        setError(null);
        setLoading(true);
        (async () => {
            try {
                const g = await loadGoogleMaps();
                // se já existir um mapa antigo, limpa
                if (map) {
                    setMap(null);
                    setMarker(null);
                }
                const center = initialCoords ?? { lat: -27.5954, lng: -48.5480 };
                const m = new g.maps.Map(ref.current, {
                    center, zoom: initialCoords ? 16 : 13,
                    mapTypeControl: false, streetViewControl: false, fullscreenControl: false
                });
                setMap(m);
                const mk = new g.maps.Marker({ position: center, map: m, draggable: true });
                setMarker(mk);
                m.addListener('click', (e) => {
                    if (!e.latLng)
                        return;
                    mk.setPosition(e.latLng);
                });
                setLoading(false);
            }
            catch (e) {
                console.error('[MAPS] load failed', e);
                setError(e?.message || 'Falha ao carregar Google Maps. Verifique sua VITE_GOOGLE_MAPS_API_KEY.');
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40", children: _jsxs("div", { className: "bg-white rounded-xl w-full max-w-3xl shadow-xl", children: [_jsxs("div", { className: "p-3 border-b flex items-center justify-between", children: [_jsxs("h2", { className: "font-semibold flex items-center gap-2", children: [_jsx(MapPin, { className: "w-4 h-4" }), " Definir localiza\u00E7\u00E3o"] }), _jsx("button", { onClick: onClose, className: "p-2 hover:bg-black/5 rounded", children: _jsx(X, {}) })] }), _jsxs("div", { className: "p-0", children: [loading && (_jsxs("div", { className: "p-8 flex items-center justify-center gap-2 text-gray-600", children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), " Carregando mapa..."] })), !loading && !map && error && (_jsx("div", { className: "p-6 text-red-600", children: error })), _jsx("div", { ref: ref, style: { height: 480, display: map ? 'block' : 'none' } })] }), _jsxs("div", { className: "p-4 border-t flex gap-3 justify-end", children: [_jsx("button", { onClick: onClose, className: "px-3 py-2 rounded border", children: "Cancelar" }), _jsx("button", { onClick: () => {
                                const pos = marker?.getPosition();
                                if (!pos)
                                    return;
                                onConfirm({ lat: pos.lat(), lng: pos.lng() });
                                onClose();
                            }, className: "px-3 py-2 rounded bg-blue-600 text-white", disabled: !marker, children: "Salvar posi\u00E7\u00E3o" })] })] }) }));
}
