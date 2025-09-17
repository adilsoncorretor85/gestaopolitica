# Changelog - Sistema de Tags

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2025-01-16

### Adicionado
- **Sistema completo de tags para pessoas**
  - Tabela `tags` para catálogo global de tags
  - Tabela `people_tags` para relação N:N entre pessoas e tags
  - Suporte a tags sensíveis (LGPD)
  - Controle de cores e descrições para tags

- **Funções auxiliares de segurança**
  - `is_current_user_admin()` - Verifica se usuário é administrador via `app_admins`
  - `is_person_owned_by_current_user(person_id)` - Verifica propriedade via `people.owner_id`
  - `is_admin(user_id)` - Verifica se usuário específico é admin
  - `can_access_sensitive_tag(tag_id)` - Controle de acesso a tags sensíveis
  - `get_person_tags(person_id)` - Lista tags de uma pessoa

- **Row Level Security (RLS)**
  - Políticas para tabela `tags` (CRUD apenas para admins, SELECT para authenticated)
  - Políticas para tabela `people_tags` (baseadas na propriedade da pessoa)
  - Controle de acesso a tags sensíveis
  - Scripts idempotentes com verificação de existência

- **RPCs e Views de consulta**
  - `search_people_with_tags()` - Busca pessoas com filtros de texto e tags
  - `apply_tag_to_person()` - Aplica tag a uma pessoa
  - `remove_tag_from_person()` - Remove tag de uma pessoa
  - `get_available_tags()` - Lista tags disponíveis com contagem
  - `vw_people_with_tags` - View com pessoas e tags agrupadas

- **Sistema de permissões**
  - Grants para usuários autenticados
  - Função `verify_tags_grants()` para validação
  - Controle granular de acesso baseado em `app_admins`

- **Dados iniciais (seeds)**
  - Tags de perfil profissional (Empresário, Profissional Liberal, etc.)
  - Tags de perfil social (Líder Comunitário, Voluntário, etc.)
  - Tags de perfil político (Eleitor Frequente, Simpatizante, etc.)
  - Tags sensíveis (religião, renda, dados demográficos)
  - Tags de contato (WhatsApp Ativo, Email Ativo, etc.)
  - Tags de localização (Centro, Zona Norte, etc.)

- **Sistema de validação**
  - Script de diagnóstico completo (`07_diagnostico.sql`)
  - Testes de funcionalidade e RLS
  - Validação de estrutura e permissões
  - Documentação de validação pós-execução

- **Documentação completa**
  - ADR (Architecture Decision Record)
  - README com instruções de instalação e uso
  - Changelog detalhado
  - Guia de validação pós-execução

### Características Técnicas
- **Idempotência**: Todos os scripts podem ser executados múltiplas vezes
- **Segurança**: RLS rigoroso baseado na propriedade existente (`people.owner_id`)
- **Performance**: Índices otimizados para consultas frequentes
- **LGPD**: Controle de tags sensíveis com restrição de acesso
- **Compatibilidade**: Não modifica estrutura existente do banco
- **Detecção de Admin**: Usa `app_admins` em vez de `profiles.role`

### Objetos Criados

#### Tabelas
- `public.tags` - Catálogo global de tags
- `public.people_tags` - Relação N:N entre pessoas e tags

#### Views
- `public.vw_people_with_tags` - Pessoas com tags agrupadas em JSON

#### Funções
- `public.is_current_user_admin()`
- `public.is_person_owned_by_current_user(uuid)`
- `public.is_admin(uuid)`
- `public.can_access_sensitive_tag(uuid)`
- `public.get_person_tags(uuid)`
- `public.search_people_with_tags(text, uuid[], text, int, int)`
- `public.apply_tag_to_person(uuid, uuid)`
- `public.remove_tag_from_person(uuid, uuid)`
- `public.get_available_tags()`
- `public.verify_tags_grants()`
- `public.check_tags_seeds()`

#### Políticas RLS
- `tags_select_active` - SELECT para authenticated
- `tags_insert_admin` - INSERT apenas para ADMIN
- `tags_update_admin` - UPDATE apenas para ADMIN
- `tags_delete_admin` - DELETE apenas para ADMIN
- `people_tags_select_owner_or_admin` - SELECT baseado em propriedade
- `people_tags_insert_owner_or_admin` - INSERT baseado em propriedade
- `people_tags_update_owner_or_admin` - UPDATE baseado em propriedade
- `people_tags_delete_owner_or_admin` - DELETE baseado em propriedade

#### Índices
- `idx_tags_name` - Índice no nome da tag
- `idx_tags_active` - Índice parcial para tags ativas
- `idx_people_tags_person_id` - Índice em person_id
- `idx_people_tags_tag_id` - Índice em tag_id
- `idx_people_tags_created_by` - Índice em created_by

#### Triggers
- `trg_tags_updated_at` - Atualiza updated_at na tabela tags
- `trg_people_tags_updated_at` - Atualiza updated_at na tabela people_tags

### Modos de Busca Suportados
- **ANY (OR)**: Pessoa deve ter pelo menos uma das tags especificadas
- **ALL (AND)**: Pessoa deve ter todas as tags especificadas

### Tags Sensíveis Incluídas
- Religião: Católico, Evangélico, Espírita, Ateu/Agnóstico
- Renda: Classe A, B, C, D, E
- Dados demográficos: Idoso, Jovem, Família com Crianças
- Benefícios sociais: Bolsa Família, Auxílio Brasil

### Arquivos de Instalação
1. `01_ddl_tables.sql` - Estrutura das tabelas
2. `02_helper_functions.sql` - Funções auxiliares
3. `03_rls_policies.sql` - Políticas de segurança
4. `04_rpcs_views.sql` - RPCs e views
5. `05_grants.sql` - Permissões
6. `06_seeds.sql` - Dados iniciais (opcional)
7. `07_diagnostico.sql` - Validação (opcional)

### Documentação
- `ADR-tags.md` - Decisão de arquitetura
- `README.md` - Guia de instalação e uso
- `CHANGELOG.md` - Este arquivo
- `validacao_pos_execucao.md` - Checklist de validação

---

## [Unreleased]

### Planejado
- Integração com frontend React
- Interface de gerenciamento de tags
- Relatórios de uso de tags
- Exportação de dados com tags
- API REST para tags
- Histórico de alterações de tags
- Notificações de tags aplicadas/removidas

### Em Consideração
- Tags hierárquicas (categorias e subcategorias)
- Tags automáticas baseadas em regras
- Integração com sistema de campanhas
- Analytics de efetividade por tags
- Tags temporárias (com data de expiração)
- Importação em massa de tags

---

## Notas de Versão

### Versão 1.0.0
- **Data de Lançamento**: 2025-01-16
- **Tipo**: Release inicial
- **Compatibilidade**: Supabase PostgreSQL 15+
- **Breaking Changes**: Nenhuma (sistema novo)
- **Dependências**: Tabelas `profiles`, `people` e `app_admins` existentes
- **Testes**: Script de diagnóstico completo incluído
- **Documentação**: Completa e detalhada

### Próximas Versões
- **1.1.0**: Integração com frontend
- **1.2.0**: Relatórios e analytics
- **2.0.0**: Tags hierárquicas e funcionalidades avançadas