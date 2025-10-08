// Utilitários para normalização de tratamentos
// Lista canônica de tratamentos aceitos
export const CANONICAL_TREATMENTS = [
  'Dr.', 'Dra.',
  'Pr.', 'Pra.', 'Pe.',
  'J.', 'Des.',
  'Me.',
  'Gen.', 'Cel.', 'Maj.', 'Cap.', 'Ten.', 'Sgt.', 'Sd.',
  'Sr.', 'Sra.', 'D.',
  'Prof.', 'Profa.',
  'Dcn.',
  'Dep.',
  'Sen.',
  'Ver.',
  'Min.',
  'Emb.',
  'Reit.',
  'Dir.'
] as const;

// Mapa de sinônimos para normalização
export const TREATMENT_SYNONYMS: Record<string, string> = {
  // Doutor/Doutora
  'doutor': 'Dr.',
  'dr': 'Dr.',
  'dr.': 'Dr.',
  'doutora': 'Dra.',
  'dra': 'Dra.',
  'dra.': 'Dra.',
  
  // Pastor/Pastora/Padre
  'pastor': 'Pr.',
  'pastora': 'Pra.',
  'padre': 'Pe.',
  
  // Juiz/Desembargador
  'juiz': 'J.',
  'desembargador': 'Des.',
  
  // Mestre
  'mestre': 'Me.',
  
  // Militares
  'general': 'Gen.',
  'coronel': 'Cel.',
  'major': 'Maj.',
  'capitao': 'Cap.',
  'capitão': 'Cap.',
  'tenente': 'Ten.',
  'sargento': 'Sgt.',
  'soldado': 'Sd.',
  
  // Senhor/Senhora/Dona
  'senhor': 'Sr.',
  'senhora': 'Sra.',
  'dona': 'D.',
  
  // Professor/Professora
  'professor': 'Prof.',
  'professora': 'Profa.',
  
  // Diácono
  'diacono': 'Dcn.',
  'diácono': 'Dcn.',
  
  // Políticos
  'deputado': 'Dep.',
  'deputada': 'Dep.',
  'senador': 'Sen.',
  'senadora': 'Sen.',
  'vereador': 'Ver.',
  'vereadora': 'Ver.',
  'ministro': 'Min.',
  'ministra': 'Min.',
  'embaixador': 'Emb.',
  'embaixadora': 'Emb.',
  'reitor': 'Reit.',
  'reitora': 'Reit.',
  'diretor': 'Dir.',
  'diretora': 'Dir.'
};

/**
 * Normaliza um tratamento de entrada para a forma canônica
 * @param input - Texto de entrada do usuário
 * @returns Tratamento canônico ou null se não encontrar match
 */
export function normalizeTreatment(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }
  
  // Limpar e normalizar entrada
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!cleaned) {
    return null;
  }
  
  // Buscar no mapa de sinônimos
  const canonical = TREATMENT_SYNONYMS[cleaned];
  if (canonical) {
    return canonical;
  }
  
  // Se não encontrar match, retornar null (não salvar valor livre)
  return null;
}

/**
 * Verifica se um tratamento é válido (está na lista canônica)
 * @param treatment - Tratamento a verificar
 * @returns true se válido, false caso contrário
 */
export function isValidTreatment(treatment: string): boolean {
  return CANONICAL_TREATMENTS.includes(treatment as any);
}

/**
 * Formata nome com tratamento
 * @param treatment - Tratamento (pode ser null)
 * @param fullName - Nome completo
 * @returns Nome formatado com tratamento ou apenas o nome
 */
export function formatNameWithTreatment(treatment: string | null, fullName: string): string {
  if (!treatment || !fullName) {
    return fullName || '';
  }
  
  return `${treatment} ${fullName}`.trim();
}
