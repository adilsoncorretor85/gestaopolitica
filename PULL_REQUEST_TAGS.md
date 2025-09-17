# Pull Request: Sistema de Tags para Pessoas

## 📋 Resumo

Implementação completa do sistema de tags para categorização de contatos no projeto Gestão Política, via scripts SQL idempotentes para Supabase.

## 🎯 Objetivo

Criar um sistema flexível de tags que permita:
- **Administradores** criarem/gerenciarem tags globais
- **Líderes** atribuírem tags existentes aos seus contatos
- **Busca** por pessoas com filtros de texto e tags (modo OR/AND)
- **Segurança** respeitando propriedade de contatos e LGPD

## 📁 Arquivos Adicionados

### Scripts SQL (`db/tags/`)
- `01_ddl_tables.sql` - Criação das tabelas `tags` e `people_tags`
- `02_helper_functions.sql` - Funções auxiliares de segurança
- `03_rls_policies.sql` - Políticas Row Level Security
- `04_rpcs_views.sql` - RPCs e views de consulta
- `05_grants.sql` - Permissões para usuários autenticados
- `06_seeds.sql` - Dados iniciais opcionais
- `07_diagnostico.sql` - Script de validação
- `README.md` - Instruções de instalação

### Documentação (`docs/tags/`)
- `ADR-tags.md` - Architecture Decision Record
- `README.md` - Documentação completa do sistema
- `CHANGELOG.md` - Histórico de mudanças
- `validacao_pos_execucao.md` - Checklist de validação

## 🏗️ Arquitetura Implementada

### Estrutura do Banco
```
people (existente)
  ↓ (1:N)
people_tags (nova)
  ↓ (N:1)
tags (nova)
```

### Componentes Principais

#### Tabelas
- **`tags`**: Catálogo global com campos para nome, descrição, cor, sensibilidade
- **`people_tags`**: Relação N:N com controle de quem aplicou a tag

#### Funções de Segurança
- `is_admin()` - Verifica se usuário é administrador
- `is_person_owned_by_current_user()` - Verifica propriedade baseada em `people.owner_id`
- `can_access_sensitive_tag()` - Controle de acesso a tags sensíveis

#### RLS (Row Level Security)
- **Tags**: CRUD apenas para ADMIN, SELECT para authenticated
- **People_tags**: Baseado na propriedade da pessoa (owner_id)

#### RPCs e Views
- `search_people_with_tags()` - Busca com filtros de texto e tags
- `apply_tag_to_person()` / `remove_tag_from_person()` - Gerenciamento de tags
- `vw_people_with_tags` - View com pessoas e tags agrupadas

## 🔐 Segurança e LGPD

### Controle de Acesso
- Líderes só podem gerenciar tags das suas pessoas
- Administradores podem gerenciar qualquer pessoa
- Tags sensíveis (religião, renda) visíveis apenas para admins

### Conformidade LGPD
- Tags sensíveis marcadas com `is_sensitive = true`
- Controle granular de acesso baseado em roles
- Log de quem aplica/remove tags (created_by)

## 🚀 Instalação

### Ordem de Execução (OBRIGATÓRIA)
1. `01_ddl_tables.sql`
2. `02_helper_functions.sql`
3. `03_rls_policies.sql`
4. `04_rpcs_views.sql`
5. `05_grants.sql`
6. `06_seeds.sql` (opcional)
7. `07_diagnostico.sql` (validação)

### Instruções
1. Acesse Supabase Dashboard → SQL Editor
2. Execute cada script na ordem
3. Execute validação com script 07
4. Verifique se todos os testes passaram

## ✅ Critérios de Aceite

- [x] Scripts SQL idempotentes (podem ser executados múltiplas vezes)
- [x] Nenhuma operação destrutiva (sem DROP/DELETE/TRUNCATE)
- [x] RLS funcionando corretamente
- [x] Busca por tags (modo ANY/ALL) implementada
- [x] Tags sensíveis restritas a administradores
- [x] Documentação completa
- [x] Scripts de validação incluídos
- [x] Compatibilidade com estrutura existente

## 🧪 Testes

### Script de Diagnóstico
O arquivo `07_diagnostico.sql` inclui testes para:
- Verificação de estrutura (tabelas, views, funções)
- Validação de políticas RLS
- Verificação de grants
- Testes de funcionalidade
- Testes de RLS em transação (rollback automático)

### Validação Manual
Execute o checklist em `docs/tags/validacao_pos_execucao.md`

## 📊 Dados Iniciais (Seeds)

### Tags Incluídas
- **Profissionais**: Empresário, Profissional Liberal, Funcionário Público
- **Sociais**: Líder Comunitário, Voluntário, Esportista
- **Políticos**: Eleitor Frequente, Simpatizante, Indeciso
- **Sensíveis**: Religião (Católico, Evangélico), Renda (Classe A-E)
- **Contato**: WhatsApp Ativo, Email Ativo, Difícil Contato
- **Localização**: Centro, Zona Norte/Sul/Leste/Oeste

## 🔄 Reversão

### Desativação Segura
```sql
-- Desativar RLS (mantém dados)
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_tags DISABLE ROW LEVEL SECURITY;
```

### Remoção Completa
⚠️ **CUIDADO**: Remove todos os dados de tags
```sql
DROP TABLE IF EXISTS public.people_tags CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
```

## 📈 Próximos Passos

1. **Integração Frontend**: Criar interface para gerenciar tags
2. **Relatórios**: Analytics de uso de tags
3. **API REST**: Endpoints para operações de tags
4. **Histórico**: Auditoria de alterações de tags

## 🎯 Impacto

### Positivo
- ✅ Sistema flexível e extensível
- ✅ Controle granular de permissões
- ✅ Suporte a LGPD
- ✅ Performance otimizada
- ✅ Compatibilidade total

### Neutro
- ⚪ Não modifica código frontend
- ⚪ Não altera estrutura existente
- ⚪ Scripts opcionais (seeds, diagnóstico)

## 📝 Notas Técnicas

- **Idempotência**: Todos os scripts usam `IF NOT EXISTS` e verificações
- **Performance**: Índices otimizados para consultas frequentes
- **Segurança**: RLS rigoroso baseado na propriedade existente
- **Compatibilidade**: PostgreSQL 15+ (Supabase)

## 🔍 Revisão

### Checklist para Revisores
- [ ] Scripts SQL estão corretos e idempotentes
- [ ] RLS implementado adequadamente
- [ ] Documentação está completa
- [ ] Instruções de instalação estão claras
- [ ] Validação está funcionando
- [ ] Não há operações destrutivas

### Testes Recomendados
1. Executar scripts em ambiente de desenvolvimento
2. Executar script de diagnóstico
3. Testar permissões com diferentes usuários
4. Verificar busca por tags
5. Testar tags sensíveis

---

**Tipo**: Feature  
**Breaking Changes**: Nenhuma  
**Dependências**: Tabelas `profiles` e `people` existentes  
**Compatibilidade**: Supabase PostgreSQL 15+
