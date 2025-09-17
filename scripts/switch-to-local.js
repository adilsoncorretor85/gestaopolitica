#!/usr/bin/env node

/**
 * Script para Alternar para Supabase Local
 * 
 * Este script configura a aplicação para usar o Supabase local
 * em vez do Supabase online.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const CONFIG = {
  PROJECT_ROOT: path.join(__dirname, '..'),
  ENV_FILE: path.join(__dirname, '..', '.env'),
  ENV_LOCAL_FILE: path.join(__dirname, '..', '.env.local'),
  ENV_BACKUP_FILE: path.join(__dirname, '..', '.env.backup')
};

// Configurações do Supabase Local
const LOCAL_CONFIG = {
  VITE_SUPABASE_URL: 'http://localhost:54321',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  VITE_APP_URL: 'http://localhost:5173'
};

// Função para carregar variáveis de ambiente
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

// Função para salvar variáveis de ambiente
function saveEnvFile(filePath, env) {
  const content = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(filePath, content);
}

// Função para fazer backup do .env atual
function backupCurrentEnv() {
  if (fs.existsSync(CONFIG.ENV_FILE)) {
    const currentEnv = fs.readFileSync(CONFIG.ENV_FILE, 'utf8');
    fs.writeFileSync(CONFIG.ENV_BACKUP_FILE, currentEnv);
    console.log('✅ Backup do .env atual salvo em .env.backup');
    return true;
  }
  return false;
}

// Função para alternar para local
function switchToLocal() {
  console.log('🔄 Alternando para Supabase Local...');
  
  // Fazer backup do .env atual
  backupCurrentEnv();
  
  // Carregar configuração atual
  const currentEnv = loadEnvFile(CONFIG.ENV_FILE);
  
  // Criar nova configuração com valores locais
  const localEnv = {
    ...currentEnv,
    ...LOCAL_CONFIG
  };
  
  // Salvar nova configuração
  saveEnvFile(CONFIG.ENV_FILE, localEnv);
  
  console.log('✅ Configuração alterada para Supabase Local');
  console.log('📋 Configurações aplicadas:');
  console.log(`   - URL: ${LOCAL_CONFIG.VITE_SUPABASE_URL}`);
  console.log(`   - Chave: ${LOCAL_CONFIG.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...`);
  console.log(`   - App URL: ${LOCAL_CONFIG.VITE_APP_URL}`);
}

// Função para alternar para online
function switchToOnline() {
  console.log('🔄 Alternando para Supabase Online...');
  
  if (!fs.existsSync(CONFIG.ENV_BACKUP_FILE)) {
    console.error('❌ Arquivo de backup .env.backup não encontrado');
    console.log('💡 Configure manualmente o arquivo .env com as credenciais do Supabase online');
    return false;
  }
  
  // Restaurar backup
  const backupEnv = fs.readFileSync(CONFIG.ENV_BACKUP_FILE, 'utf8');
  fs.writeFileSync(CONFIG.ENV_FILE, backupEnv);
  
  console.log('✅ Configuração restaurada para Supabase Online');
  return true;
}

// Função para verificar status atual
function checkStatus() {
  console.log('🔍 Verificando configuração atual...');
  
  const env = loadEnvFile(CONFIG.ENV_FILE);
  
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

// Função para mostrar ajuda
function showHelp() {
  console.log(`
🔄 Script de Alternância Supabase

Uso:
  node scripts/switch-to-local.js [comando]

Comandos:
  local     Alternar para Supabase Local
  online    Alternar para Supabase Online  
  status    Verificar configuração atual
  help      Mostrar esta ajuda

Exemplos:
  node scripts/switch-to-local.js local
  node scripts/switch-to-local.js online
  node scripts/switch-to-local.js status
`);
}

// Função principal
async function main() {
  const command = process.argv[2] || 'status';
  
  console.log('🔄 Alternância Supabase Online ↔ Local');
  console.log('=' .repeat(50));
  
  switch (command.toLowerCase()) {
    case 'local':
      switchToLocal();
      console.log('\n💡 Reinicie o servidor de desenvolvimento: npm run dev');
      break;
      
    case 'online':
      if (switchToOnline()) {
        console.log('\n💡 Reinicie o servidor de desenvolvimento: npm run dev');
      }
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

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Erro fatal:', error.message);
    process.exit(1);
  });
}

export { main as switchToLocal };
