import { devLog } from '@/lib/logger';
import { loadGoogleMaps } from '@/lib/googleMaps';
import type { AddressParts } from '@/components/AddressAutocomplete';

/**
 * Converte coordenadas (lat, lng) em endereço usando Google Geocoding API
 */
export async function reverseGeocode(
  latitude: number, 
  longitude: number
): Promise<AddressParts | null> {
  try {
    const google = await loadGoogleMaps();
    
    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve, reject) => {
      geocoder.geocode(
        { location: { lat: latitude, lng: longitude } },
        (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            const result = results[0];
            
            // Parsear componentes do endereço
            const addressParts = parseAddressComponents(result.address_components || []);
            
            // Adicionar coordenadas e endereço formatado
            addressParts.latitude = latitude;
            addressParts.longitude = longitude;
            addressParts.formatted = result.formatted_address || '';
            
            resolve(addressParts);
          } else {
            console.error('Erro no reverse geocoding:', status);
            reject(new Error(`Erro ao converter coordenadas em endereço: ${status}`));
          }
        }
      );
    });
  } catch (error) {
    console.error('Erro ao fazer reverse geocoding:', error);
    throw error;
  }
}

/**
 * Converte endereço em coordenadas usando Google Geocoding API
 */
export async function geocodeAddress(address: {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
}): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const google = await loadGoogleMaps();
    
    const geocoder = new google.maps.Geocoder();
    
    // Construir endereço completo
    const addressParts = [];
    if (address.street) addressParts.push(address.street);
    if (address.number) addressParts.push(address.number);
    if (address.neighborhood) addressParts.push(address.neighborhood);
    if (address.city) addressParts.push(address.city);
    if (address.state) addressParts.push(address.state);
    if (address.cep) addressParts.push(address.cep);
    
    const fullAddress = addressParts.join(', ');
    
    if (!fullAddress.trim()) {
      devLog('Endereço vazio fornecido para geocoding');
      return null;
    }
    
    return new Promise((resolve, reject) => {
      geocoder.geocode(
        { address: fullAddress },
        (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            const location = results[0].geometry.location;
            resolve({
              latitude: location.lat(),
              longitude: location.lng()
            });
          } else {
            console.error('Erro no geocoding:', status);
            resolve(null);
          }
        }
      );
    });
  } catch (error) {
    console.error('Erro ao fazer geocoding:', error);
    return null;
  }
}

/**
 * Parseia os componentes de endereço do Google Maps
 */
function parseAddressComponents(components: google.maps.GeocoderAddressComponent[]): AddressParts {
  const parts: AddressParts = {
    street: null,
    number: null,
    neighborhood: null,
    city: null,
    state: null,
    cep: null,
    latitude: null,
    longitude: null,
    formatted: ''
  };

  components.forEach(component => {
    const types = component.types;
    const longName = component.long_name;
    const shortName = component.short_name;

    if (types.includes('street_number')) {
      parts.number = longName;
    } else if (types.includes('route')) {
      parts.street = longName;
    } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
      parts.neighborhood = longName;
    } else if (types.includes('administrative_area_level_2')) {
      parts.city = longName;
    } else if (types.includes('administrative_area_level_1')) {
      parts.state = shortName;
    } else if (types.includes('postal_code')) {
      parts.cep = longName;
    }
  });

  return parts;
}