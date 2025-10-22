// Teste com as chaves JWT corretas do Supabase local
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCorrectKeys() {
  console.log('🧪 Testando chaves JWT corretas...');
  
  try {
    // Teste 1: Verificar se consegue conectar
    console.log('\n1️⃣ Testando conexão...');
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact' });
    
    if (error) {
      console.error('❌ Erro na conexão:', error.message);
    } else {
      console.log('✅ Conexão bem-sucedida!');
      console.log(`📊 Profiles encontrados: ${data?.length || 0}`);
    }
    
    // Teste 2: Verificar autenticação
    console.log('\n2️⃣ Testando autenticação...');
    const { data: session, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Erro na autenticação:', authError.message);
    } else {
      console.log('✅ Autenticação funcionando!');
      console.log(`👤 Sessão: ${session?.session ? 'Ativa' : 'Inativa'}`);
    }
    
    // Teste 3: Verificar tabelas disponíveis
    console.log('\n3️⃣ Testando tabelas...');
    const tables = ['profiles', 'people', 'leader_profiles', 'tags'];
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ Tabela ${table}: ${error.message}`);
        } else {
          console.log(`✅ Tabela ${table}: ${count || 0} registros`);
        }
      } catch (err) {
        console.log(`💥 Erro na tabela ${table}:`, err.message);
      }
    }
    
    console.log('\n🎉 Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testCorrectKeys();
