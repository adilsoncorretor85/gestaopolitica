/**
 * Script para Alternar entre Supabase Online e Local
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(PROJECT_ROOT, '.env');
const ENV_BACKUP_FILE = path.join(PROJECT_ROOT, '.env.backup');

const LOCAL_CONFIG = {
  VITE_SUPABASE_URL: 'http://localhost:54321',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  VITE_APP_URL: 'http://localhost:5173'
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

function saveEnvFile(filePath, env) {
  const content = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(filePath, content);
}

function switchToLocal() {
  console.log('🔄 Alternando para Supabase Local...');
  
  // Fazer backup do .env atual
  if (fs.existsSync(ENV_FILE)) {
    const currentEnv = fs.readFileSync(ENV_FILE, 'utf8');
    fs.writeFileSync(ENV_BACKUP_FILE, currentEnv);
    console.log('✅ Backup do .env atual salvo em .env.backup');
  }
  
  // Carregar configuração atual
  const currentEnv = loadEnvFile(ENV_FILE);
  
  // Criar nova configuração com valores locais
  const localEnv = {
    ...currentEnv,
    ...LOCAL_CONFIG
  };
  
  // Salvar nova configuração
  saveEnvFile(ENV_FILE, localEnv);
  
  console.log('✅ Configuração alterada para Supabase Local');
  console.log('📋 Configurações aplicadas:');
  console.log(`   - URL: ${LOCAL_CONFIG.VITE_SUPABASE_URL}`);
  console.log(`   - Chave: ${LOCAL_CONFIG.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...`);
  console.log(`   - App URL: ${LOCAL_CONFIG.VITE_APP_URL}`);
  console.log('\n💡 Reinicie o servidor: npm run dev');
}

function switchToOnline() {
  console.log('🔄 Alternando para Supabase Online...');
  
  if (!fs.existsSync(ENV_BACKUP_FILE)) {
    console.error('❌ Arquivo de backup .env.backup não encontrado');
    console.log('💡 Configure manualmente o arquivo .env com as credenciais do Supabase online');
    return false;
  }
  
  // Restaurar backup
  const backupEnv = fs.readFileSync(ENV_BACKUP_FILE, 'utf8');
  fs.writeFileSync(ENV_FILE, backupEnv);
  
  console.log('✅ Configuração restaurada para Supabase Online');
  console.log('\n💡 Reinicie o servidor: npm run dev');
  return true;
}

function checkStatus() {
  console.log('🔍 Verificando configuração atual...');
  
  if (!fs.existsSync(ENV_FILE)) {
    console.log('❌ Arquivo .env não encontrado');
    console.log('💡 Crie o arquivo .env baseado no env.example');
    return;
  }
  
  const env = loadEnvFile(ENV_FILE);
  
  if (env.VITE_SUPABASE_URL === LOCAL_CONFIG.VITE_SUPABASE_URL) {
    console.log('📍 Status: Usando Supabase LOCAL');
    console.log(`   - URL: ${env.VITE_SUPABASE_URL}`);
    console.log(`   - Chave: ${env.VITE_SUPABASE_ANON_KEY?.substring(0, 20)}...`);
  } else {
    console.log('📍 Status: Usando Supabase ONLINE');
    console.log(`   - URL: ${env.VITE_SUPABASE_URL}`);
    console.log(`   - Chave: ${env.VITE_SUPABASE_ANON_KEY?.substring(0, 20)}...`);
  }
}

function showHelp() {
  console.log(`
🔄 Script de Alternância Supabase

Uso:
  node scripts/switch-env.js [comando]

Comandos:
  local     Alternar para Supabase Local
  online    Alternar para Supabase Online  
  status    Verificar configuração atual
  help      Mostrar esta ajuda

Exemplos:
  node scripts/switch-env.js local
  node scripts/switch-env.js online
  node scripts/switch-env.js status
`);
}

async function main() {
  const command = process.argv[2] || 'status';
  
  console.log('🔄 Alternância Supabase Online ↔ Local');
  console.log('=' .repeat(50));
  
  switch (command.toLowerCase()) {
    case 'local':
      switchToLocal();
      break;
      
    case 'online':
      switchToOnline();
      break;
      
    case 'status':
      checkStatus();
      break;
      
    case 'help':
      showHelp();
      break;
      
    default:
      console.error(`❌ Comando desconhecido: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Erro fatal:', error.message);
  process.exit(1);
});
