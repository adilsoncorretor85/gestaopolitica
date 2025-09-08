// src/lib/br.ts
export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as const;

export async function fetchCitiesByUF(uf: string) {
  if (!uf) return [];
  const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
  if (!res.ok) throw new Error('Falha ao carregar municípios do IBGE');
  const arr = await res.json();
  return arr
    .map((c: any) => ({ ibge: Number(c.id), name: c.nome as string }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));
}
