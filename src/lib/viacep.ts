export async function fetchCep(cep: string) {
  const digits = (cep || "").replace(/\D/g,"");
  if (digits.length < 8) return null;
  const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  const data = await r.json();
  if (data.erro) return null;
  return {
    street: data.logradouro || "",
    neighborhood: data.bairro || "",
    city: data.localidade || "",
    state: data.uf || "",
    cep: digits
  };
}