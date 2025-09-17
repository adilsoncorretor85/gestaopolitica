#!/usr/bin/env node

/**
 * Script de Configuração do Supabase Local
 * 
 * Este script configura o Supabase local para receber dados
 * do Supabase online de forma segura.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const CONFIG = {
  PROJECT_ROOT: path.join(__dirname, '..'),
  SUPABASE_DIR: path.join(__dirname, '..', 'supabase'),
  CONFIG_FILE: path.join(__dirname, '..', 'supabase', 'config.toml'),
  ENV_FILE: path.join(__dirname, '..', '.env.local')
};

// Template do config.toml para Supabase local
const SUPABASE_CONFIG_TEMPLATE = `# Supabase Local Configuration
# Este arquivo é gerado automaticamente pelo script de setup

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323
api_url = "http://localhost:54321"

[inbucket]
enabled = true
port = 54324
smtp_port = 54325
pop3_port = 54326

[storage]
enabled = true
port = 54327
file_size_limit = "50MiB"

[auth]
enabled = true
port = 54328
site_url = "http://localhost:5173"
additional_redirect_urls = ["https://localhost:5173"]
jwt_expiry = 3600
enable_signup = true
enable_anonymous_users = false

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false

[realtime]
enabled = true
port = 54329

[edge_runtime]
enabled = true
port = 54330

[analytics]
enabled = false
`;

// Template do .env.local
const ENV_LOCAL_TEMPLATE = `# Configurações do Supabase Local
# Este arquivo é gerado automaticamente pelo script de setup

# URL do Supabase Local
VITE_SUPABASE_URL=http://localhost:54321
SUPABASE_LOCAL_URL=http://localhost:54321

# Chave anônima do Supabase Local (será preenchida após inicialização)
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_LOCAL_AQUI
SUPABASE_LOCAL_ANON_KEY=SUA_CHAVE_LOCAL_AQUI

# URL da aplicação local
VITE_APP_URL=http://localhost:5173

# Configurações de desenvolvimento
VITE_DEBUG_GOAL=1
`;

// Função para criar arquivo de configuração
function createConfigFile() {
  console.log('📝 Criando arquivo de configuração do Supabase...');
  
  try {
    // Criar pasta supabase se não existir
    if (!fs.existsSync(CONFIG.SUPABASE_DIR)) {
      fs.mkdirSync(CONFIG.SUPABASE_DIR, { recursive: true });
      console.log(`📁 Pasta criada: ${CONFIG.SUPABASE_DIR}`);
    }
    
    // Criar config.toml
    fs.writeFileSync(CONFIG.CONFIG_FILE, SUPABASE_CONFIG_TEMPLATE);
    console.log(`✅ Arquivo criado: ${CONFIG.CONFIG_FILE}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar arquivo de configuração:', error.message);
    return false;
  }
}

// Função para criar arquivo .env.local
function createEnvLocalFile() {
  console.log('📝 Criando arquivo .env.local...');
  
  try {
    fs.writeFileSync(CONFIG.ENV_FILE, ENV_LOCAL_TEMPLATE);
    console.log(`✅ Arquivo criado: ${CONFIG.ENV_FILE}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar arquivo .env.local:', error.message);
    return false;
  }
}

// Função para verificar se o Docker está rodando
async function checkDocker() {
  console.log('🐳 Verificando se o Docker está disponível...');
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync('docker --version');
    console.log('✅ Docker está disponível');
    return true;
  } catch (error) {
    console.error('❌ Docker não está disponível:', error.message);
    console.log('💡 Instale o Docker Desktop para continuar');
    return false;
  }
}

// Função para gerar instruções de uso
function generateInstructions() {
  const instructions = `
📋 INSTRUÇÕES PARA USAR O SUPABASE LOCAL:

1. 🚀 Inicializar o Supabase local:
   supabase start

2. 📋 Verificar status:
   supabase status

3. 🔑 Obter chaves de API:
   supabase status | grep "API URL"
   supabase status | grep "anon key"

4. 📝 Atualizar arquivo .env.local com as chaves obtidas

5. 🔄 Executar sincronização:
   node scripts/sync-supabase.js

6. 🛑 Parar o Supabase local:
   supabase stop

📁 Arquivos criados:
   - ${CONFIG.CONFIG_FILE}
   - ${CONFIG.ENV_FILE}

⚠️  IMPORTANTE:
   - Configure as chaves de API do Supabase online no arquivo .env
   - O Supabase local será executado nas portas 54321-54330
   - Use o Studio em http://localhost:54323 para gerenciar o banco local
`;

  console.log(instructions);
  
  // Salvar instruções em arquivo
  const instructionsFile = path.join(__dirname, '..', 'SUPABASE_LOCAL_SETUP.md');
  fs.writeFileSync(instructionsFile, instructions);
  console.log(`📄 Instruções salvas em: ${instructionsFile}`);
}

// Função principal
async function main() {
  console.log('🔧 Configurando Supabase Local');
  console.log('=' .repeat(50));
  
  // Verificar Docker
  const dockerAvailable = await checkDocker();
  if (!dockerAvailable) {
    console.log('\n❌ Docker é necessário para executar o Supabase local');
    console.log('💡 Instale o Docker Desktop e tente novamente');
    process.exit(1);
  }
  
  // Criar arquivos de configuração
  const configCreated = createConfigFile();
  const envCreated = createEnvLocalFile();
  
  if (!configCreated || !envCreated) {
    console.log('\n❌ Falha na criação dos arquivos de configuração');
    process.exit(1);
  }
  
  // Gerar instruções
  generateInstructions();
  
  console.log('\n🎉 Configuração do Supabase Local concluída!');
  console.log('📖 Consulte o arquivo SUPABASE_LOCAL_SETUP.md para próximos passos');
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Erro fatal:', error.message);
    process.exit(1);
  });
}

export { main as setupLocalSupabase };
