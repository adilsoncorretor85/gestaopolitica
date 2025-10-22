// Script para criar usuário admin usando SQL direto
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase local (com chave anônima JWT)
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdminWithSQL() {
  console.log('👤 Criando usuário admin com SQL...');
  
  try {
    // Primeiro, vamos tentar criar um usuário usando a API de autenticação
    console.log('🔄 Tentando criar usuário via signUp...');
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'admin@teste.com',
      password: 'admin123',
      options: {
        data: {
          full_name: 'Administrador',
          role: 'admin'
        }
      }
    });
    
    if (signUpError) {
      console.error('❌ Erro ao criar usuário via signUp:', signUpError.message);
    } else {
      console.log('✅ Usuário criado via signUp!');
      console.log(`📧 Email: ${signUpData.user?.email}`);
      console.log(`🆔 ID: ${signUpData.user?.id}`);
    }
    
    // Agora vamos tentar fazer login
    console.log('\n🔄 Tentando fazer login...');
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@teste.com',
      password: 'admin123'
    });
    
    if (signInError) {
      console.error('❌ Erro ao fazer login:', signInError.message);
    } else {
      console.log('✅ Login realizado com sucesso!');
      console.log(`👤 Usuário logado: ${signInData.user?.email}`);
      console.log(`🆔 ID: ${signInData.user?.id}`);
    }
    
    // Verificar se conseguimos acessar as tabelas
    console.log('\n🔄 Testando acesso às tabelas...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Erro ao acessar profiles:', profilesError.message);
    } else {
      console.log('✅ Acesso às tabelas funcionando!');
      console.log(`📊 Profiles encontrados: ${profiles?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

createAdminWithSQL();
