# 🚨 PROCESSOS IMPORTANTES - NÃO ESQUECER

## ⚠️ REGRAS CRÍTICAS:
1. **NUNCA** fazer `supabase db reset` sem backup dos dados
2. **SEMPRE** verificar se há dados importantes antes de resetar
3. **SEMPRE** anotar o que foi feito para não repetir erros
4. **🚨 SUPABASE ONLINE**: APENAS CONSULTAS - NUNCA ALTERAR NADA
5. **🚨 SUPABASE ONLINE**: SÓ PODE FAZER SELECT, NUNCA INSERT/UPDATE/DELETE
6. **🚨 SEMPRE** confirmar que está na pasta do projeto antes de executar comandos
7. **🚨 NUNCA** usar `pg_dump` direto - sempre usar scripts JavaScript que funcionam

## 📊 STATUS ATUAL (21/10/2025):
- ✅ **DADOS RESTAURADOS**: 600 pessoas com acentos corretos
- ✅ **Usuário admin**: admin@teste.com / admin123
- ✅ **Usuário gestor**: gestor@teste.com / gestor123
- ✅ **Supabase Local**: Rodando com Edge Functions
- ✅ **Edge Functions**: Configuradas com Google Calendar
- ✅ **Frontend**: Rodando em http://localhost:5173
- ✅ **Google Maps**: API Key configurada
- ✅ **WhatsApp Único**: Validação entre líderes funcionando

## 🔄 PROCESSO CORRETO PARA RESTAURAR (ORDEM OBRIGATÓRIA):

### 1. PRIMEIRO: Confirmar pasta do projeto
```bash
cd "E:\Programas em desevolvimento\gestaopolitica"
Test-Path package.json  # Deve retornar True
```

### 2. SEGUNDO: Resetar banco local limpo
```bash
npx supabase db reset
```

### 3. TERCEIRO: Importar schema completo do Online
```bash
npx supabase db dump --linked --file schema_online.sql
Get-Content schema_online.sql | docker exec -i supabase_db_gestaopolitica psql -U postgres -d postgres
```

### 4. QUARTO: Criar usuário admin
```sql
-- Executar create_admin_final.sql
```

### 5. QUINTO: Importar dados usando script JavaScript (CORRETO!)
```bash
node import_with_service_key.js
```

### 6. SEXTO: Configurar Edge Functions
```bash
# Criar supabase/.env
# Configurar secrets
npx supabase functions serve
```

### 7. SÉTIMO: Iniciar frontend
```bash
npm run dev
```

## 🎯 MÉTODO QUE FUNCIONA (USAR SEMPRE):

### ✅ **IMPORTAR DADOS COM ACENTOS CORRETOS:**
```bash
# 1. Usar script JavaScript (NÃO pg_dump direto!)
node import_with_service_key.js

# 2. Verificar se acentos estão corretos
docker exec -i supabase_db_gestaopolitica psql -U postgres -d postgres -c "SELECT full_name FROM public.people LIMIT 5;"
```

### 🔧 **COMO RESOLVER PROBLEMAS DE FORMATAÇÃO/ACENTOS:**

#### ❌ **PROBLEMA:** Acentos aparecem como `??` (ex: "Rom??o" em vez de "Romão")
```sql
-- Exemplo do problema:
SELECT full_name FROM public.people LIMIT 5;
-- Resultado: Huiliam Rom??o, Angelita de C??ssia Mudrek
```

#### ✅ **SOLUÇÃO:** Usar script JavaScript em vez de pg_dump direto
```bash
# ❌ MÉTODO ERRADO (perde acentos):
npx supabase db dump --linked --data-only --file dados_online.sql
Get-Content dados_online.sql | docker exec -i supabase_db_gestaopolitica psql -U postgres -d postgres

# ✅ MÉTODO CORRETO (mantém acentos):
node import_with_service_key.js
```

#### 🔍 **VERIFICAÇÃO DE ACENTOS:**
```bash
# Verificar se acentos estão corretos
docker exec -i supabase_db_gestaopolitica psql -U postgres -d postgres -c "SELECT full_name FROM public.people LIMIT 5;"

# ✅ Resultado correto: Inajara Freitas Villar Paiva Mastelari
# ❌ Resultado errado: Inajara Freitas Villar Paiva Mastelar??
```

### ❌ **MÉTODOS QUE NÃO FUNCIONAM:**
- `pg_dump` direto (perde acentos)
- `Get-Content dados_online.sql | docker exec...` (codificação errada)
- Comandos executados fora da pasta do projeto

## 📝 LIÇÕES APRENDIDAS (CRÍTICAS):
- **SEMPRE** usar scripts JavaScript para importar dados
- **NUNCA** usar `pg_dump` direto - perde codificação UTF-8
- **SEMPRE** confirmar pasta do projeto antes de executar comandos
- **SEMPRE** verificar se acentos estão corretos após importação
- **NUNCA** ter pressa - fazer com cuidado e seguir a ordem
- **SEMPRE** anotar processos que funcionam para não esquecer

## 🔧 COMANDOS DE VERIFICAÇÃO:
```bash
# Verificar se está na pasta correta
Test-Path package.json

# Verificar dados importados
docker exec -i supabase_db_gestaopolitica psql -U postgres -d postgres -c "SELECT COUNT(*) FROM public.people;"

# Verificar acentos
docker exec -i supabase_db_gestaopolitica psql -U postgres -d postgres -c "SELECT full_name FROM public.people LIMIT 5;"
```

## 🚨 REGRA CRÍTICA: COMANDOS NPM

**SEMPRE usar caminho absoluto para comandos npm para evitar erro de diretório:**

```bash
# ❌ ERRADO - causa erro ENOENT
npm run dev

# ✅ CORRETO - usar caminho absoluto
& "E:\Programas em desevolvimento\gestaopolitica\node_modules\.bin\vite" --port 5174

# ✅ ALTERNATIVA - navegar primeiro
Set-Location "E:\Programas em desevolvimento\gestaopolitica"
npm run dev
```

**Motivo**: O terminal PowerShell às vezes executa no diretório errado (`C:\Users\adils\`), causando erro `ENOENT: no such file or directory, open 'C:\Users\adils\package.json'`.

## 📅 GOOGLE CALENDAR - CONFIGURAÇÃO

### Variáveis de Ambiente Necessárias:

#### 1. Frontend (`.env`):
```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDGJnbNad10CANDkpLAqVy7c3fSV0V3SK8
```

#### 2. Backend/Edge Functions (`supabase/config.toml`):
```toml
[edge_runtime.secrets]
SITE_URL = "http://localhost:5173"
GOOGLE_CLIENT_ID = "env(GOOGLE_CLIENT_ID)"
GOOGLE_CLIENT_SECRET = "env(GOOGLE_CLIENT_SECRET)"
GCAL_REDIRECT_URI = "http://localhost:5173/agenda"
```

#### 3. Arquivo `.env` (variáveis para Google Calendar):
```env
GOOGLE_CLIENT_ID=sua_chave_google_client_id
GOOGLE_CLIENT_SECRET=sua_chave_google_client_secret
```

### ⚠️ IMPORTANTE:
- O Google Calendar só funciona para usuários **ADMIN**
- É necessário criar credenciais OAuth 2.0 no Google Cloud Console
- Após configurar as credenciais reais, substituir os placeholders
- **NUNCA commitar as chaves reais** no git

### 🔄 Processo para Ativar Google Calendar:
1. Acessar [Google Cloud Console](https://console.cloud.google.com/)
2. Criar um projeto ou selecionar um existente
3. Habilitar a **Google Calendar API**
4. Criar credenciais OAuth 2.0
5. Adicionar `http://localhost:5173/agenda` como URI de redirecionamento autorizado
6. Copiar Client ID e Client Secret
7. Adicionar no arquivo `.env` do projeto
8. Reiniciar Supabase: `npx supabase stop && npx supabase start`
9. Reiniciar frontend: `npm run dev`
