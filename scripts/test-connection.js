// Script para testar a conexão e criar as tabelas
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDMzMzUsImV4cCI6MjA3MTM3OTMzNX0.yYNiRdi0Ve9fzdAHGYsIi1iQf4Lredve3PMbRjw41BI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔍 Testando conexão com Supabase...');
    
    // Testar conexão básica
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.error('❌ Erro na conexão:', error);
      return;
    }
    
    console.log('✅ Conexão com Supabase estabelecida!');
    
    // Verificar se as tabelas já existem
    console.log('🔍 Verificando se as tabelas de projeção existem...');
    
    const { data: cityGoals, error: cityGoalsError } = await supabase
      .from('city_goals')
      .select('count')
      .limit(1);
    
    if (cityGoalsError) {
      console.log('❌ Tabela city_goals não existe:', cityGoalsError.message);
      console.log('📝 As tabelas de projeção precisam ser criadas no Supabase Dashboard');
      console.log('🔗 Acesse: https://supabase.com/dashboard/project/ojxwwjurwhwtoydywvch/sql');
      console.log('📋 Execute o SQL da migração: supabase/migrations/20250115_create_projection_tables.sql');
    } else {
      console.log('✅ Tabela city_goals existe!');
    }
    
  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

testConnection();
