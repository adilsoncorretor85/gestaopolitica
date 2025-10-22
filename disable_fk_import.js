// Script para importar dados desabilitando temporariamente as chaves estrangeiras
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase online (com chave de serviço)
const supabaseUrl = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgwMzMzNSwiZXhwIjoyMDcxMzc5MzM1fQ.UbvVutPo6QzCM26KPSeHY5CYvSQLLNzPsqp3_thW3dE';

// Configurações do Supabase local
const localUrl = 'http://127.0.0.1:54321';
const localKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabaseOnline = createClient(supabaseUrl, supabaseServiceKey);
const supabaseLocal = createClient(localUrl, localKey);

async function importWithoutFK() {
  console.log('🚀 Iniciando importação sem chaves estrangeiras...');
  
  try {
    // 1. Desabilitar chaves estrangeiras temporariamente
    console.log('\n🔓 Desabilitando chaves estrangeiras...');
    
    const disableFKQuery = `
      SET session_replication_role = replica;
    `;
    
    const { error: disableError } = await supabaseLocal.rpc('exec_sql', { 
      sql: disableFKQuery 
    });
    
    if (disableError) {
      console.log('⚠️  Não foi possível desabilitar FK via RPC, continuando...');
    }
    
    // 2. Importar dados das tabelas (em ordem de dependência)
    console.log('\n📊 Importando dados das tabelas...');
    
    const tables = [
      'profiles',
      'app_admins', 
      'election_settings',
      'public_settings',
      'org_settings',
      'tags',
      'leader_profiles',
      'leader_targets',
      'people',
      'people_tags',
      'city_goals',
      'neighborhood_goals',
      'invite_tokens',
      'profile_leaderships'
    ];
    
    for (const table of tables) {
      console.log(`\n🔄 Processando tabela: ${table}`);
      
      try {
        // Buscar dados da tabela online
        const { data, error, count } = await supabaseOnline
          .from(table)
          .select('*', { count: 'exact' });
          
        if (error) {
          console.log(`❌ Erro ao buscar dados da tabela ${table}:`, error.message);
          continue;
        }
        
        if (!data || data.length === 0) {
          console.log(`ℹ️  Tabela ${table} está vazia no online`);
          continue;
        }
        
        console.log(`📥 Encontrados ${count || data.length} registros na tabela ${table}`);
        
        // Limpar dados locais existentes
        const { error: deleteError } = await supabaseLocal
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteError) {
          console.log(`⚠️  Erro ao limpar tabela ${table}:`, deleteError.message);
        }
        
        // Inserir dados em lotes
        const batchSize = 100;
        const batches = [];
        
        for (let i = 0; i < data.length; i += batchSize) {
          batches.push(data.slice(i, i + batchSize));
        }
        
        console.log(`📤 Inserindo ${batches.length} lotes de dados na tabela ${table}...`);
        
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const { error: insertError } = await supabaseLocal
            .from(table)
            .insert(batch);
            
          if (insertError) {
            console.log(`❌ Erro ao inserir lote ${i + 1} na tabela ${table}:`, insertError.message);
            // Tentar inserir um por um para identificar o problema
            for (let j = 0; j < Math.min(batch.length, 5); j++) {
              const { error: singleError } = await supabaseLocal
                .from(table)
                .insert(batch[j]);
              if (singleError) {
                console.log(`   ❌ Erro no registro ${j + 1}:`, singleError.message);
              } else {
                console.log(`   ✅ Registro ${j + 1} inserido com sucesso`);
              }
            }
          } else {
            console.log(`✅ Lote ${i + 1}/${batches.length} inserido com sucesso na tabela ${table}`);
          }
        }
        
        console.log(`🎉 Tabela ${table} processada!`);
        
      } catch (err) {
        console.log(`💥 Erro inesperado na tabela ${table}:`, err.message);
      }
    }
    
    // 3. Reabilitar chaves estrangeiras
    console.log('\n🔒 Reabilitando chaves estrangeiras...');
    
    const enableFKQuery = `
      SET session_replication_role = DEFAULT;
    `;
    
    const { error: enableError } = await supabaseLocal.rpc('exec_sql', { 
      sql: enableFKQuery 
    });
    
    if (enableError) {
      console.log('⚠️  Não foi possível reabilitar FK via RPC');
    }
    
    console.log('\n🎊 Importação concluída!');
    
    // Verificar dados importados
    const { data: localProfiles } = await supabaseLocal.from('profiles').select('*', { count: 'exact' });
    const { data: localPeople } = await supabaseLocal.from('people').select('*', { count: 'exact' });
    const { data: localLeaders } = await supabaseLocal.from('leader_profiles').select('*', { count: 'exact' });
    
    console.log(`\n📊 Resumo final:`);
    console.log(`   👥 Profiles: ${localProfiles?.length || 0} registros`);
    console.log(`   👤 People: ${localPeople?.length || 0} registros`);
    console.log(`   🎯 Leaders: ${localLeaders?.length || 0} registros`);
    
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
  }
}

importWithoutFK();
