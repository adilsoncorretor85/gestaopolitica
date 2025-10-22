// Script para verificar dados importados
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase local
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkImportedData() {
  console.log('🔍 Verificando dados importados...');
  
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
    
    // Verificar cada tabela
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
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' });
          
        if (error) {
          console.log(`❌ Tabela ${table}: ${error.message}`);
        } else {
          console.log(`✅ Tabela ${table}: ${count || data?.length || 0} registros`);
          
          // Mostrar alguns exemplos se houver dados
          if (data && data.length > 0) {
            console.log(`   📝 Primeiro registro:`, JSON.stringify(data[0], null, 2));
          }
        }
      } catch (err) {
        console.log(`💥 Erro na tabela ${table}:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkImportedData();
