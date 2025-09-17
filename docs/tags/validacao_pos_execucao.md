# Validação Pós-Execução - Sistema de Tags

Este documento contém um checklist passo-a-passo para validar a instalação do sistema de tags após executar os scripts manualmente no Dashboard do Supabase.

## 📋 Checklist de Validação

### 1. Preparação
- [ ] Todos os scripts SQL foram executados na ordem correta (01 a 07)
- [ ] Você tem acesso de administrador ao projeto Supabase
- [ ] Você tem um usuário de teste com ID conhecido no sistema
- [ ] Tabela `app_admins` existe e tem dados

### 2. Verificação de Estrutura

#### 2.1 Tabelas
Execute no SQL Editor:
```sql
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('tags', 'people_tags')
ORDER BY table_name;
```

**Resultado esperado:**
- `people_tags` | BASE TABLE
- `tags` | BASE TABLE

#### 2.2 Views
```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'vw_people_with_tags';
```

**Resultado esperado:**
- `vw_people_with_tags`

#### 2.3 Funções
```sql
SELECT proname 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_current_user_admin', 'is_person_owned_by_current_user', 'is_admin',
    'can_access_sensitive_tag', 'get_person_tags', 'search_people_with_tags',
    'apply_tag_to_person', 'remove_tag_from_person', 'get_available_tags'
  )
ORDER BY p.proname;
```

**Resultado esperado:** 9 funções listadas

### 3. Verificação de RLS

#### 3.1 Políticas da tabela tags
```sql
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'tags'
ORDER BY policyname;
```

**Resultado esperado:** 4 políticas (SELECT, INSERT, UPDATE, DELETE)

#### 3.2 Políticas da tabela people_tags
```sql
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'people_tags'
ORDER BY policyname;
```

**Resultado esperado:** 4 políticas (SELECT, INSERT, UPDATE, DELETE)

### 4. Verificação de Grants

Execute a função de verificação:
```sql
SELECT * FROM public.verify_tags_grants();
```

**Resultado esperado:** Todas as linhas devem ter `granted = true`

### 5. Teste de Funcionalidade Básica

#### 5.1 Listar tags disponíveis
```sql
SELECT * FROM public.get_available_tags();
```

**Resultado esperado:** Lista de tags (vazia se não executou seeds)

#### 5.2 Buscar pessoas (se existirem)
```sql
SELECT * FROM public.search_people_with_tags('', '{}', 'ANY', 5, 0);
```

**Resultado esperado:** Lista de pessoas com tags (pode estar vazia)

#### 5.3 Verificar view
```sql
SELECT id, full_name, tags FROM public.vw_people_with_tags LIMIT 5;
```

**Resultado esperado:** Pessoas com tags em formato JSON

### 6. Teste de RLS (IMPORTANTE)

#### 6.1 Preparar usuário de teste
Substitua `SEU_USER_ID_AQUI` pelo ID de um usuário real:
```sql
-- Simular contexto de usuário autenticado
SELECT set_config('request.jwt.claim.sub', 'SEU_USER_ID_AQUI', true);
```

#### 6.2 Teste de permissões
```sql
-- Verificar se é admin (via app_admins)
SELECT public.is_current_user_admin();

-- Verificar se consegue ver tags
SELECT COUNT(*) FROM public.tags;

-- Verificar se consegue ver people_tags
SELECT COUNT(*) FROM public.people_tags;
```

### 7. Teste de Seeds (Opcional)

Se executou o script de seeds:

#### 7.1 Verificar tags criadas
```sql
SELECT * FROM public.check_tags_seeds();
```

#### 7.2 Listar tags por categoria
```sql
-- Tags não sensíveis (visíveis para líderes)
SELECT name, description, color 
FROM public.tags 
WHERE is_sensitive = false AND is_active = true
ORDER BY name;

-- Tags sensíveis (visíveis apenas para admins)
SELECT name, description, color 
FROM public.tags 
WHERE is_sensitive = true AND is_active = true
ORDER BY name;
```

### 8. Teste de Aplicação de Tags

#### 8.1 Aplicar tag a uma pessoa
```sql
-- Substitua pelos IDs reais
SELECT public.apply_tag_to_person('PERSON_ID', 'TAG_ID');
```

#### 8.2 Remover tag de uma pessoa
```sql
-- Substitua pelos IDs reais
SELECT public.remove_tag_from_person('PERSON_ID', 'TAG_ID');
```

### 9. Teste de Busca com Tags

#### 9.1 Busca por texto
```sql
SELECT * FROM public.search_people_with_tags('João', '{}', 'ANY', 10, 0);
```

#### 9.2 Busca por tags (modo ANY)
```sql
-- Substitua pelos IDs reais das tags
SELECT * FROM public.search_people_with_tags('', ARRAY['TAG_ID_1', 'TAG_ID_2'], 'ANY', 10, 0);
```

#### 9.3 Busca por tags (modo ALL)
```sql
-- Substitua pelos IDs reais das tags
SELECT * FROM public.search_people_with_tags('', ARRAY['TAG_ID_1', 'TAG_ID_2'], 'ALL', 10, 0);
```

## 🚨 Problemas Comuns e Soluções

### Problema: "Função não encontrada"
**Solução:** Verifique se executou o script `02_helper_functions.sql`

### Problema: "Política não encontrada"
**Solução:** Verifique se executou o script `03_rls_policies.sql`

### Problema: "Grant negado"
**Solução:** Verifique se executou o script `05_grants.sql`

### Problema: "RLS bloqueando acesso"
**Solução:** Verifique se o usuário de teste tem permissões adequadas

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

### Problema: "Tabela app_admins não encontrada"
**Solução:** Verifique se a tabela `app_admins` existe e tem dados:
```sql
SELECT * FROM public.app_admins LIMIT 5;
```

### Problema: "View app_leaders_list não encontrada"
**Solução:** Verifique se a view `app_leaders_list` existe:
```sql
SELECT * FROM public.app_leaders_list LIMIT 5;
```

## ✅ Critérios de Sucesso

A instalação está correta quando:

- [ ] Todas as tabelas, views e funções foram criadas
- [ ] Todas as políticas RLS estão ativas
- [ ] Todos os grants foram aplicados
- [ ] As funções auxiliares funcionam corretamente
- [ ] O RLS permite acesso adequado baseado em permissões
- [ ] As RPCs retornam dados esperados
- [ ] A busca por tags funciona (modo ANY e ALL)
- [ ] Tags sensíveis são restritas a administradores
- [ ] A detecção de admin via `app_admins` funciona
- [ ] A detecção de líder via `app_leaders_list` funciona
- [ ] Líderes só conseguem gerenciar tags das suas pessoas

## 📞 Suporte

Se encontrar problemas não cobertos neste checklist:

1. Verifique os logs do Supabase para erros específicos
2. Confirme que executou todos os scripts na ordem correta
3. Verifique se não há conflitos com políticas RLS existentes
4. Teste com diferentes usuários (admin vs líder vs usuário comum)
5. Verifique se a tabela `app_admins` está configurada corretamente
6. Verifique se a view `app_leaders_list` está configurada corretamente

## 🔄 Reversão

Se precisar reverter a instalação:

1. **NÃO** execute DROP TABLE (pode quebrar o sistema)
2. Desative as políticas RLS:
   ```sql
   ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.people_tags DISABLE ROW LEVEL SECURITY;
   ```
3. Remova os grants se necessário
4. As tabelas ficarão inativas mas não quebrarão o sistema