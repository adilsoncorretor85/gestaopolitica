// Script para debugar a importação de pessoas
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase local
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugPeopleImport() {
  console.log('🔍 Debugando importação de pessoas...');
  
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
    
    // Verificar quantas pessoas temos localmente
    console.log('\n📊 Verificando pessoas locais...');
    
    const { data: localPeople, error: localError, count: localCount } = await supabase
      .from('people')
      .select('*', { count: 'exact' });
    
    if (localError) {
      console.error('❌ Erro ao verificar pessoas locais:', localError.message);
    } else {
      console.log(`📥 Pessoas locais: ${localCount || localPeople?.length || 0}`);
    }
    
    // Verificar se há duplicatas
    console.log('\n🔍 Verificando duplicatas...');
    
    const { data: duplicates, error: dupError } = await supabase
      .from('people')
      .select('id, full_name, owner_id')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (dupError) {
      console.error('❌ Erro ao verificar duplicatas:', dupError.message);
    } else {
      console.log('📝 Últimas 10 pessoas:');
      duplicates?.forEach((person, index) => {
        console.log(`   ${index + 1}. ${person.full_name} (ID: ${person.id})`);
      });
    }
    
    // Tentar inserir uma pessoa específica para testar
    console.log('\n🧪 Testando inserção de pessoa...');
    
    const testPerson = {
      id: 'test-person-' + Date.now(),
      owner_id: 'bc0be6f1-5ce7-4a6f-ad82-93dcdb9965b2',
      full_name: 'Pessoa Teste',
      whatsapp: '47999999999',
      email: 'teste@teste.com',
      city: 'Joinville',
      state: 'SC',
      vote_status: 'INDEFINIDO',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('people')
      .insert(testPerson);
    
    if (insertError) {
      console.error('❌ Erro ao inserir pessoa teste:', insertError.message);
    } else {
      console.log('✅ Pessoa teste inserida com sucesso!');
      
      // Remover a pessoa teste
      const { error: deleteError } = await supabase
        .from('people')
        .delete()
        .eq('id', testPerson.id);
      
      if (deleteError) {
        console.log('⚠️  Erro ao remover pessoa teste:', deleteError.message);
      } else {
        console.log('✅ Pessoa teste removida');
      }
    }
    
    // Verificar configurações da tabela
    console.log('\n⚙️ Verificando configurações da tabela...');
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('people')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Erro ao verificar tabela:', tableError.message);
    } else {
      console.log('✅ Tabela people acessível');
      if (tableInfo && tableInfo.length > 0) {
        console.log('📝 Estrutura da primeira pessoa:');
        console.log(JSON.stringify(tableInfo[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

debugPeopleImport();
