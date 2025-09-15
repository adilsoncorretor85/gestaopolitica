# Configuração de URLs do Supabase Auth

## URLs que devem ser configuradas no Supabase Dashboard

### 1. Site URL (Produção)
```
https://seu-dominio.com
```

### 2. Additional Redirect URLs
Adicione todas as URLs abaixo no Supabase Dashboard → Authentication → URL Configuration:

#### Produção:
```
https://seu-dominio.com/convite
https://seu-dominio.com/definir-senha
```

#### Desenvolvimento Local:
```
http://localhost:5173/convite
http://localhost:5173/definir-senha
```

### 3. Fluxo de Recuperação de Senha

O fluxo atual está correto:

1. **Solicitação de reset**: `/reset-password`
   - Usa `supabase.auth.resetPasswordForEmail()`
   - Redireciona para `/definir-senha`

2. **Definição de nova senha**: `/definir-senha`
   - Usa `supabase.auth.exchangeCodeForSession()` primeiro
   - Depois usa `supabase.auth.updateUser({ password })`
   - Redireciona para `/login` após sucesso

### 4. Verificação de Configuração

Para verificar se as URLs estão corretas:

1. Acesse: https://supabase.com/dashboard/project/ojxwwjurwhwtoydywvch/auth/url-configuration
2. Verifique se todas as URLs acima estão listadas
3. Teste o fluxo de reset de senha localmente e em produção

### 5. Problemas Comuns

- **Erro "Invalid redirect URL"**: URL não está na lista de redirects permitidos
- **Erro "Invalid code"**: Link expirou ou foi usado mais de uma vez
- **Erro "Session not found"**: `exchangeCodeForSession()` não foi chamado antes de `updateUser()`
