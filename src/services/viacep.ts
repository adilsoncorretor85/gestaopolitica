// src/services/viacep.ts
export type CepAddress = {
  street: string;       // logradouro
  neighborhood: string; // bairro
  city: string;         // localidade
  state: string;        // uf
  cep: string;
};

export async function fetchAddressByCep(rawCep: string): Promise<CepAddress | null> {
  try {
    const cep = (rawCep || '').replace(/\D/g, '');
    if (cep.length !== 8) return null;

    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data?.erro) return null;

    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      cep: data.cep || cep,
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
}

