// Solução final: Clone com mapeamento de IDs
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase online (com chave de serviço)
const supabaseUrl = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgwMzMzNSwiZXhwIjoyMDcxMzc5MzM1fQ.UbvVutPo6QzCM26KPSeHY5CYvSQLLNzPsqp3_thW3dE';

// Configurações do Supabase local
const localUrl = 'http://127.0.0.1:54321';
const localKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabaseOnline = createClient(supabaseUrl, supabaseServiceKey);
const supabaseLocal = createClient(localUrl, localKey);

// Mapeamento de IDs antigos para novos
const idMapping = new Map();

async function cloneWithIdMapping() {
  console.log('🚀 Iniciando clone com mapeamento de IDs...');
  
  try {
    // 1. Primeiro, criar usuários de autenticação e mapear IDs
    console.log('\n👥 Criando usuários de autenticação...');
    
    const { data: users, error: usersError } = await supabaseOnline.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ Erro ao acessar usuários:', usersError.message);
      return;
    }
    
    console.log(`✅ Encontrados ${users?.users?.length || 0} usuários no banco online`);
    
    if (users?.users && users.users.length > 0) {
      for (const user of users.users) {
        try {
          // Criar usuário no banco local
          const { data: newUser, error: createError } = await supabaseLocal.auth.admin.createUser({
            email: user.email,
            password: 'temp_password_123',
            email_confirm: true,
            user_metadata: user.user_metadata,
            app_metadata: user.app_metadata
          });
          
          if (createError) {
            console.log(`⚠️  Erro ao criar usuário ${user.email}:`, createError.message);
          } else {
            console.log(`✅ Usuário ${user.email} criado com ID: ${newUser.user.id}`);
            // Mapear ID antigo para novo
            idMapping.set(user.id, newUser.user.id);
          }
        } catch (err) {
          console.log(`💥 Erro inesperado ao criar usuário ${user.email}:`, err.message);
        }
      }
    }
    
    console.log(`\n📋 Mapeamento de IDs criado:`, Array.from(idMapping.entries()));
    
    // 2. Função para substituir IDs nos dados
    function replaceIds(data) {
      if (Array.isArray(data)) {
        return data.map(replaceIds);
      } else if (data && typeof data === 'object') {
        const newData = { ...data };
        for (const [key, value] of Object.entries(newData)) {
          if (key.endsWith('_id') || key === 'id' || key === 'created_by' || key === 'updated_by' || key === 'owner_id') {
            if (typeof value === 'string' && idMapping.has(value)) {
              newData[key] = idMapping.get(value);
            }
          } else if (typeof value === 'object') {
            newData[key] = replaceIds(value);
          }
        }
        return newData;
      }
      return data;
    }
    
    // 3. Importar dados das tabelas (em ordem de dependência)
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
        
        // Substituir IDs nos dados
        const mappedData = replaceIds(data);
        
        // Limpar dados locais existentes
        const { error: deleteError } = await supabaseLocal
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteError) {
          console.log(`⚠️  Erro ao limpar tabela ${table}:`, deleteError.message);
        }
        
        // Inserir dados em lotes
        const batchSize = 50;
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
    
    console.log('\n🎊 Clone com mapeamento de IDs concluído!');
    
    // Verificar dados clonados
    const { data: localProfiles } = await supabaseLocal.from('profiles').select('*', { count: 'exact' });
    const { data: localPeople } = await supabaseLocal.from('people').select('*', { count: 'exact' });
    const { data: localLeaders } = await supabaseLocal.from('leader_profiles').select('*', { count: 'exact' });
    
    console.log(`\n📊 Resumo final:`);
    console.log(`   👥 Profiles: ${localProfiles?.length || 0} registros`);
    console.log(`   👤 People: ${localPeople?.length || 0} registros`);
    console.log(`   🎯 Leaders: ${localLeaders?.length || 0} registros`);
    
  } catch (error) {
    console.error('❌ Erro durante o clone:', error);
  }
}

cloneWithIdMapping();
