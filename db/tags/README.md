# Sistema de Tags - Gestão Política

Sistema completo de tags para categorizar pessoas/contatos no sistema de gestão política.

## 📋 Pré-requisitos

Antes de executar os scripts, certifique-se de que existem:

1. **Tabelas base**:
   - `public.people` (com coluna `owner_id`)
   - `public.profiles` 
   - `public.app_admins` (tabela de administradores)
   - `public.app_leaders_list` (view de líderes ativos)

2. **Função auxiliar**:
   - `set_updated_at()` (para triggers de updated_at)

3. **Extensões PostgreSQL**:
   - `unaccent` (para busca sem acentos)

## 🚀 Ordem de Execução

**IMPORTANTE**: Execute os arquivos SQL na ordem exata abaixo:

```bash
# 1. Criar tabelas e índices
01_ddl_tables.sql

# 2. Criar funções auxiliares
02_helper_functions.sql

# 3. Aplicar políticas RLS
03_rls_policies.sql

# 4. Criar RPCs e views
04_rpcs_views.sql

# 5. Aplicar grants/permissões
05_grants.sql

# 6. Inserir dados iniciais (OPCIONAL)
06_seeds.sql

# 7. Funções administrativas (NOVO)
08_admin_rpcs.sql

# 8. Executar diagnósticos (OPCIONAL)
07_diagnostico.sql
```

## 🔧 Como Executar

### Via Supabase Dashboard

1. Acesse **SQL Editor** no Supabase Dashboard
2. Cole o conteúdo de cada arquivo **na ordem correta**
3. Execute um por vez
4. Verifique se não há erros antes de prosseguir

### Via psql (Local)

```bash
# Executar todos os arquivos em sequência
psql -U postgres -d your_database -f 01_ddl_tables.sql
psql -U postgres -d your_database -f 02_helper_functions.sql
psql -U postgres -d your_database -f 03_rls_policies.sql
psql -U postgres -d your_database -f 04_rpcs_views.sql
psql -U postgres -d your_database -f 05_grants.sql
psql -U postgres -d your_database -f 08_admin_rpcs.sql
psql -U postgres -d your_database -f 06_seeds.sql  # Opcional
```

### Via Docker (Supabase Local)

```bash
# Copiar arquivos para o container
docker cp 01_ddl_tables.sql supabase_db_gestaopolitica:/tmp/
docker cp 02_helper_functions.sql supabase_db_gestaopolitica:/tmp/
# ... outros arquivos

# Executar em sequência
docker exec supabase_db_gestaopolitica psql -U postgres -d postgres -f /tmp/01_ddl_tables.sql
docker exec supabase_db_gestaopolitica psql -U postgres -d postgres -f /tmp/02_helper_functions.sql
# ... outros arquivos
```

## 📊 Verificação Pós-Execução

### 1. Verificar Tabelas Criadas

```sql
-- Verificar estrutura das tabelas
\d public.tags
\d public.people_tags

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('tags', 'people_tags');
```

### 2. Verificar Funções

```sql
-- Listar funções relacionadas a tags
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%tag%'
ORDER BY routine_name;
```

### 3. Testar Funções Básicas

```sql
-- Testar como admin (substitua UUID pelo ID do admin)
SET LOCAL ROLE authenticated;
SET request.jwt.claim.sub TO 'seu-admin-uuid-aqui';

-- Verificar se é reconhecido como admin
SELECT public.is_current_user_admin();

-- Listar tags disponíveis
SELECT * FROM public.get_available_tags();

-- Testar busca (deve retornar sem erro)
SELECT COUNT(*) FROM public.search_people_with_tags('', '{}', 'ANY', 10, 0);
```

## 🎯 Funcionalidades Implementadas

### Para Administradores

1. **Gerenciar tags**: Criar, editar, excluir
2. **Ver todas as tags**: Incluindo inativas e sensíveis
3. **Aplicar tags**: A qualquer pessoa
4. **Acesso total**: Sem restrições de RLS

### Para Líderes

1. **Ver tags ativas**: Apenas tags não sensíveis
2. **Aplicar tags**: Apenas às suas pessoas (owner_id)
3. **Buscar com tags**: Filtrar pessoas por tags
4. **Restrito por RLS**: Apenas suas pessoas

### Para Sistema

1. **RLS completo**: Segurança por linha
2. **Auditoria**: created_by, created_at, updated_at
3. **Performance**: Índices otimizados
4. **Busca avançada**: Texto + tags (ANY/ALL)

## 🔒 Segurança e RLS

### Políticas Aplicadas

- **tags**: SELECT livre (ativas), CRUD apenas admin
- **people_tags**: Tudo controlado por RLS (admin ou líder+dono)

### Funções de Segurança

- `is_current_user_admin()`: Verifica admin via `app_admins`
- `is_current_user_leader()`: Verifica líder via `app_leaders_list`
- `is_person_owned_by_current_user()`: Verifica posse via `people.owner_id`
- `can_access_sensitive_tag()`: Controla acesso a tags sensíveis

## 🎨 Frontend Integration

### Componentes Criados

- `TagFilter`: Filtro de tags com modo ANY/ALL
- `TagFormModal`: Modal para criar/editar tags (admin)
- `TagEditModal`: Modal para aplicar tags a pessoas
- `AdminTags`: Página de administração de tags (criar/editar/excluir)

### Páginas Modificadas

- `Pessoas.tsx`: Filtro por tags integrado
- `PessoasForm.tsx`: Aplicação de tags no formulário
- Menu sidebar: Opção "Tags" apenas para admin

## 🐛 Troubleshooting

### Erro: "function does not exist"

1. Verifique se executou os arquivos na ordem correta
2. Verifique se não há erros nos logs
3. Execute `05_grants.sql` novamente

### Erro: "permission denied"

1. Execute `05_grants.sql` para aplicar permissões
2. Verifique se `app_admins` tem seu usuário
3. Confirme RLS policies com `\d+ public.tags`

### Erro: "relation does not exist"

1. Execute `01_ddl_tables.sql` primeiro
2. Verifique pré-requisitos (tabelas base)
3. Confirme schema `public`

### Tags não aparecem no frontend

1. Verifique se executou `08_admin_rpcs.sql`
2. Confirme que usuário é admin em `app_admins`
3. Teste `get_available_tags()` diretamente

## 📝 Logs e Monitoramento

Cada arquivo SQL inclui verificações e logs úteis:

- **NOTICE**: Informações sobre criação/aplicação
- **WARNING**: Avisos sobre problemas não críticos
- **ERROR**: Erros que impedem execução

Execute `07_diagnostico.sql` para verificação completa do sistema.

## ✅ Checklist Pós-Instalação

- [ ] Todas as 8 tabelas/views criadas
- [ ] 15+ funções relacionadas a tags existem
- [ ] RLS habilitado em `tags` e `people_tags`
- [ ] 8+ políticas RLS aplicadas
- [ ] Grants para `authenticated` aplicados
- [ ] Seeds inseridas (se executou `06_seeds.sql`)
- [ ] Admin consegue acessar `/admin/tags`
- [ ] Filtro de tags funciona em `/pessoas`
- [ ] Modal de tags funciona ao editar pessoa

## 🎉 Sistema Pronto!

Após executar todos os scripts na ordem correta, o sistema de tags estará 100% funcional:

- ✅ Backend completo com RLS
- ✅ Frontend integrado
- ✅ Interface administrativa
- ✅ Filtros avançados
- ✅ Segurança implementada

**Acesse `/admin/tags` como administrador para começar a usar!**