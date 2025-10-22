// Script para verificar dados de autenticação no Supabase online
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase online
const supabaseUrl = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDMzMzUsImV4cCI6MjA3MTM3OTMzNX0.yYNiRdi0Ve9fzdAHGYsIi1iQf4Lredve3PMbRjw41BI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuthData() {
  console.log('🔍 Verificando dados de autenticação no Supabase online...');
  
  try {
    // Verificar se há usuários na tabela auth.users
    console.log('\n📊 Verificando tabela auth.users...');
    
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ Erro ao acessar auth.users:', usersError.message);
    } else {
      console.log(`✅ Encontrados ${users?.users?.length || 0} usuários na tabela auth.users`);
      
      if (users?.users && users.users.length > 0) {
        console.log('📝 Primeiros usuários:');
        users.users.slice(0, 3).forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user.id}, Email: ${user.email}, Criado: ${user.created_at}`);
        });
      }
    }
    
    // Verificar se há dados em outras tabelas que podem ter nomes diferentes
    console.log('\n📊 Verificando outras possíveis tabelas...');
    
    const possibleTables = [
      'leaders',
      'contacts', 
      'lideres',
      'contatos',
      'users',
      'members',
      'participants'
    ];
    
    for (const table of possibleTables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(1);
          
        if (!error && data) {
          console.log(`✅ Tabela ${table}: ${count || data.length} registros encontrados`);
        }
      } catch (err) {
        // Tabela não existe, continuar
      }
    }
    
    console.log('\n🎯 Verificação de autenticação concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  }
}

checkAuthData();
