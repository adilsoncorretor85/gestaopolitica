# 🚀 Sincronização Rápida - Supabase Online → Local

## ⚡ Comando Único (Recomendado)

```bash
npm run sync:all
```

Este comando faz tudo automaticamente:
- ✅ Instala Supabase CLI
- ✅ Configura Supabase local  
- ✅ Inicia Supabase local
- ✅ Sincroniza todos os dados

## 📋 Pré-requisitos

1. **Arquivo .env configurado:**
```bash
cp env.example .env
# Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
```

2. **Docker instalado e rodando**

## 🔧 Comandos Individuais

| Comando | O que faz |
|---------|-----------|
| `npm run sync:all` | **Tudo automático** (recomendado) |
| `npm run sync:data` | Apenas sincronizar dados |
| `npm run sync:test` | Testar se está sincronizado |
| `npm run supabase:setup` | Apenas configurar local |
| `npm run supabase:install` | Apenas instalar CLI |

## 🌐 Acessos Após Sincronização

- **Studio Local**: http://localhost:54323
- **API Local**: http://localhost:54321
- **Banco Local**: localhost:54322

## ⚠️ Regras de Segurança

- ❌ **NUNCA** execute comandos destrutivos no banco online
- ✅ **APENAS** operações de leitura no online
- ✅ **APENAS** operações de escrita no local

## 🆘 Problemas Comuns

### "Docker não encontrado"
- Instale Docker Desktop
- Inicie o Docker Desktop

### "Arquivo .env não encontrado"
```bash
cp env.example .env
# Configure as variáveis do Supabase online
```

### "Supabase CLI não encontrado"
```bash
npm run supabase:install
```

### "Falha na sincronização"
```bash
npm run sync:test  # Verificar status
supabase status    # Verificar Supabase local
```

## 📊 Verificar Sincronização

```bash
npm run sync:test
```

## 🛑 Parar Supabase Local

```bash
supabase stop
```

---

**💡 Dica**: Use `npm run sync:all` para a primeira vez e `npm run sync:data` para sincronizações futuras.
