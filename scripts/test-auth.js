// Script para testar autenticação e operações
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDMzMzUsImV4cCI6MjA3MTM3OTMzNX0.yYNiRdi0Ve9fzdAHGYsIi1iQf4Lredve3PMbRjw41BI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  try {
    console.log('🔐 Testando autenticação...');
    
    // Verificar se há sessão ativa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erro ao obter sessão:', sessionError);
      return;
    }
    
    if (!session) {
      console.log('⚠️ Nenhuma sessão ativa. As operações de escrita requerem autenticação ADMIN.');
      console.log('💡 Para testar as operações, você precisa:');
      console.log('   1. Fazer login como ADMIN no sistema');
      console.log('   2. Usar o token de autenticação nas requisições');
      console.log('   3. Ou ajustar as políticas RLS temporariamente');
      return;
    }
    
    console.log('✅ Sessão ativa encontrada:', session.user.email);
    
    // Verificar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Erro ao obter perfil:', profileError);
      return;
    }
    
    console.log('👤 Perfil do usuário:', profile);
    
    if (profile.role !== 'ADMIN') {
      console.log('⚠️ Usuário não é ADMIN. Operações de escrita serão bloqueadas.');
      return;
    }
    
    console.log('✅ Usuário é ADMIN. Testando operações de escrita...');
    
    // Testar inserção com usuário autenticado
    const { data: newGoal, error: insertError } = await supabase
      .from('city_goals')
      .insert({
        city: 'teste-auth',
        state: 'SP',
        goal_total: 1000
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro ao inserir com usuário autenticado:', insertError);
    } else {
      console.log('✅ Inserção bem-sucedida:', newGoal);
      
      // Limpar teste
      await supabase.from('city_goals').delete().eq('id', newGoal.id);
      console.log('🧹 Teste limpo');
    }
    
  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

testAuth();



















