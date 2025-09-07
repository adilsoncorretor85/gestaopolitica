// src/services/geocoding.ts
export type Coordinates = { lat: number; lng: number };

export async function geocodeAddress(input: {
  street?: string; number?: string; neighborhood?: string;
  city?: string; state?: string; cep?: string;
}) : Promise<Coordinates | null> {
  // Prioriza número+rua+cidade+UF+CEP no endereço a geocodificar
  const parts = [
    input.street && input.number ? `${input.street}, ${input.number}` : input.street,
    input.neighborhood,
    input.city && input.state ? `${input.city}-${input.state}` : input.city,
    input.cep,
    'Brasil'
  ].filter(Boolean);
  const addr = parts.join(', ');

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&region=br`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
    console.warn('Geocode sem resultado:', data.status, addr);
    return null;
  } catch (e) {
    console.error('Erro no geocode:', e);
    return null;
  }
}
