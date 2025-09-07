// src/lib/googleMaps.ts
import { Loader } from '@googlemaps/js-api-loader';
// Retorna uma única Promise compartilhada para toda a app
export function loadGoogleMaps() {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('window undefined'));
    }
    if (window.__gmapsPromise)
        return window.__gmapsPromise;
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY ausente'));
    }
    const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places'],
    });
    window.__gmapsPromise = loader.load();
    return window.__gmapsPromise;
}
