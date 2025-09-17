# ADR - Sistema de Tags para Pessoas

**Data:** 2025-01-16  
**Status:** Aprovado  
**Contexto:** Gestão Política - Sistema de Tags

## Decisão

Implementar um sistema de tags para categorização de pessoas (contatos) no sistema de gestão política, permitindo que administradores criem tags globais e líderes atribuam tags existentes aos seus contatos.

## Contexto

O sistema de gestão política precisa de uma forma flexível de categorizar e filtrar contatos para:
- Segmentação de campanhas
- Análise de perfil dos eleitores
- Organização de contatos por características específicas
- Melhoria na eficiência de contato e engajamento

### Requisitos Identificados

1. **Administradores** devem poder criar, editar e desativar tags globais
2. **Líderes** devem poder apenas atribuir/remover tags existentes aos seus contatos
3. **Busca** deve suportar filtros por tags (modo OR/AND)
4. **Segurança** deve respeitar a propriedade de contatos existente
5. **LGPD** deve considerar tags sensíveis (religião, renda, etc.)
6. **Performance** deve suportar consultas eficientes

### Restrições Técnicas

- Não modificar estrutura existente do banco
- Manter compatibilidade com RLS atual
- Não executar operações destrutivas
- Scripts devem ser idempotentes
- Não alterar frontend neste momento
- Usar `app_admins` para detecção de administradores

## Alternativas Consideradas

### 1. Campos JSON na tabela people
**Prós:** Simples, sem tabelas adicionais
**Contras:** Difícil de indexar, consultas complexas, sem controle de tags globais

### 2. Tabela única com tags como texto livre
**Prós:** Muito simples
**Contras:** Sem padronização, duplicatas, sem metadados das tags

### 3. Sistema de tags com relação N:N (ESCOLHIDA)
**Prós:** Flexível, padronizado, performático, extensível
**Contras:** Mais complexo, requer duas tabelas

## Decisão Detalhada

### Arquitetura Escolhida

```
people (existente)
  ↓ (1:N)
people_tags (nova)
  ↓ (N:1)
tags (nova)
```

### Componentes

#### 1. Tabela `tags`
- Catálogo global de tags disponíveis
- Campos: id, name, description, color, is_active, is_sensitive
- Controle de criação/edição apenas por ADMIN (via `app_admins`)
- Suporte a tags sensíveis (LGPD)

#### 2. Tabela `people_tags`
- Relação N:N entre pessoas e tags
- Campos: id, person_id, tag_id, created_by, timestamptz
- Constraint UNIQUE(person_id, tag_id)
- FKs com CASCADE para limpeza automática

#### 3. Funções Auxiliares
- `is_current_user_admin()`: Verifica se usuário é administrador via `app_admins`
- `is_person_owned_by_current_user(person_id)`: Verifica propriedade via `people.owner_id`
- `can_access_sensitive_tag(tag_id)`: Controle de acesso a tags sensíveis

#### 4. Políticas RLS
- **tags**: SELECT para authenticated (apenas ativas), CRUD apenas ADMIN
- **people_tags**: Baseado na propriedade da pessoa (owner_id)

#### 5. RPCs e Views
- `search_people_with_tags()`: Busca com filtros de texto e tags
- `vw_people_with_tags`: View para análises
- RPCs para aplicar/remover tags

### Regras de Negócio

#### Propriedade de Contatos
- Baseada em `people.owner_id` (regra existente)
- Líder só pode gerenciar tags das suas pessoas
- Admin pode gerenciar tags de qualquer pessoa

#### Detecção de Administradores
- Baseada em `app_admins.user_id` (não `profiles.role`)
- Função `is_current_user_admin()` verifica `EXISTS(SELECT 1 FROM app_admins WHERE user_id = auth.uid())`

#### Tags Sensíveis
- Marcadas com `is_sensitive = true`
- Visíveis apenas para administradores
- Exemplos: religião, renda, dados pessoais específicos

#### Modos de Busca
- **ANY (OR)**: Pessoa deve ter pelo menos uma das tags
- **ALL (AND)**: Pessoa deve ter todas as tags especificadas

## Consequências

### Positivas
- ✅ Sistema flexível e extensível
- ✅ Controle granular de permissões
- ✅ Suporte a LGPD com tags sensíveis
- ✅ Performance otimizada com índices
- ✅ Compatibilidade com sistema existente
- ✅ Scripts idempotentes e seguros
- ✅ Uso correto de `app_admins` para administradores

### Negativas
- ❌ Complexidade adicional no banco
- ❌ Mais tabelas para manter
- ❌ Curva de aprendizado para desenvolvedores

### Riscos
- **Performance**: Mitigado com índices adequados
- **Segurança**: Mitigado com RLS rigoroso
- **LGPD**: Mitigado com controle de tags sensíveis
- **Compatibilidade**: Mitigado com testes extensivos

## Implementação

### Fases
1. **Fase 1**: Estrutura básica (tabelas, funções, RLS)
2. **Fase 2**: RPCs e views de consulta
3. **Fase 3**: Seeds opcionais e validação
4. **Fase 4**: Integração com frontend (futuro)

### Critérios de Aceite
- [ ] Scripts SQL idempotentes
- [ ] RLS funcionando corretamente
- [ ] Busca por tags (ANY/ALL) funcionando
- [ ] Tags sensíveis restritas a admins
- [ ] Performance adequada em consultas
- [ ] Documentação completa
- [ ] Uso correto de `app_admins`

## Monitoramento

### Métricas a Acompanhar
- Performance das consultas com tags
- Uso de tags sensíveis
- Erros de permissão RLS
- Crescimento do volume de dados

### Alertas
- Consultas lentas (>1s)
- Tentativas de acesso a tags sensíveis
- Falhas de RLS

## Revisão

Esta ADR será revisada em:
- **3 meses**: Avaliar uso e performance
- **6 meses**: Considerar melhorias baseadas no uso
- **1 ano**: Avaliar necessidade de refatoração

## Aprovação

- **Arquiteto**: ✅ Aprovado
- **DevOps**: ✅ Aprovado  
- **LGPD**: ✅ Aprovado (com controles de tags sensíveis)
- **Product**: ✅ Aprovado

---

**Próximos Passos:**
1. Implementar scripts SQL
2. Executar testes de validação
3. Documentar uso para desenvolvedores
4. Planejar integração com frontend