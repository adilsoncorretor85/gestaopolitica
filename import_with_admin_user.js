// Script para importar dados mapeando IDs para o usuário admin local
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

async function importWithAdminUser() {
  console.log('🚀 Iniciando importação com usuário admin...');
  
  try {
    // 1. Primeiro, vamos fazer login como admin
    console.log('\n🔐 Fazendo login como admin...');
    
    const { data: signInData, error: signInError } = await supabaseLocal.auth.signInWithPassword({
      email: 'admin@teste.com',
      password: 'admin123'
    });
    
    if (signInError) {
      console.error('❌ Erro ao fazer login:', signInError.message);
      return;
    }
    
    console.log('✅ Login realizado com sucesso!');
    console.log(`👤 Usuário: ${signInData.user?.email}`);
    
    // 2. Agora importar as tabelas públicas, mapeando IDs para o admin
    console.log('\n📊 Importando tabelas públicas...');
    
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
        
        // Mapear IDs para o usuário admin
        const mappedData = data.map(record => {
          const mappedRecord = { ...record };
          
          // Mapear campos que referenciam usuários
          if (mappedRecord.id && typeof mappedRecord.id === 'string' && mappedRecord.id.includes('-')) {
            mappedRecord.id = ADMIN_USER_ID;
          }
          if (mappedRecord.user_id) {
            mappedRecord.user_id = ADMIN_USER_ID;
          }
          if (mappedRecord.owner_id) {
            mappedRecord.owner_id = ADMIN_USER_ID;
          }
          if (mappedRecord.created_by) {
            mappedRecord.created_by = ADMIN_USER_ID;
          }
          if (mappedRecord.leader_id) {
            mappedRecord.leader_id = ADMIN_USER_ID;
          }
          if (mappedRecord.profile_id) {
            mappedRecord.profile_id = ADMIN_USER_ID;
          }
          
          return mappedRecord;
        });
        
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
        
        for (let i = 0; i < mappedData.length; i += batchSize) {
          batches.push(mappedData.slice(i, i + batchSize));
        }
        
        console.log(`📤 Inserindo ${batches.length} lotes de dados na tabela ${table}...`);
        
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const { error: insertError } = await supabaseLocal
            .from(table)
            .insert(batch);
            
          if (insertError) {
            console.log(`❌ Erro ao inserir lote ${i + 1} na tabela ${table}:`, insertError.message);
          } else {
            console.log(`✅ Lote ${i + 1}/${batches.length} inserido com sucesso na tabela ${table}`);
          }
        }
        
        console.log(`🎉 Tabela ${table} processada!`);
        
      } catch (err) {
        console.log(`💥 Erro inesperado na tabela ${table}:`, err.message);
      }
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

importWithAdminUser();
