// remove diacríticos e baixa caixa para comparar strings de forma estável
export function normalizeKey(s: string | null | undefined) {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}
