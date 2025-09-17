# Sistema de Tags para Pessoas

Sistema completo de tags para categorização de contatos no projeto Gestão Política, implementado via scripts SQL idempotentes para Supabase.

## 📋 Visão Geral

Este sistema permite que:
- **Administradores** criem, editem e desativem tags globais
- **Líderes** atribuam/removam tags existentes aos seus contatos
- **Usuários** busquem pessoas por tags (modo OR/AND)
- **Sistema** respeite LGPD com tags sensíveis

## 🚀 Instalação Manual

### Pré-requisitos
- Acesso de administrador ao Supabase Dashboard
- Projeto com tabelas `profiles`, `people` e `app_admins` existentes
- View `app_leaders_list` existente (Security Definer)
- Usuários com permissões configuradas em `app_admins`
- Líderes ativos na view `app_leaders_list` com `status = 'ACTIVE'`

### Ordem de Execução

Execute os scripts SQL no Supabase Dashboard **na ordem exata**:

1. **`01_ddl_tables.sql`** - Cria tabelas e índices
2. **`02_helper_functions.sql`** - Cria funções auxiliares
3. **`03_rls_policies.sql`** - Implementa políticas RLS
4. **`04_rpcs_views.sql`** - Cria RPCs e views
5. **`05_grants.sql`** - Aplica permissões
6. **`06_seeds.sql`** - Dados iniciais (opcional)
7. **`07_diagnostico.sql`** - Validação (opcional)

### Passo a Passo

1. **Acesse o Supabase Dashboard**
   - Vá para seu projeto
   - Clique em "SQL Editor"

2. **Execute cada script**
   - Copie o conteúdo do arquivo
   - Cole no SQL Editor
   - Clique em "Run"

3. **Verifique a execução**
   - Cada script deve executar sem erros
   - Mensagens de sucesso aparecerão no console

4. **Execute validação** (recomendado)
   - Execute o script `07_diagnostico.sql`
   - Verifique se todos os testes passaram

## 📊 Estrutura do Sistema

### Tabelas Criadas

#### `tags`
```sql
- id (uuid, PK)
- name (text, UNIQUE) - Nome da tag
- description (text) - Descrição opcional
- color (text) - Cor hexadecimal (#FF5733)
- is_active (boolean) - Se está ativa
- is_sensitive (boolean) - Se é sensível (LGPD)
- created_by (uuid) - Quem criou
- created_at, updated_at (timestamptz)
```

#### `people_tags`
```sql
- id (uuid, PK)
- person_id (uuid, FK) - Referência para people.id
- tag_id (uuid, FK) - Referência para tags.id
- created_by (uuid) - Quem aplicou a tag
- created_at, updated_at (timestamptz)
- UNIQUE(person_id, tag_id) - Evita duplicatas
```

### Funções Principais

#### `search_people_with_tags(q, tag_ids, mode, p_limit, p_offset)`
Busca pessoas com filtros de texto e tags.

**Parâmetros:**
- `q` (text): Busca textual em nome, whatsapp, email
- `tag_ids` (uuid[]): Array de IDs das tags
- `mode` (text): 'ANY' (OR) ou 'ALL' (AND)
- `p_limit` (int): Limite de resultados
- `p_offset` (int): Offset para paginação

**Exemplo:**
```sql
-- Buscar pessoas com nome "João" que tenham tag "Empresário" OU "Católico"
SELECT * FROM public.search_people_with_tags(
  'João', 
  ARRAY['tag-id-1', 'tag-id-2'], 
  'ANY', 
  10, 
  0
);
```

#### `apply_tag_to_person(person_id, tag_id)`
Aplica uma tag a uma pessoa.

#### `remove_tag_from_person(person_id, tag_id)`
Remove uma tag de uma pessoa.

#### `get_available_tags()`
Lista todas as tags disponíveis com contagem de uso.

### View

#### `vw_people_with_tags`
View que agrupa pessoas com suas tags em formato JSON.

**Exemplo:**
```sql
SELECT id, full_name, tags 
FROM public.vw_people_with_tags 
WHERE tags != '[]'::json;
```

## 🔐 Segurança e Permissões

### Row Level Security (RLS)

#### Tabela `tags`
- **SELECT**: Usuários autenticados podem ver tags ativas
- **INSERT/UPDATE/DELETE**: Apenas administradores (via `app_admins`)

#### Tabela `people_tags`
- **SELECT/INSERT/UPDATE/DELETE**: Baseado na propriedade da pessoa
- Administradores podem gerenciar qualquer pessoa
- Líderes só podem gerenciar tags das suas pessoas (via `app_leaders_list` com `status = 'ACTIVE'`)

### Tags Sensíveis

Tags marcadas como `is_sensitive = true` são visíveis apenas para administradores.

**Exemplos de tags sensíveis:**
- Religião (Católico, Evangélico, etc.)
- Renda (Classe A, B, C, etc.)
- Dados pessoais específicos

## 📝 Uso Prático

### Para Administradores

#### Criar uma nova tag
```sql
INSERT INTO public.tags (name, description, color, is_sensitive)
VALUES ('Empresário', 'Pessoa que possui negócios', '#2E8B57', false);
```

#### Editar uma tag existente
```sql
UPDATE public.tags 
SET description = 'Nova descrição', color = '#FF5733'
WHERE name = 'Empresário';
```

#### Desativar uma tag
```sql
UPDATE public.tags 
SET is_active = false 
WHERE name = 'Tag Antiga';
```

### Para Líderes

#### Aplicar tag a uma pessoa
```sql
SELECT public.apply_tag_to_person('person-id', 'tag-id');
```

#### Remover tag de uma pessoa
```sql
SELECT public.remove_tag_from_person('person-id', 'tag-id');
```

#### Ver tags de uma pessoa
```sql
SELECT * FROM public.get_person_tags('person-id');
```

### Busca e Filtros

#### Buscar por texto
```sql
SELECT * FROM public.search_people_with_tags('João', '{}', 'ANY', 10, 0);
```

#### Buscar por tags (modo OR)
```sql
SELECT * FROM public.search_people_with_tags(
  '', 
  ARRAY['tag-id-1', 'tag-id-2'], 
  'ANY', 
  10, 
  0
);
```

#### Buscar por tags (modo AND)
```sql
SELECT * FROM public.search_people_with_tags(
  '', 
  ARRAY['tag-id-1', 'tag-id-2'], 
  'ALL', 
  10, 
  0
);
```

## 🛠️ Manutenção

### Verificar Status do Sistema
```sql
-- Verificar grants
SELECT * FROM public.verify_tags_grants();

-- Verificar seeds
SELECT * FROM public.check_tags_seeds();

-- Verificar políticas RLS
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('tags', 'people_tags');
```

### Limpeza de Dados

#### Remover tags não utilizadas
```sql
DELETE FROM public.tags 
WHERE id NOT IN (SELECT DISTINCT tag_id FROM public.people_tags)
  AND is_active = false;
```

#### Limpar tags de pessoa específica
```sql
DELETE FROM public.people_tags WHERE person_id = 'person-id';
```

## 🔄 Reversão

### Desativar Sistema (Sem Perder Dados)
```sql
-- Desativar RLS
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_tags DISABLE ROW LEVEL SECURITY;

-- Remover grants
REVOKE ALL ON public.tags FROM authenticated;
REVOKE ALL ON public.people_tags FROM authenticated;
```

### Remover Sistema Completamente
⚠️ **CUIDADO**: Esta operação remove todos os dados de tags!

```sql
-- Remover constraints e tabelas
DROP TABLE IF EXISTS public.people_tags CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP VIEW IF EXISTS public.vw_people_with_tags CASCADE;

-- Remover funções
DROP FUNCTION IF EXISTS public.is_current_user_admin();
DROP FUNCTION IF EXISTS public.is_person_owned_by_current_user(uuid);
-- ... (outras funções)
```

## 🐛 Troubleshooting

### Problema: "Função não encontrada"
**Solução:** Execute o script `02_helper_functions.sql`

### Problema: "Política RLS não encontrada"
**Solução:** Execute o script `03_rls_policies.sql`

### Problema: "Grant negado"
**Solução:** Execute o script `05_grants.sql`

### Problema: "Tags sensíveis não aparecem"
**Solução:** Verifique se o usuário é administrador:
```sql
SELECT EXISTS(SELECT 1 FROM public.app_admins WHERE user_id = auth.uid());
```

### Problema: "Líder não consegue aplicar tags"
**Solução:** Verifique se o usuário é líder ativo:
```sql
SELECT EXISTS(SELECT 1 FROM public.app_leaders_list WHERE id = auth.uid() AND status = 'ACTIVE');
```

### Problema: "Performance lenta"
**Solução:** Verifique se os índices foram criados:
```sql
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (indexname LIKE 'idx_tags_%' OR indexname LIKE 'idx_people_tags_%');
```

## 📚 Documentação Adicional

- [ADR - Decisão de Arquitetura](./ADR-tags.md)
- [Changelog](./CHANGELOG.md)
- [Validação Pós-Execução](./validacao_pos_execucao.md)

## 🤝 Suporte

Para dúvidas ou problemas:

1. Verifique este README
2. Execute o script de diagnóstico
3. Consulte os logs do Supabase
4. Verifique se todos os scripts foram executados na ordem correta

---

**Versão:** 1.0.0  
**Data:** 2025-01-16  
**Compatibilidade:** Supabase PostgreSQL 15+