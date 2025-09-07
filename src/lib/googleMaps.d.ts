declare global {
    interface Window {
        __gmapsPromise?: Promise<typeof google>;
    }
}
export declare function loadGoogleMaps(): Promise<typeof google>;
