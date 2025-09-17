import { useState, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false
  });

  const getCurrentPosition = useCallback((options?: GeolocationOptions) => {
    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = 'Geolocalização não é suportada por este navegador';
        setState(prev => ({ ...prev, error, loading: false }));
        reject(new Error(error));
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      const defaultOptions: GeolocationOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutos
        ...options
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setState({
            latitude,
            longitude,
            error: null,
            loading: false
          });
          resolve({ latitude, longitude });
        },
        (error) => {
          let errorMessage = 'Erro ao obter localização';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permissão de localização negada. Por favor, permita o acesso à localização.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Localização indisponível.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tempo limite excedido ao obter localização.';
              break;
            default:
              errorMessage = 'Erro desconhecido ao obter localização.';
              break;
          }

          setState(prev => ({ ...prev, error: errorMessage, loading: false }));
          reject(new Error(errorMessage));
        },
        defaultOptions
      );
    });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    getCurrentPosition,
    clearError
  };
}

