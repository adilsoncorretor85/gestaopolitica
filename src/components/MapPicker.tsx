// src/components/MapPicker.tsx
import { useEffect, useRef, useState } from 'react';
import { X, MapPin, Loader2, Navigation } from 'lucide-react';
import { loadGoogleMaps } from '@/lib/googleMaps';
import { useThemeContext } from '@/components/ThemeProvider';
import { useGeolocation } from '@/hooks/useGeolocation';

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
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { isDark } = useThemeContext();
  const { getCurrentPosition, clearError } = useGeolocation();

  // Função para usar a localização atual
  const handleUseCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      setLocationError(null);
      clearError();

      // Obter coordenadas atuais
      const { latitude, longitude } = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutos
      });

      // Centralizar o mapa na localização atual
      if (map && marker) {
        const newPosition = { lat: latitude, lng: longitude };
        map.setCenter(newPosition);
        map.setZoom(16);
        marker.setPosition(newPosition);
      }
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      setLocationError(error instanceof Error ? error.message : 'Erro ao obter localização');
    } finally {
      setIsGettingLocation(false);
    }
  };

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

        const m = new g.maps.Map(ref.current as HTMLDivElement, {
          center, 
          zoom: initialCoords ? 16 : 13,
          mapTypeControl: false, 
          streetViewControl: false, 
          fullscreenControl: false,
          styles: isDark ? darkMapStyle : undefined
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
  }, [open, isDark]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-3xl shadow-xl">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4"/> Definir localização
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X/>
          </button>
        </div>
        <div className="p-0">
          {loading && (
            <div className="p-8 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin"/> Carregando mapa...
            </div>
          )}

          {/* Só mostra erro se ainda não conseguiu instanciar o mapa */}
          {!loading && !map && error && (
            <div className="p-6 text-red-600 dark:text-red-400">{error}</div>
          )}

          {/* Mensagem de erro da localização */}
          {locationError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400">
              <p className="text-sm text-red-600 dark:text-red-400">{locationError}</p>
            </div>
          )}

          <div ref={ref} style={{ height: 480, display: map ? 'block' : 'none' }} />
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-between">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isGettingLocation || !map}
            className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isGettingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            Puxar localização atual
          </button>
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                const pos = marker?.getPosition();
                if (!pos) return;
                onConfirm({ lat: pos.lat(), lng: pos.lng() });
                onClose();
              }}
              className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!marker}
            >
              Salvar posição
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
