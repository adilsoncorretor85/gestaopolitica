#!/usr/bin/env node

/**
 * Script de Sincronização Supabase
 * 
 * Este script sincroniza dados do Supabase ONLINE para o LOCAL
 * de forma segura, sem fazer alterações no banco online.
 * 
 * Regras de segurança:
 * - Apenas operações SELECT no banco online
 * - Nunca executa RESET, TRUNCATE, DELETE, DROP TABLE, ALTER TYPE, REINDEX
 * - Não faz "reset de projeto" ou migrações que apaguem dados online
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const CONFIG = {
  // URLs e chaves do Supabase (devem ser configuradas no .env)
  SUPABASE_ONLINE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_ONLINE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  SUPABASE_LOCAL_URL: process.env.SUPABASE_LOCAL_URL || 'http://localhost:54321',
  SUPABASE_LOCAL_ANON_KEY: process.env.SUPABASE_LOCAL_ANON_KEY,
  
  // Pasta para backups
  BACKUP_DIR: path.join(__dirname, '..', 'backups'),
  
  // Tabelas para sincronizar (em ordem de dependência)
  TABLES_TO_SYNC: [
    'profiles',
    'leader_profiles', 
    'election_settings',
    'city_goals',
    'neighborhood_goals',
    'leader_areas',
    'profile_leaderships',
    'people',
    'audit_logs',
    'tags',
    'people_tags'
  ]
};

// Verificar se as configurações estão presentes
function validateConfig() {
  const required = [
    'SUPABASE_ONLINE_URL',
    'SUPABASE_ONLINE_ANON_KEY',
    'SUPABASE_LOCAL_ANON_KEY'
  ];
  
  const missing = required.filter(key => !CONFIG[key]);
  
  if (missing.length > 0) {
    console.error('❌ Configurações obrigatórias ausentes:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Configure essas variáveis no arquivo .env');
    process.exit(1);
  }
}

// Criar clientes Supabase
function createClients() {
  console.log('🔗 Conectando aos bancos de dados...');
  
  const onlineClient = createClient(
    CONFIG.SUPABASE_ONLINE_URL,
    CONFIG.SUPABASE_ONLINE_ANON_KEY
  );
  
  const localClient = createClient(
    CONFIG.SUPABASE_LOCAL_URL,
    CONFIG.SUPABASE_LOCAL_ANON_KEY
  );
  
  return { onlineClient, localClient };
}

// Criar pasta de backup se não existir
function ensureBackupDir() {
  if (!fs.existsSync(CONFIG.BACKUP_DIR)) {
    fs.mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
    console.log(`📁 Pasta de backup criada: ${CONFIG.BACKUP_DIR}`);
  }
}

// Fazer backup de uma tabela
async function backupTable(client, tableName) {
  console.log(`📥 Fazendo backup da tabela: ${tableName}`);
  
  try {
    const { data, error } = await client
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`❌ Erro ao fazer backup da tabela ${tableName}:`, error.message);
      return null;
    }
    
    const backupFile = path.join(CONFIG.BACKUP_DIR, `${tableName}_backup.json`);
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
    
    console.log(`✅ Backup salvo: ${backupFile} (${data.length} registros)`);
    return data;
    
  } catch (error) {
    console.error(`❌ Erro inesperado ao fazer backup da tabela ${tableName}:`, error.message);
    return null;
  }
}

// Importar dados para o banco local
async function importToLocal(client, tableName, data) {
  if (!data || data.length === 0) {
    console.log(`⏭️  Pulando importação da tabela ${tableName} (sem dados)`);
    return true;
  }
  
  console.log(`📤 Importando ${data.length} registros para a tabela: ${tableName}`);
  
  try {
    // Limpar tabela local primeiro (apenas local)
    console.log(`🧹 Limpando tabela local: ${tableName}`);
    const { error: deleteError } = await client
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (deleteError) {
      console.warn(`⚠️  Aviso ao limpar tabela ${tableName}:`, deleteError.message);
    }
    
    // Inserir dados em lotes para evitar timeout
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📦 Inserindo lote ${i + 1}/${batches.length} (${batch.length} registros)`);
      
      const { error: insertError } = await client
        .from(tableName)
        .insert(batch);
      
      if (insertError) {
        console.error(`❌ Erro ao inserir lote ${i + 1} na tabela ${tableName}:`, insertError.message);
        return false;
      }
    }
    
    console.log(`✅ Importação concluída para a tabela: ${tableName}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erro inesperado ao importar para a tabela ${tableName}:`, error.message);
    return false;
  }
}

// Verificar se a sincronização foi bem-sucedida
async function verifySync(onlineClient, localClient, tableName) {
  try {
    const { data: onlineData, error: onlineError } = await onlineClient
      .from(tableName)
      .select('id');
    
    const { data: localData, error: localError } = await localClient
      .from(tableName)
      .select('id');
    
    if (onlineError || localError) {
      console.warn(`⚠️  Não foi possível verificar a tabela ${tableName}`);
      return false;
    }
    
    const onlineCount = onlineData?.length || 0;
    const localCount = localData?.length || 0;
    
    if (onlineCount === localCount) {
      console.log(`✅ Verificação OK: ${tableName} (${localCount} registros)`);
      return true;
    } else {
      console.warn(`⚠️  Contagem diferente: ${tableName} (Online: ${onlineCount}, Local: ${localCount})`);
      return false;
    }
    
  } catch (error) {
    console.warn(`⚠️  Erro na verificação da tabela ${tableName}:`, error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando sincronização Supabase Online → Local');
  console.log('=' .repeat(60));
  
  // Validar configurações
  validateConfig();
  
  // Criar pasta de backup
  ensureBackupDir();
  
  // Criar clientes
  const { onlineClient, localClient } = createClients();
  
  // Testar conexões
  console.log('🔍 Testando conexões...');
  
  try {
    const { data: onlineTest } = await onlineClient.from('profiles').select('id').limit(1);
    console.log('✅ Conexão com Supabase Online: OK');
  } catch (error) {
    console.error('❌ Erro na conexão com Supabase Online:', error.message);
    process.exit(1);
  }
  
  try {
    const { data: localTest } = await localClient.from('profiles').select('id').limit(1);
    console.log('✅ Conexão com Supabase Local: OK');
  } catch (error) {
    console.error('❌ Erro na conexão com Supabase Local:', error.message);
    process.exit(1);
  }
  
  // Sincronizar cada tabela
  const results = [];
  
  for (const tableName of CONFIG.TABLES_TO_SYNC) {
    console.log(`\n📋 Processando tabela: ${tableName}`);
    console.log('-'.repeat(40));
    
    // Fazer backup
    const data = await backupTable(onlineClient, tableName);
    
    if (data === null) {
      console.log(`⏭️  Pulando tabela ${tableName} (erro no backup)`);
      results.push({ table: tableName, success: false, reason: 'backup_failed' });
      continue;
    }
    
    // Importar para local
    const importSuccess = await importToLocal(localClient, tableName, data);
    
    if (!importSuccess) {
      console.log(`❌ Falha na importação da tabela ${tableName}`);
      results.push({ table: tableName, success: false, reason: 'import_failed' });
      continue;
    }
    
    // Verificar sincronização
    const verifySuccess = await verifySync(onlineClient, localClient, tableName);
    
    results.push({ 
      table: tableName, 
      success: true, 
      records: data.length,
      verified: verifySuccess 
    });
  }
  
  // Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL DA SINCRONIZAÇÃO');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Tabelas sincronizadas com sucesso: ${successful.length}`);
  successful.forEach(r => {
    console.log(`   - ${r.table}: ${r.records} registros ${r.verified ? '✅' : '⚠️'}`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Tabelas com falha: ${failed.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.table}: ${r.reason}`);
    });
  }
  
  console.log(`\n📁 Backups salvos em: ${CONFIG.BACKUP_DIR}`);
  console.log('🎉 Sincronização concluída!');
  
  if (failed.length > 0) {
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

export { main as syncSupabase };
