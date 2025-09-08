# Full-Text Search (FTS) em PT-BR

## Visão Geral

O sistema implementa busca Full-Text Search (FTS) em português brasileiro para a tabela `public.people`, permitindo buscas mais eficientes e relevantes por nomes de pessoas.

## Como Funciona

### 1. Coluna TSVector
- **Coluna**: `full_name_fts` (tipo `tsvector`)
- **Conteúdo**: Versão processada do `full_name` para busca
- **Dicionário**: `portuguese` (otimizado para português)
- **Processamento**: Remove acentos usando `unaccent()` para melhor compatibilidade

### 2. Trigger de Manutenção
- **Função**: `people_set_full_name_fts()`
- **Trigger**: `trg_people_set_full_name_fts`
- **Execução**: `BEFORE INSERT OR UPDATE`
- **Ação**: Atualiza automaticamente a coluna `full_name_fts` sempre que `full_name` for modificado

### 3. Índice GIN
- **Nome**: `people_full_name_fts`
- **Tipo**: GIN (Generalized Inverted Index)
- **Otimização**: Busca extremamente rápida em grandes volumes de dados

### 4. Função RPC
- **Nome**: `search_people(q, p_limit, p_offset)`
- **Parâmetros**:
  - `q`: Termo de busca (texto)
  - `p_limit`: Limite de resultados (padrão: 50)
  - `p_offset`: Offset para paginação (padrão: 0)
- **Retorno**: Tabela com `id`, `full_name`, `city`, `state`, `rank`
- **Ordenação**: Por relevância (rank) decrescente, depois por nome alfabético

## Uso no Frontend

### Serviço `searchPeople()`

```typescript
import { searchPeople } from '@/services/searchPeople';

// Busca básica
const results = await searchPeople(supabase, "João Silva", 20, 0);

// Com paginação
const page2 = await searchPeople(supabase, "Maria", 20, 20);
```

### Integração Automática

O sistema substitui automaticamente buscas `ILIKE` por FTS quando:
- Parâmetro `q` ou `search` não está vazio
- Busca por texto é solicitada

**Comportamento**:
- **Com texto**: Usa FTS com ordenação por relevância
- **Sem texto**: Usa listagem padrão (últimos criados, etc.)

## Vantagens da FTS

### 1. Relevância
- **Ranking**: Resultados ordenados por relevância
- **Pesos**: Palavras mais importantes têm maior peso
- **Proximidade**: Palavras próximas têm maior relevância

### 2. Performance
- **Índice GIN**: Busca em milissegundos mesmo com milhares de registros
- **Otimização**: PostgreSQL otimiza automaticamente as consultas

### 3. Flexibilidade
- **Acentos**: Busca "Joao" encontra "João"
- **Flexibilidade**: Busca "Silva" encontra "Silva Santos"
- **Parcial**: Busca "Jo" encontra "João", "José", etc.

## Exemplos de Busca

### Busca Simples
```sql
SELECT * FROM search_people('João Silva');
```

### Busca com Paginação
```sql
SELECT * FROM search_people('Maria', 10, 20); -- 10 resultados, offset 20
```

### Busca Flexível
- **"Joao"** → encontra "João", "João Pedro", "João Silva"
- **"Silva"** → encontra "Silva", "Silva Santos", "Maria Silva"
- **"João Silva"** → encontra "João Silva Santos", "João da Silva"

## Segurança (RLS)

### Row Level Security
- **Respeitado**: A RPC usa `SECURITY INVOKER` (padrão)
- **Políticas**: Todas as políticas RLS existentes são aplicadas
- **Isolamento**: Usuários só veem seus próprios registros (quando aplicável)

### Auditoria
- **Mantida**: Sistema de auditoria continua funcionando
- **Logs**: Todas as operações são registradas normalmente

## Monitoramento

### Performance
- **Tempo**: Buscas devem responder em <100ms
- **Índice**: Verificar uso do índice GIN
- **Volume**: Suporta milhares de registros eficientemente

### Manutenção
- **Automática**: Trigger mantém dados atualizados
- **Backfill**: Migração atualiza registros existentes
- **Idempotente**: Pode ser executada múltiplas vezes

## Troubleshooting

### Problemas Comuns

1. **Busca não retorna resultados**
   - Verificar se a coluna `full_name_fts` está populada
   - Executar backfill manual se necessário

2. **Performance lenta**
   - Verificar se o índice GIN foi criado
   - Analisar plano de execução da query

3. **RLS bloqueando resultados**
   - Verificar políticas de segurança
   - Confirmar que usuário tem permissões adequadas

### Comandos Úteis

```sql
-- Verificar se índice existe
\d+ people_full_name_fts

-- Verificar dados FTS
SELECT full_name, full_name_fts FROM people LIMIT 5;

-- Testar busca
SELECT * FROM search_people('teste', 5, 0);

-- Reindexar se necessário
REINDEX INDEX people_full_name_fts;
```

