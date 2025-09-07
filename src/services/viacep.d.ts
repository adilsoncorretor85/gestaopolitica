export type CepAddress = {
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
};
export declare function fetchAddressByCep(rawCep: string): Promise<CepAddress | null>;
