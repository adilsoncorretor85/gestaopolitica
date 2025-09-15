# Roteiro de Testes de Aceite

## **Pré-requisitos**
1. Arquivo `.env` criado com as variáveis corretas
2. Patches SQL aplicados no banco
3. Patches de frontend aplicados
4. URLs de redirect configuradas no Supabase

## **Teste 1: Login ADM**
**Objetivo**: Verificar se login de administrador persiste

### Passos:
1. Acesse a aplicação
2. Faça login com `admin@gabitechnology.cloud`
3. Verifique se é redirecionado para `/dashboard`
4. **Resultado esperado**: Sessão permanece, sem redirect para logout

### Critérios de aceite:
- ✅ Login bem-sucedido
- ✅ Redirecionamento para dashboard
- ✅ Sessão persiste por pelo menos 5 minutos
- ✅ Não há erros 401/403 no console

## **Teste 2: Dashboard carrega**
**Objetivo**: Verificar se dashboard carrega corretamente

### Passos:
1. Após login bem-sucedido, verifique o dashboard
2. Observe o countdown de eleição
3. Verifique se a meta do usuário aparece
4. **Resultado esperado**: Dashboard carrega sem erros

### Critérios de aceite:
- ✅ `public_settings` responde em < 200ms
- ✅ Cronômetro aparece com data correta
- ✅ `get_my_goal_info` retorna `effective_goal=2000` (ou valor configurado)
- ✅ Não há erros no console

## **Teste 3: Líder comum**
**Objetivo**: Verificar isolamento de dados

### Passos:
1. Faça login com um usuário líder
2. Tente acessar dados de outros líderes
3. Verifique se só vê seus próprios dados
4. **Resultado esperado**: Isolamento correto

### Critérios de aceite:
- ✅ Só vê seus próprios dados
- ✅ Tentativa de ler outro líder resulta em 0 linhas (não erro)
- ✅ Não consegue acessar dados de outros usuários

## **Teste 4: Admin vê tudo**
**Objetivo**: Verificar se admin tem acesso total

### Passos:
1. Faça login como admin
2. Acesse funcionalidades administrativas
3. Verifique se consegue ver dados de todos os usuários
4. **Resultado esperado**: Acesso total

### Critérios de aceite:
- ✅ RPC de listagem retorna todos os dados
- ✅ Sem erros 401/403
- ✅ Consegue acessar todas as funcionalidades

## **Teste 5: Reset de senha**
**Objetivo**: Verificar fluxo de recuperação

### Passos:
1. Acesse `/reset-password`
2. Insira um email válido
3. Verifique se recebe email
4. Clique no link do email
5. Defina nova senha
6. **Resultado esperado**: Fluxo completo funciona

### Critérios de aceite:
- ✅ Link abre `/definir-senha`
- ✅ `exchangeCodeForSession` roda sem erro
- ✅ `updateUser` funciona
- ✅ Sessão persiste após reset
- ✅ Redirecionamento para login funciona

## **Teste 6: Performance**
**Objetivo**: Verificar se cache está funcionando

### Passos:
1. Abra DevTools → Network
2. Recarregue a página
3. Verifique tempo de resposta das chamadas
4. **Resultado esperado**: Cache rápido

### Critérios de aceite:
- ✅ `public_settings` < 200ms
- ✅ `get_current_election` < 500ms (fallback)
- ✅ `get_my_goal_info` < 300ms
- ✅ Total de carregamento < 2s

## **Teste 7: Tratamento de erros**
**Objetivo**: Verificar se erros são tratados graciosamente

### Passos:
1. Desconecte a internet
2. Tente fazer login
3. Reconecte e tente novamente
4. **Resultado esperado**: Erros tratados

### Critérios de aceite:
- ✅ Mensagens de erro claras
- ✅ Não há crashes
- ✅ Recuperação automática funciona

## **Checklist Final**
- [ ] Todos os testes passaram
- [ ] Não há erros no console
- [ ] Performance aceitável
- [ ] Funcionalidades principais funcionam
- [ ] Segurança mantida (RLS)
- [ ] Cache funcionando
- [ ] Fallbacks funcionando
