#!/usr/bin/env node

/**
 * Script de Teste da Sincronização
 * 
 * Este script testa se a sincronização está funcionando corretamente
 * sem fazer alterações nos bancos de dados.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const CONFIG = {
  ENV_FILE: path.join(__dirname, '..', '.env'),
  ENV_LOCAL_FILE: path.join(__dirname, '..', '.env.local'),
  
  // Tabelas para testar
  TEST_TABLES: [
    'profiles',
    'people',
    'election_settings',
    'tags'
  ]
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

// Função para testar conexão com Supabase
async function testConnection(client, name) {
  console.log(`🔍 Testando conexão com ${name}...`);
  
  try {
    const { data, error } = await client
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error(`❌ Erro na conexão com ${name}:`, error.message);
      return false;
    }
    
    console.log(`✅ Conexão com ${name}: OK`);
    return true;
  } catch (error) {
    console.error(`❌ Erro inesperado na conexão com ${name}:`, error.message);
    return false;
  }
}

// Função para contar registros em uma tabela
async function countRecords(client, tableName) {
  try {
    const { data, error } = await client
      .from(tableName)
      .select('id', { count: 'exact', head: true });
    
    if (error) {
      console.warn(`⚠️  Erro ao contar registros na tabela ${tableName}:`, error.message);
      return -1;
    }
    
    return data?.length || 0;
  } catch (error) {
    console.warn(`⚠️  Erro inesperado ao contar registros na tabela ${tableName}:`, error.message);
    return -1;
  }
}

// Função para testar sincronização
async function testSync(onlineClient, localClient) {
  console.log('\n📊 Testando sincronização...');
  console.log('-'.repeat(40));
  
  const results = [];
  
  for (const tableName of CONFIG.TEST_TABLES) {
    console.log(`📋 Testando tabela: ${tableName}`);
    
    const onlineCount = await countRecords(onlineClient, tableName);
    const localCount = await countRecords(localClient, tableName);
    
    const result = {
      table: tableName,
      online: onlineCount,
      local: localCount,
      synced: onlineCount === localCount && onlineCount >= 0 && localCount >= 0
    };
    
    results.push(result);
    
    if (result.synced) {
      console.log(`✅ ${tableName}: ${localCount} registros (sincronizado)`);
    } else {
      console.log(`⚠️  ${tableName}: Online=${onlineCount}, Local=${localCount} (não sincronizado)`);
    }
  }
  
  return results;
}

// Função para verificar configurações
function checkConfig() {
  console.log('🔧 Verificando configurações...');
  
  const env = loadEnvFile(CONFIG.ENV_FILE);
  const envLocal = loadEnvFile(CONFIG.ENV_LOCAL_FILE);
  
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const requiredLocal = [
    'SUPABASE_LOCAL_URL',
    'SUPABASE_LOCAL_ANON_KEY'
  ];
  
  const missing = required.filter(key => !env[key]);
  const missingLocal = requiredLocal.filter(key => !envLocal[key]);
  
  if (missing.length > 0) {
    console.error('❌ Configurações obrigatórias ausentes no .env:');
    missing.forEach(key => console.error(`   - ${key}`));
    return false;
  }
  
  if (missingLocal.length > 0) {
    console.error('❌ Configurações obrigatórias ausentes no .env.local:');
    missingLocal.forEach(key => console.error(`   - ${key}`));
    return false;
  }
  
  console.log('✅ Configurações OK');
  return true;
}

// Função principal
async function main() {
  console.log('🧪 TESTE DE SINCRONIZAÇÃO SUPABASE');
  console.log('=' .repeat(50));
  
  // Verificar configurações
  if (!checkConfig()) {
    console.log('\n💡 Configure os arquivos .env e .env.local');
    process.exit(1);
  }
  
  // Carregar configurações
  const env = loadEnvFile(CONFIG.ENV_FILE);
  const envLocal = loadEnvFile(CONFIG.ENV_LOCAL_FILE);
  
  // Criar clientes
  console.log('\n🔗 Criando clientes Supabase...');
  
  const onlineClient = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY
  );
  
  const localClient = createClient(
    envLocal.SUPABASE_LOCAL_URL,
    envLocal.SUPABASE_LOCAL_ANON_KEY
  );
  
  // Testar conexões
  const onlineOk = await testConnection(onlineClient, 'Supabase Online');
  const localOk = await testConnection(localClient, 'Supabase Local');
  
  if (!onlineOk || !localOk) {
    console.log('\n❌ Falha nas conexões. Verifique as configurações.');
    process.exit(1);
  }
  
  // Testar sincronização
  const results = await testSync(onlineClient, localClient);
  
  // Relatório final
  console.log('\n' + '='.repeat(50));
  console.log('📊 RELATÓRIO DO TESTE');
  console.log('='.repeat(50));
  
  const synced = results.filter(r => r.synced);
  const notSynced = results.filter(r => !r.synced);
  
  console.log(`✅ Tabelas sincronizadas: ${synced.length}/${results.length}`);
  synced.forEach(r => {
    console.log(`   - ${r.table}: ${r.local} registros`);
  });
  
  if (notSynced.length > 0) {
    console.log(`\n⚠️  Tabelas não sincronizadas: ${notSynced.length}`);
    notSynced.forEach(r => {
      console.log(`   - ${r.table}: Online=${r.online}, Local=${r.local}`);
    });
    
    console.log('\n💡 Execute a sincronização: npm run sync:data');
  }
  
  if (synced.length === results.length) {
    console.log('\n🎉 Todas as tabelas estão sincronizadas!');
  } else {
    console.log('\n⚠️  Algumas tabelas precisam ser sincronizadas');
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Erro fatal:', error.message);
    process.exit(1);
  });
}

export { main as testSync };
