// Script para clonar completamente o banco Supabase online para local
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase online (com chave de serviço)
const supabaseUrl = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgwMzMzNSwiZXhwIjoyMDcxMzc5MzM1fQ.UbvVutPo6QzCM26KPSeHY5CYvSQLLNzPsqp3_thW3dE';

// Configurações do Supabase local
const localUrl = 'http://127.0.0.1:54321';
const localKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabaseOnline = createClient(supabaseUrl, supabaseServiceKey);
const supabaseLocal = createClient(localUrl, localKey);

async function cloneDatabase() {
  console.log('🚀 Iniciando clone completo do banco online...');
  
  try {
    // 1. Primeiro, verificar usuários de autenticação
    console.log('\n👥 Verificando usuários de autenticação...');
    
    const { data: users, error: usersError } = await supabaseOnline.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ Erro ao acessar usuários:', usersError.message);
    } else {
      console.log(`✅ Encontrados ${users?.users?.length || 0} usuários no banco online`);
      
      if (users?.users && users.users.length > 0) {
        console.log('📝 Usuários encontrados:');
        users.users.forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user.id}, Email: ${user.email}, Criado: ${user.created_at}`);
        });
      }
    }
    
    // 2. Lista de tabelas para clonar (em ordem de dependência)
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
      'leader_areas',
      'city_goals',
      'neighborhood_goals',
      'invite_tokens',
      'profile_leaderships',
      'audit_logs'
    ];
    
    console.log('\n📊 Clonando tabelas de dados...');
    
    for (const table of tables) {
      console.log(`\n🔄 Processando tabela: ${table}`);
      
      try {
        // Buscar todos os dados da tabela online
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
        console.log(`🧹 Limpando dados locais da tabela ${table}...`);
        const { error: deleteError } = await supabaseLocal
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
        
        if (deleteError) {
          console.log(`⚠️  Erro ao limpar tabela ${table}:`, deleteError.message);
        }
        
        // Inserir dados no local em lotes para evitar timeout
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
            console.log(`   Dados do lote:`, JSON.stringify(batch[0], null, 2));
          } else {
            console.log(`✅ Lote ${i + 1}/${batches.length} inserido com sucesso na tabela ${table}`);
          }
        }
        
        console.log(`🎉 Tabela ${table} clonada com sucesso!`);
        
      } catch (err) {
        console.log(`💥 Erro inesperado na tabela ${table}:`, err.message);
      }
    }
    
    console.log('\n🎊 Clone do banco concluído com sucesso!');
    console.log('🔍 Verificando dados clonados...');
    
    // Verificar se os dados foram clonados
    const { data: localProfiles } = await supabaseLocal.from('profiles').select('*', { count: 'exact' });
    const { data: localPeople } = await supabaseLocal.from('people').select('*', { count: 'exact' });
    const { data: localLeaders } = await supabaseLocal.from('leader_profiles').select('*', { count: 'exact' });
    
    console.log(`\n📊 Resumo do clone:`);
    console.log(`   👥 Profiles: ${localProfiles?.length || 0} registros`);
    console.log(`   👤 People: ${localPeople?.length || 0} registros`);
    console.log(`   🎯 Leaders: ${localLeaders?.length || 0} registros`);
    
  } catch (error) {
    console.error('❌ Erro durante o clone:', error);
  }
}

cloneDatabase();
