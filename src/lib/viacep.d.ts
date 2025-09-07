export declare function fetchCep(cep: string): Promise<{
    street: any;
    neighborhood: any;
    city: any;
    state: any;
    cep: string;
} | null>;
