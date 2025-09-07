export type Coordinates = {
    lat: number;
    lng: number;
};
export declare function geocodeAddress(input: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
}): Promise<Coordinates | null>;
