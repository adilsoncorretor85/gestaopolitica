# Uso das Funções RPC para Metas

## Visão Geral

As funções RPC `get_my_effective_goal()` e `get_my_goal_info()` foram criadas para simplificar o acesso às metas dos usuários, eliminando problemas de RLS e "ping-pong" entre tabelas.

## Funções Disponíveis

### 1. `get_my_effective_goal()`
Retorna apenas o valor da meta efetiva (integer).

```typescript
const { data: goal, error } = await supabase.rpc('get_my_effective_goal');
if (error) { /* tratar */ }
setGoal(goal ?? 0);
```

### 2. `get_my_goal_info()`
Retorna informações completas sobre a meta (JSON).

```typescript
const { data: goalInfo, error } = await supabase.rpc('get_my_goal_info');
if (error) { /* tratar */ }

// goalInfo contém:
// {
//   effective_goal: 2000,
//   user_goal: 2000,
//   default_goal: 120,
//   source: "user_defined"
// }
```

## Implementação no Frontend

### Serviço (src/services/goal.ts)
```typescript
import { getSupabaseClient } from '@/lib/supabaseClient';

export async function getMyEffectiveGoal(): Promise<number> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_my_effective_goal');
  
  if (error) throw new Error(`Falha ao buscar meta: ${error.message}`);
  return data ?? 0;
}

export async function getMyGoalInfo(): Promise<GoalInfo> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_my_goal_info');
  
  if (error) throw new Error(`Falha ao buscar informações da meta: ${error.message}`);
  return data as GoalInfo;
}
```

### Uso no Dashboard
```typescript
// Buscar meta do líder
const goalInfo = await getMyGoalInfo();
const leaderGoal = goalInfo.effective_goal;

// Mostrar fonte da meta
const sourceText = goalInfo.source === 'user_defined' 
  ? 'Meta personalizada' 
  : 'Meta padrão da organização';
```

## Benefícios

1. **Sem RLS complicada**: As funções usam `SECURITY DEFINER` e `auth.uid()` internamente
2. **Sem risco de "ping-pong"**: Lógica centralizada no banco de dados
3. **Sempre retorna a meta correta**: Usa `auth.uid()` para identificar o usuário
4. **Performance melhor**: Uma única chamada RPC em vez de múltiplas queries
5. **Lógica centralizada**: Mudanças na lógica de meta só precisam ser feitas no banco

## Lógica das Funções

1. **Busca meta do usuário** em `leader_profiles.goal`
2. **Busca meta padrão** em `org_settings.default_goal`
3. **Determina meta efetiva**:
   - Se usuário tem meta definida e > 0: usa meta do usuário
   - Senão: usa meta padrão da organização
4. **Retorna resultado** (integer ou JSON)

## Exemplo de Resultado

```json
{
  "effective_goal": 2000,
  "user_goal": 2000,
  "default_goal": 120,
  "source": "user_defined"
}
```

## Instalação

Execute o script SQL:
```sql
-- Execute: scripts/create-goal-rpc-functions.sql
```

## Teste

```sql
-- Testar função simples
SELECT public.get_my_effective_goal();

-- Testar função completa
SELECT public.get_my_goal_info();
```
