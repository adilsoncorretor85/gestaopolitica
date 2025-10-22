// Script para verificação final dos dados importados
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase local
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function finalVerification() {
  console.log('🔍 Verificação final dos dados importados...');
  
  try {
    // Fazer login como admin
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@teste.com',
      password: 'admin123'
    });
    
    if (signInError) {
      console.error('❌ Erro ao fazer login:', signInError.message);
      return;
    }
    
    console.log('✅ Login realizado como admin');
    
    // Verificar todas as tabelas
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
    
    console.log('\n📊 Resumo final dos dados importados:');
    console.log('=' .repeat(50));
    
    let totalRecords = 0;
    
    for (const tableName of tables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' });
          
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          const recordCount = count || data?.length || 0;
          totalRecords += recordCount;
          console.log(`✅ ${tableName}: ${recordCount} registros`);
        }
      } catch (err) {
        console.log(`💥 ${tableName}: ${err.message}`);
      }
    }
    
    console.log('=' .repeat(50));
    console.log(`📈 Total de registros importados: ${totalRecords}`);
    
    // Verificar algumas estatísticas das pessoas
    console.log('\n📊 Estatísticas das pessoas:');
    
    const { data: peopleStats, error: statsError } = await supabase
      .from('people')
      .select('city, state, vote_status');
    
    if (statsError) {
      console.error('❌ Erro ao buscar estatísticas:', statsError.message);
    } else {
      // Contar por cidade
      const cities = {};
      const states = {};
      const voteStatus = {};
      
      peopleStats?.forEach(person => {
        cities[person.city] = (cities[person.city] || 0) + 1;
        states[person.state] = (states[person.state] || 0) + 1;
        voteStatus[person.vote_status] = (voteStatus[person.vote_status] || 0) + 1;
      });
      
      console.log('\n🏙️ Top 5 cidades:');
      Object.entries(cities)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([city, count]) => {
          console.log(`   ${city}: ${count} pessoas`);
        });
      
      console.log('\n🗺️ Estados:');
      Object.entries(states)
        .sort(([,a], [,b]) => b - a)
        .forEach(([state, count]) => {
          console.log(`   ${state}: ${count} pessoas`);
        });
      
      console.log('\n🗳️ Status de voto:');
      Object.entries(voteStatus)
        .sort(([,a], [,b]) => b - a)
        .forEach(([status, count]) => {
          console.log(`   ${status}: ${count} pessoas`);
        });
    }
    
    console.log('\n🎉 Verificação final concluída!');
    console.log('\n🚀 O Supabase local está pronto para uso!');
    console.log('📧 Login: admin@teste.com');
    console.log('🔑 Senha: admin123');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

finalVerification();
