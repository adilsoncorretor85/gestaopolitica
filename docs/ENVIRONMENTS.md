# 🌍 Configuração de Ambientes

Este documento explica como configurar e alternar entre os ambientes de desenvolvimento local e produção online.

## 📁 Arquivos de Configuração

### `.env.local`
Configuração para desenvolvimento local com Supabase local.

### `.env.online` 
Configuração para produção com Supabase na nuvem.

### `.env`
Arquivo ativo que é copiado de um dos arquivos acima.

## 🔄 Alternando Entre Ambientes

### Usando PowerShell (Windows)
```powershell
# Alterar para ambiente local
.\scripts\switch-env.ps1 local

# Alterar para ambiente online
.\scripts\switch-env.ps1 online

# Ver status atual
.\scripts\switch-env.ps1 status
```

### Usando Node.js (Cross-platform)
```bash
# Alterar para ambiente local
node scripts/switch-env.js local

# Alterar para ambiente online
node scripts/switch-env.js online

# Ver status atual
node scripts/switch-env.js status
```

## 🏠 Ambiente Local

### Configuração
- **URL**: `http://127.0.0.1:54321`
- **ANON_KEY**: Chave padrão do Supabase local
- **Debug**: Habilitado
- **Analytics**: Desabilitado

### Iniciando o Supabase Local
```bash
# Iniciar todos os serviços
npx supabase start

# Verificar status
npx supabase status

# Parar serviços
npx supabase stop
```

### Acessos Locais
- **API**: http://127.0.0.1:54321
- **Studio**: http://127.0.0.1:54323
- **App**: http://localhost:5173

## ☁️ Ambiente Online

### Configuração
- **URL**: `https://ojxwwjurwhwtoydywvch.supabase.co`
- **ANON_KEY**: Chave de produção
- **Debug**: Desabilitado
- **Analytics**: Habilitado

## 🚀 Workflow de Desenvolvimento

### 1. Desenvolvimento Local
```bash
# 1. Alterar para ambiente local
.\scripts\switch-env.ps1 local

# 2. Iniciar Supabase local
npx supabase start

# 3. Iniciar aplicação
npm run dev
```

### 2. Teste em Produção
```bash
# 1. Alterar para ambiente online
.\scripts\switch-env.ps1 online

# 2. Iniciar aplicação
npm run dev
```

### 3. Deploy
```bash
# 1. Garantir que está no ambiente online
.\scripts\switch-env.ps1 online

# 2. Build para produção
npm run build

# 3. Deploy (Netlify, Vercel, etc.)
```

## 🔧 Configurações Específicas

### Google Maps API
A chave do Google Maps é a mesma para ambos os ambientes, pois não há diferença entre local e online.

### PWA
- **Local**: `http://localhost:5173`
- **Online**: `https://seu-dominio.com`

### Features Flags
- **Local**: Analytics desabilitado, debug habilitado
- **Online**: Analytics habilitado, debug desabilitado

## 🛠️ Troubleshooting

### Problema: Container já existe
```bash
# Parar containers
npx supabase stop

# Remover containers órfãos
docker container prune

# Tentar novamente
npx supabase start
```

### Problema: Porta já em uso
```bash
# Verificar processos usando a porta
netstat -ano | findstr :54321

# Parar processo específico
taskkill /PID <PID> /F
```

### Problema: Arquivo .env não encontrado
```bash
# Verificar arquivos disponíveis
.\scripts\switch-env.ps1 status

# Criar arquivo local se necessário
Copy-Item .env.online .env.local
```

## 📋 Checklist de Configuração

- [ ] Arquivo `.env.local` criado
- [ ] Arquivo `.env.online` criado (backup do atual)
- [ ] Scripts de switch funcionando
- [ ] Supabase local iniciando corretamente
- [ ] Aplicação funcionando em ambos os ambientes
- [ ] Google Maps funcionando
- [ ] PWA funcionando

## 🔐 Segurança

- ✅ Arquivos `.env*` estão no `.gitignore`
- ✅ Chaves de produção não são expostas
- ✅ Ambiente local usa chaves padrão
- ✅ Backups automáticos são criados

## 📚 Comandos Úteis

```bash
# Status do Supabase
npx supabase status

# Logs do Supabase
npx supabase logs

# Reset do banco local
npx supabase db reset

# Gerar tipos TypeScript
npx supabase gen types typescript --local > src/types/database.ts

# Verificar diferenças
npx supabase db diff
```
