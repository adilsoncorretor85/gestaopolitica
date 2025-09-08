export async function geocodeAddress(googleMaps: typeof google, address: string): Promise<google.maps.LatLngBounds | null> {
  return new Promise((resolve) => {
    const geocoder = new googleMaps.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const r = results[0];
        const bounds = r.geometry.bounds ?? new googleMaps.maps.LatLngBounds(r.geometry.location, r.geometry.location);
        resolve(bounds);
      } else {
        resolve(null);
      }
    });
  });
}
