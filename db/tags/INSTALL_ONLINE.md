# 🚀 Instalação Rápida - Supabase Online

Instruções para aplicar o sistema de tags no **Supabase Online** (Production).

## ⚡ Instalação Rápida (Recomendado)

### Opção 1: Arquivos Individuais

Execute **na ordem exata** via SQL Editor do Supabase Dashboard:

```sql
-- 1. DDL - Tabelas e índices
-- Cole o conteúdo de: 01_ddl_tables.sql

-- 2. Funções auxiliares  
-- Cole o conteúdo de: 02_helper_functions.sql

-- 3. Políticas RLS
-- Cole o conteúdo de: 03_rls_policies.sql

-- 4. RPCs e views básicas
-- Cole o conteúdo de: 04_rpcs_views.sql

-- 5. Funções administrativas (ANTES dos grants!)
-- Cole o conteúdo de: 08_admin_rpcs.sql

-- 6. Grants e permissões (DEPOIS das funções admin!)
-- Cole o conteúdo de: 05_grants.sql

-- 7. Seeds (OPCIONAL)
-- Cole o conteúdo de: 06_seeds.sql
```

⚠️ **IMPORTANTE**: O arquivo `08_admin_rpcs.sql` deve ser executado ANTES do `05_grants.sql`!

### Opção 2: Script Único

1. Abra `install_tags_system.sql`
2. Substitua os comentários pelos conteúdos dos arquivos
3. Execute no SQL Editor do Supabase

## 📋 Checklist de Verificação

Após a execução, verifique:

### 1. Tabelas Criadas
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tags', 'people_tags');
```
**Esperado**: 2 tabelas

### 2. Funções Criadas
```sql
SELECT COUNT(*) as total_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%tag%';
```
**Esperado**: 12+ funções

### 3. Políticas RLS
```sql
SELECT COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('tags', 'people_tags');
```
**Esperado**: 8+ políticas

### 4. Teste Funcional
```sql
-- Teste como admin (substitua pelo seu UUID)
SET LOCAL ROLE authenticated;
SET request.jwt.claim.sub TO 'seu-admin-uuid';

-- Deve retornar true
SELECT public.is_current_user_admin();

-- Deve retornar lista de tags
SELECT * FROM public.get_available_tags() LIMIT 3;
```

## 🔧 Deploy do Frontend

### Arquivos Criados/Modificados

**Novos arquivos**:
- `src/services/tags.ts`
- `src/hooks/useTags.ts` 
- `src/components/TagFilter.tsx`
- `src/components/TagList.tsx`
- `src/components/TagSelector.tsx`
- `src/components/modals/TagFormModal.tsx`
- `src/components/modals/TagEditModal.tsx`
- `src/pages/AdminTags.tsx`

**Arquivos modificados**:
- `src/App.tsx` (nova rota)
- `src/components/Sidebar.tsx` (menu Tags)
- `src/pages/Pessoas.tsx` (filtro tags)
- `src/pages/PessoasForm.tsx` (aplicar tags)
- `src/services/tags.ts` (serviços)

### Deploy

1. **Commit** todas as alterações
2. **Push** para repositório
3. **Deploy** via Vercel/Netlify/etc
4. **Verificar** se build passou sem erros

## 🎯 Pós-Instalação

### 1. Configurar Admin

Certifique-se de que seu usuário está em `app_admins`:

```sql
INSERT INTO public.app_admins (user_id) 
VALUES ('seu-uuid-aqui') 
ON CONFLICT DO NOTHING;
```

### 2. Criar Primeiras Tags

1. Acesse `/admin/tags` como admin
2. Clique "Nova Tag"
3. Crie tags básicas: "Empresário", "Estudante", etc.

### 3. Teste Completo

1. **Filtro**: Vá para `/pessoas` e teste filtro por tags
2. **Aplicação**: Abra uma pessoa e aplique tags
3. **Busca**: Use modo ANY/ALL no filtro
4. **Admin**: Crie/edite/desative tags

## 🚨 Problemas Comuns

### "function does not exist"
- ✅ Execute os arquivos na ordem correta
- ✅ Verifique se não há erros no SQL Editor

### "permission denied"  
- ✅ Execute `05_grants.sql`
- ✅ Confirme que usuário está em `app_admins`

### "relation does not exist"
- ✅ Execute `01_ddl_tables.sql` primeiro
- ✅ Verifique pré-requisitos no README.md

### Tags não aparecem
- ✅ Execute `08_admin_rpcs.sql`
- ✅ Confirme admin em `app_admins`
- ✅ Verifique RLS policies

## 📞 Suporte

1. **Logs**: Verifique console do navegador e logs do Supabase
2. **Diagnóstico**: Execute `07_diagnostico.sql`
3. **Documentação**: Leia `README.md` completo
4. **Reset**: Em último caso, rode scripts novamente (são idempotentes)

## ✅ Sucesso!

Se tudo correr bem, você terá:

- 🏷️ Sistema de tags completo
- 👥 Interface para admin gerenciar tags  
- 🔍 Filtro avançado por tags
- 🔒 Segurança RLS implementada
- 📱 Frontend totalmente integrado

**Aproveite seu novo sistema de tags!** 🎉
