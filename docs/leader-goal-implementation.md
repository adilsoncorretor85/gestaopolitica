# Implementação do Sistema de Meta do Líder

## Visão Geral

Este documento descreve a implementação do sistema de meta do líder, que garante que cada líder veja apenas sua própria meta, com fallback controlado para a meta padrão da organização.

## Arquitetura

### Fonte de Verdade
- **Primária**: RPC `get_my_goal_info()` no Supabase
- **Fallback**: `leader_profiles.goal` → `org_settings.default_goal`

### Componentes Principais

#### 1. Hook `useLeaderGoal`
**Arquivo**: `src/hooks/useLeaderGoal.ts`

- **Responsabilidade**: Buscar e gerenciar a meta do líder autenticado
- **Tecnologia**: React Query para cache e gerenciamento de estado
- **Validação**: Zod para garantir tipos corretos

**Fluxo de Busca**:
1. Tenta RPC `get_my_goal_info()` primeiro
2. Se falhar, busca `leader_profiles.goal` do usuário autenticado
3. Se não houver meta personalizada, usa `org_settings.default_goal`
4. Marca a fonte da meta: `LEADER`, `ORG`, ou `FALLBACK`

#### 2. Componente `DashboardGoalCard`
**Arquivo**: `src/components/DashboardGoalCard.tsx`

- **Responsabilidade**: Exibir a meta do líder de forma clara
- **Estados**: Loading, erro, sucesso
- **Debug**: Mostra fonte da meta quando `VITE_DEBUG_GOAL=1`

#### 3. Integração no Dashboard
**Arquivo**: `src/pages/Dashboard.tsx`

- **Líderes**: Veem apenas sua meta pessoal
- **Administradores**: Veem soma de todas as metas
- **Cache**: Invalidação automática ao trocar usuário

## Configuração

### Variáveis de Ambiente

```bash
# Para habilitar logs de debug da meta
VITE_DEBUG_GOAL=1
```

### React Query

O projeto usa React Query para:
- Cache inteligente (1 minuto de stale time)
- Retry automático (2 tentativas)
- Invalidação de cache ao trocar usuário

## Uso

### Hook Básico

```typescript
import { useLeaderGoal } from '@/hooks/useLeaderGoal';

function MyComponent() {
  const { data, isLoading, error } = useLeaderGoal();
  
  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar meta</div>;
  
  return (
    <div>
      Meta: {data.goal}
      Fonte: {data.source}
    </div>
  );
}
```

### Invalidação de Cache

```typescript
import { useInvalidateLeaderGoal } from '@/hooks/useLeaderGoal';

function UpdateGoalForm() {
  const invalidate = useInvalidateLeaderGoal();
  
  const handleUpdate = async () => {
    // Atualizar meta no banco
    await updateGoal(newGoal);
    
    // Invalidar cache para refetch
    invalidate();
  };
}
```

## Tipos TypeScript

```typescript
type GoalInfo = {
  goal: number;           // Meta efetiva
  source: 'LEADER' | 'ORG' | 'FALLBACK';  // Fonte da meta
};
```

## Políticas RLS

O sistema depende das seguintes políticas RLS:

### `leader_profiles`
- Líderes podem ler apenas seu próprio perfil
- Administradores podem ler todos os perfis

### `org_settings`
- Todos podem ler configurações
- Apenas administradores podem modificar

## Debug

### Logs de Debug

Com `VITE_DEBUG_GOAL=1`, o sistema exibe logs detalhados:

```
🎯 [useLeaderGoal] Iniciando busca da meta...
✅ [useLeaderGoal] RPC get_my_goal_info → { goal: 2000, source: 'LEADER' }
```

### Badge de Fonte

No modo debug, o componente mostra a fonte da meta:

```
Meta: 2000
Fonte: LEADER
```

## Casos de Uso

### 1. Líder com Meta Personalizada
- **RPC**: Retorna `{ effective_goal: 2000, source: 'user_defined' }`
- **Resultado**: Meta 2000, fonte `LEADER`

### 2. Líder sem Meta Personalizada
- **RPC**: Retorna `{ effective_goal: 120, source: 'organization_default' }`
- **Resultado**: Meta 120, fonte `ORG`

### 3. RPC Indisponível
- **Fallback**: Busca `leader_profiles.goal`
- **Resultado**: Meta do perfil ou padrão da organização

## Benefícios

1. **Isolamento**: Cada líder vê apenas sua meta
2. **Confiabilidade**: Fallback robusto se RPC falhar
3. **Performance**: Cache inteligente com React Query
4. **Debug**: Logs detalhados para troubleshooting
5. **Type Safety**: Validação com Zod e TypeScript

## Manutenção

### Adicionar Nova Fonte de Meta

1. Atualizar enum `source` no schema Zod
2. Adicionar lógica no hook `useLeaderGoal`
3. Atualizar mapeamento de texto no componente

### Modificar Cache

1. Ajustar `staleTime` no hook
2. Configurar `retry` e `retryDelay`
3. Atualizar invalidação de cache

## Troubleshooting

### Meta não atualiza
- Verificar se RPC `get_my_goal_info` existe
- Confirmar políticas RLS
- Verificar logs de debug

### Cache não invalida
- Confirmar listener de `onAuthStateChange`
- Verificar se `useInvalidateLeaderGoal` está sendo usado

### Erro de permissão
- Verificar se usuário está autenticado
- Confirmar políticas RLS para `leader_profiles`
