export async function fetchAddressByCep(rawCep) {
    const cep = (rawCep || '').replace(/\D/g, '');
    if (cep.length !== 8)
        return null;
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok)
        return null;
    const data = await res.json();
    if (data?.erro)
        return null;
    return {
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        cep: data.cep || cep,
    };
}
