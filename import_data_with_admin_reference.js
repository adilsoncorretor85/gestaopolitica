// Script para importar dados usando o admin como referência
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase online (com chave de serviço)
const supabaseUrlOnline = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseServiceKeyOnline = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgwMzMzNSwiZXhwIjoyMDcxMzc5MzM1fQ.UbvVutPo6QzCM26KPSeHY5CYvSQLLNzPsqp3_thW3dE';

// Configurações do Supabase local (com chave anônima JWT)
const supabaseUrlLocal = 'http://127.0.0.1:54321';
const supabaseAnonKeyLocal = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabaseOnline = createClient(supabaseUrlOnline, supabaseServiceKeyOnline);
const supabaseLocal = createClient(supabaseUrlLocal, supabaseAnonKeyLocal);

// ID do usuário admin local
const ADMIN_USER_ID = 'bc0be6f1-5ce7-4a6f-ad82-93dcdb9965b2';

async function importDataWithAdminReference() {
  console.log('🚀 Iniciando importação com admin como referência...');
  
  try {
    // 1. Fazer login como admin
    console.log('\n🔐 Fazendo login como admin...');
    
    const { data: signInData, error: signInError } = await supabaseLocal.auth.signInWithPassword({
      email: 'admin@teste.com',
      password: 'admin123'
    });
    
    if (signInError) {
      console.error('❌ Erro ao fazer login:', signInError.message);
      return;
    }
    
    console.log('✅ Login realizado como admin');
    
    // 2. Importar tabelas que não dependem de chaves estrangeiras primeiro
    console.log('\n📊 Importando tabelas independentes...');
    
    const independentTables = [
      'tags',
      'people',
      'city_goals',
      'neighborhood_goals',
      'invite_tokens'
    ];
    
    for (const tableName of independentTables) {
      console.log(`\n🔄 Processando tabela: ${tableName}`);
      
      try {
        // Buscar dados da tabela online
        const { data, error, count } = await supabaseOnline
          .from(tableName)
          .select('*', { count: 'exact' });
          
        if (error) {
          console.log(`❌ Erro ao buscar dados da tabela ${tableName}:`, error.message);
          continue;
        }
        
        if (!data || data.length === 0) {
          console.log(`ℹ️  Tabela ${tableName} está vazia no online`);
          continue;
        }
        
        console.log(`📥 Encontrados ${count || data.length} registros na tabela ${tableName}`);
        
        // Mapear IDs para o usuário admin
        const mappedData = data.map(record => {
          const mappedRecord = { ...record };
          
          // Mapear campos que referenciam usuários
          if (mappedRecord.created_by) {
            mappedRecord.created_by = ADMIN_USER_ID;
          }
          if (mappedRecord.owner_id) {
            mappedRecord.owner_id = ADMIN_USER_ID;
          }
          if (mappedRecord.user_id) {
            mappedRecord.user_id = ADMIN_USER_ID;
          }
          
          return mappedRecord;
        });
        
        // Inserir dados em lotes
        const batchSize = 100;
        const batches = [];
        
        for (let i = 0; i < mappedData.length; i += batchSize) {
          batches.push(mappedData.slice(i, i + batchSize));
        }
        
        console.log(`📤 Inserindo ${batches.length} lotes de dados na tabela ${tableName}...`);
        
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const { error: insertError } = await supabaseLocal
            .from(tableName)
            .insert(batch);
            
          if (insertError) {
            console.log(`❌ Erro ao inserir lote ${i + 1} na tabela ${tableName}:`, insertError.message);
          } else {
            console.log(`✅ Lote ${i + 1}/${batches.length} inserido com sucesso na tabela ${tableName}`);
          }
        }
        
        console.log(`🎉 Tabela ${tableName} processada!`);
        
      } catch (err) {
        console.log(`💥 Erro inesperado na tabela ${tableName}:`, err.message);
      }
    }
    
    // 3. Importar tabelas dependentes
    console.log('\n📊 Importando tabelas dependentes...');
    
    const dependentTables = [
      'people_tags',
      'profile_leaderships'
    ];
    
    for (const tableName of dependentTables) {
      console.log(`\n🔄 Processando tabela: ${tableName}`);
      
      try {
        // Buscar dados da tabela online
        const { data, error, count } = await supabaseOnline
          .from(tableName)
          .select('*', { count: 'exact' });
          
        if (error) {
          console.log(`❌ Erro ao buscar dados da tabela ${tableName}:`, error.message);
          continue;
        }
        
        if (!data || data.length === 0) {
          console.log(`ℹ️  Tabela ${tableName} está vazia no online`);
          continue;
        }
        
        console.log(`📥 Encontrados ${count || data.length} registros na tabela ${tableName}`);
        
        // Mapear IDs para o usuário admin
        const mappedData = data.map(record => {
          const mappedRecord = { ...record };
          
          // Mapear campos que referenciam usuários
          if (mappedRecord.person_id) {
            mappedRecord.person_id = ADMIN_USER_ID;
          }
          if (mappedRecord.profile_id) {
            mappedRecord.profile_id = ADMIN_USER_ID;
          }
          if (mappedRecord.created_by) {
            mappedRecord.created_by = ADMIN_USER_ID;
          }
          
          return mappedRecord;
        });
        
        // Inserir dados em lotes
        const batchSize = 100;
        const batches = [];
        
        for (let i = 0; i < mappedData.length; i += batchSize) {
          batches.push(mappedData.slice(i, i + batchSize));
        }
        
        console.log(`📤 Inserindo ${batches.length} lotes de dados na tabela ${tableName}...`);
        
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const { error: insertError } = await supabaseLocal
            .from(tableName)
            .insert(batch);
            
          if (insertError) {
            console.log(`❌ Erro ao inserir lote ${i + 1} na tabela ${tableName}:`, insertError.message);
          } else {
            console.log(`✅ Lote ${i + 1}/${batches.length} inserido com sucesso na tabela ${tableName}`);
          }
        }
        
        console.log(`🎉 Tabela ${tableName} processada!`);
        
      } catch (err) {
        console.log(`💥 Erro inesperado na tabela ${tableName}:`, err.message);
      }
    }
    
    console.log('\n🎊 Importação concluída!');
    
    // Verificar dados importados
    const { data: localProfiles } = await supabaseLocal.from('profiles').select('*', { count: 'exact' });
    const { data: localPeople } = await supabaseLocal.from('people').select('*', { count: 'exact' });
    const { data: localLeaders } = await supabaseLocal.from('leader_profiles').select('*', { count: 'exact' });
    const { data: localTags } = await supabaseLocal.from('tags').select('*', { count: 'exact' });
    
    console.log(`\n📊 Resumo final:`);
    console.log(`   👥 Profiles: ${localProfiles?.length || 0} registros`);
    console.log(`   👤 People: ${localPeople?.length || 0} registros`);
    console.log(`   🎯 Leaders: ${localLeaders?.length || 0} registros`);
    console.log(`   🏷️  Tags: ${localTags?.length || 0} registros`);
    
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
  }
}

importDataWithAdminReference();
