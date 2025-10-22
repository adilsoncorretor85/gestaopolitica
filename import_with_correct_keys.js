// Script para importar dados usando as chaves JWT corretas
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase online (com chave de serviço)
const supabaseUrlOnline = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseServiceKeyOnline = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgwMzMzNSwiZXhwIjoyMDcxMzc5MzM1fQ.UbvVutPo6QzCM26KPSeHY5CYvSQLLNzPsqp3_thW3dE';

// Configurações do Supabase local (com chaves JWT corretas)
const supabaseUrlLocal = 'http://127.0.0.1:54321';
const supabaseAnonKeyLocal = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabaseServiceKeyLocal = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabaseOnline = createClient(supabaseUrlOnline, supabaseServiceKeyOnline);
const supabaseLocal = createClient(supabaseUrlLocal, supabaseServiceKeyLocal);

async function importWithCorrectKeys() {
  console.log('🚀 Iniciando importação com chaves JWT corretas...');
  
  try {
    // 1. Primeiro, vamos criar os usuários de autenticação
    console.log('\n👥 Criando usuários de autenticação...');
    
    const { data: onlineUsers, error: usersError } = await supabaseOnline.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Erro ao buscar usuários online:', usersError.message);
      return;
    }
    
    console.log(`✅ Encontrados ${onlineUsers.users.length} usuários no banco online`);
    
    for (const user of onlineUsers.users) {
      try {
        console.log(`🔄 Processando usuário: ${user.email}`);
        
        // Tentar criar o usuário no local
        const { data: createdUser, error: createError } = await supabaseLocal.auth.admin.createUser({
          email: user.email,
          password: 'tempPassword123!', // Senha temporária
          email_confirm: true,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata
        });
        
        if (createError) {
          if (createError.message.includes('duplicate key') || createError.message.includes('already exists')) {
            console.log(`⚠️  Usuário ${user.email} já existe localmente`);
          } else {
            console.error(`❌ Erro ao criar usuário ${user.email}:`, createError.message);
          }
        } else {
          console.log(`✅ Usuário ${user.email} criado com sucesso`);
        }
      } catch (err) {
        console.error(`❌ Erro inesperado ao processar usuário ${user.email}:`, err.message);
      }
    }
    
    // 2. Agora importar as tabelas públicas
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

importWithCorrectKeys();
