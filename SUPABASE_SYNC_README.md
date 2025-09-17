# 🔄 Sincronização Supabase Online → Local

Este documento explica como sincronizar dados do Supabase **ONLINE** para o Supabase **LOCAL** de forma segura, sem fazer alterações no banco online.

## ⚠️ Regras de Segurança (OBRIGATÓRIAS)

- ❌ **NUNCA** execute: `RESET`, `TRUNCATE`, `DELETE`, `DROP TABLE`, `ALTER TYPE`, `REINDEX`
- ❌ **NUNCA** faça "reset de projeto" ou migrações que apaguem dados online
- ✅ **APENAS** operações de leitura (`SELECT`) no banco online
- ✅ **APENAS** operações de escrita no banco local

## 🚀 Início Rápido

### 1. Configurar Variáveis de Ambiente

Crie o arquivo `.env` baseado no `env.example`:

```bash
cp env.example .env
```

Configure as variáveis do Supabase **ONLINE**:

```env
# Supabase Online
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui

# Senha do banco online (fornecida)
SUPABASE_ONLINE_DB_PASSWORD=4Q7jJy@9#f7Yf9u
```

### 2. Executar Sincronização Completa

```bash
npm run sync:all
```

Este comando irá:
- ✅ Instalar o Supabase CLI (se necessário)
- ✅ Configurar o Supabase local
- ✅ Inicializar o Supabase local
- ✅ Sincronizar todos os dados

## 📋 Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run sync:all` | Sincronização completa (recomendado) |
| `npm run sync:data` | Apenas sincronizar dados (Supabase já configurado) |
| `npm run supabase:setup` | Apenas configurar Supabase local |
| `npm run supabase:install` | Apenas instalar Supabase CLI |

## 🔧 Configuração Manual

### Instalar Supabase CLI

```bash
npm run supabase:install
```

### Configurar Supabase Local

```bash
npm run supabase:setup
```

### Inicializar Supabase Local

```bash
supabase start
```

### Obter Chaves de API

```bash
supabase status
```

Copie a URL e a chave anônima para o arquivo `.env.local`.

### Sincronizar Dados

```bash
npm run sync:data
```

## 📊 Tabelas Sincronizadas

O script sincroniza as seguintes tabelas (em ordem de dependência):

1. `profiles` - Perfis de usuários
2. `leader_profiles` - Perfis de líderes
3. `election_settings` - Configurações de eleição
4. `city_goals` - Metas por cidade
5. `neighborhood_goals` - Metas por bairro
6. `leader_areas` - Áreas dos líderes
7. `profile_leaderships` - Lideranças dos perfis
8. `people` - Pessoas cadastradas
9. `audit_logs` - Logs de auditoria
10. `tags` - Tags do sistema
11. `people_tags` - Relação pessoas-tags

## 📁 Estrutura de Arquivos

```
scripts/
├── sync-all.js              # Script principal (orquestra tudo)
├── sync-supabase.js         # Script de sincronização de dados
├── setup-local-supabase.js  # Configuração do Supabase local
└── install-supabase-cli.ps1 # Instalação do Supabase CLI

backups/                     # Backups dos dados (criado automaticamente)
├── profiles_backup.json
├── people_backup.json
└── ...

supabase/
├── config.toml             # Configuração do Supabase local
└── migrations/             # Migrações do banco
```

## 🔍 Verificação

### Verificar Status do Supabase Local

```bash
supabase status
```

### Acessar Studio Local

Abra no navegador: http://localhost:54323

### Verificar Logs

```bash
supabase logs
```

## 🛠️ Solução de Problemas

### Erro: "Supabase CLI não encontrado"

```bash
npm run supabase:install
```

### Erro: "Docker não está rodando"

1. Instale o Docker Desktop
2. Inicie o Docker Desktop
3. Execute novamente: `npm run sync:all`

### Erro: "Arquivo .env não encontrado"

```bash
cp env.example .env
# Configure as variáveis do Supabase online
```

### Erro: "Falha na conexão com Supabase Online"

1. Verifique se as URLs e chaves estão corretas no `.env`
2. Verifique se o projeto online está ativo
3. Verifique a conectividade com a internet

### Erro: "Falha na conexão com Supabase Local"

```bash
supabase stop
supabase start
```

## 📝 Logs e Backups

- **Backups**: Salvos em `backups/` (formato JSON)
- **Logs**: Use `supabase logs` para ver logs detalhados
- **Verificação**: O script verifica se os dados foram sincronizados corretamente

## 🔄 Sincronização Incremental

Para sincronizar apenas dados novos (sem limpar o local):

1. Modifique o script `sync-supabase.js`
2. Comente a linha que limpa a tabela local
3. Execute: `npm run sync:data`

## 🚨 Importante

- **SEMPRE** faça backup antes de sincronizar
- **NUNCA** execute comandos destrutivos no banco online
- **SEMPRE** verifique se a sincronização foi bem-sucedida
- **MANTENHA** as senhas e chaves seguras

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `supabase logs`
2. Verifique o status: `supabase status`
3. Consulte a documentação oficial: https://supabase.com/docs
4. Verifique se todas as dependências estão instaladas

---

**⚠️ Lembre-se: Este processo é apenas para cópia de dados. Nunca modifique o banco online!**
