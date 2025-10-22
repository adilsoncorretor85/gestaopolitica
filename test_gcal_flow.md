# 🔍 Diagnóstico Google Calendar - Checklist

## ✅ Verificações Realizadas

### 1. Migration (DDL)
- [x] Tabelas criadas com `IF NOT EXISTS`
- [x] Policies com `DROP IF EXISTS` (idempotente)
- [x] Policy de `gcal_events` usa `app_leaders_list` ✅
- [x] `app_is_admin` usa `profiles.role` (já existente) ✅

### 2. Edge Function `gcal_callback`
- [x] Upsert usa os nomes corretos:
  - `owner_profile_id` (não `user_id`)
  - `expires_at` (não `token_expires_at`)
  - `google_user_id`, `scope`, `token_type` incluídos
- [x] `SERVICE_ROLE_KEY` configurado

### 3. Variáveis de Ambiente
- [x] `supabase/config.toml` tem todas as secrets:
  - `SITE_URL`
  - `SERVICE_ROLE_KEY`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GCAL_REDIRECT_URI`

---

## 🐛 Erro Atual

**Sintoma:** "Missing authorization header"

**Onde aparece:** Quando clica em "Conectar Google Calendar"

**Possíveis causas:**

1. ❓ Frontend não está enviando o token de auth
2. ❓ Token expirou
3. ❓ `gcal_begin` não está recebendo o header corretamente
4. ❓ Usuário não está logado

---

## 🧪 Testes para fazer

### Teste 1: Verificar se usuário está logado
```javascript
// No console do navegador (http://localhost:5173/agenda)
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)
console.log('User:', session?.user)
```

**Esperado:** Session existe e user não é null

### Teste 2: Testar chamada direta à Edge Function
```javascript
// No console do navegador
const supabase = getSupabaseClient()
const { data, error } = await supabase.functions.invoke('gcal_begin', { 
  method: 'GET'
})
console.log('Data:', data)
console.log('Error:', error)
```

**Esperado:** Retorna `{ authUrl: "https://accounts.google.com/..." }`

### Teste 3: Verificar headers enviados
```javascript
// Abrir DevTools > Network
// Clicar em "Conectar Google Calendar"
// Ver request para gcal_begin
// Verificar headers:
// - Authorization: Bearer <token>
// - apikey: <anon_key>
```

**Esperado:** Ambos headers presentes

### Teste 4: Ver logs da Edge Function
```bash
# No terminal
npx supabase functions logs gcal_begin --follow
```

**Esperado:** Ver o erro específico

---

## 🔧 Possíveis Soluções

### Se o erro é "Missing authorization header":

**Solução 1:** Verificar se `useAuth` retorna user válido
```typescript
// src/pages/Agenda.tsx - linha 14
const { user, profile } = useAuth();
console.log('User:', user)  // Deve ter valor
console.log('Profile:', profile)  // Deve ter role='ADMIN'
```

**Solução 2:** Forçar reautenticação
```typescript
// Fazer logout e login novamente
await supabase.auth.signOut()
// Fazer login novamente
```

**Solução 3:** Verificar se `getSupabaseClient` retorna cliente autenticado
```typescript
// src/lib/supabaseClient.ts
// Deve pegar session do localStorage
```

---

## 📝 Próximos Passos

1. ⬜ Executar Teste 1 (verificar sessão)
2. ⬜ Executar Teste 2 (chamar Edge Function)
3. ⬜ Executar Teste 3 (verificar headers)
4. ⬜ Executar Teste 4 (ver logs)
5. ⬜ Aplicar solução baseada nos resultados




