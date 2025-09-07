// src/components/MapPicker.tsx
import { useEffect, useRef, useState } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { loadGoogleMaps } from '@/lib/googleMaps';

type Props = {
  open: boolean;
  onClose: () => void;
  initialCoords?: { lat: number; lng: number } | null;
  initialAddress?: any;
  onConfirm: (coords: { lat: number; lng: number }) => void;
};

export default function MapPicker({ open, onClose, initialCoords, onConfirm }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);

  // reset ao abrir
  useEffect(() => {
    if (!open) return;
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
        const m = new g.maps.Map(ref.current as HTMLDivElement, {
          center, zoom: initialCoords ? 16 : 13,
          mapTypeControl: false, streetViewControl: false, fullscreenControl: false
        });
        setMap(m);

        const mk = new g.maps.Marker({ position: center, map: m, draggable: true });
        setMarker(mk);

        m.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          mk.setPosition(e.latLng);
        });

        setLoading(false);
      } catch (e: any) {
        console.error('[MAPS] load failed', e);
        setError(e?.message || 'Falha ao carregar Google Maps. Verifique sua VITE_GOOGLE_MAPS_API_KEY.');
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-xl">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4"/> Definir localização</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded"><X/></button>
        </div>
        <div className="p-0">
          {loading && (
            <div className="p-8 flex items-center justify-center gap-2 text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin"/> Carregando mapa...
            </div>
          )}

          {/* Só mostra erro se ainda não conseguiu instanciar o mapa */}
          {!loading && !map && error && (
            <div className="p-6 text-red-600">{error}</div>
          )}

          <div ref={ref} style={{ height: 480, display: map ? 'block' : 'none' }} />
        </div>
        <div className="p-4 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded border">Cancelar</button>
          <button
            onClick={() => {
              const pos = marker?.getPosition();
              if (!pos) return;
              onConfirm({ lat: pos.lat(), lng: pos.lng() });
              onClose();
            }}
            className="px-3 py-2 rounded bg-blue-600 text-white"
            disabled={!marker}
          >
            Salvar posição
          </button>
        </div>
      </div>
    </div>
  );
}
