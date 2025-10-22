// Script para verificar dados no Supabase online usando chave anônima
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase online
const supabaseUrl = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDMzMzUsImV4cCI6MjA3MTM3OTMzNX0.yYNiRdi0Ve9fzdAHGYsIi1iQf4Lredve3PMbRjw41BI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOnlineData() {
  console.log('🔍 Verificando dados no Supabase online...');
  
  try {
    // Lista de tabelas para verificar
    const tables = [
      'profiles',
      'people', 
      'leader_profiles',
      'leader_targets',
      'tags',
      'people_tags',
      'city_goals',
      'neighborhood_goals',
      'election_settings',
      'public_settings',
      'org_settings',
      'app_admins'
    ];
    
    for (const table of tables) {
      console.log(`\n📊 Verificando tabela: ${table}`);
      
      try {
        // Buscar dados do online
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(5); // Limitar a 5 registros para teste
          
        if (error) {
          console.log(`❌ Erro ao acessar tabela ${table}:`, error.message);
          console.log(`   Código do erro:`, error.code);
          continue;
        }
        
        if (!data) {
          console.log(`⚠️  Tabela ${table} retornou null`);
          continue;
        }
        
        console.log(`✅ Tabela ${table}: ${count || data.length} registros encontrados`);
        
        if (data.length > 0) {
          console.log(`   📝 Primeiro registro:`, JSON.stringify(data[0], null, 2));
        }
        
      } catch (err) {
        console.log(`💥 Erro inesperado na tabela ${table}:`, err.message);
      }
    }
    
    console.log('\n🎯 Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  }
}

checkOnlineData();
