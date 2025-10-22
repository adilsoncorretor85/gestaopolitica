// Script para criar perfil de líder para o usuário admin
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase local
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ID do usuário admin local
const ADMIN_USER_ID = 'bc0be6f1-5ce7-4a6f-ad82-93dcdb9965b2';

async function createAdminLeaderProfile() {
  console.log('👤 Criando perfil de líder para o usuário admin...');
  
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
    
    // 1. Criar perfil na tabela profiles
    console.log('\n📝 Criando perfil na tabela profiles...');
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: ADMIN_USER_ID,
        full_name: 'Administrador',
        email: 'admin@teste.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (profileError) {
      console.error('❌ Erro ao criar perfil:', profileError.message);
    } else {
      console.log('✅ Perfil criado com sucesso!');
    }
    
    // 2. Criar perfil de líder na tabela leader_profiles
    console.log('\n🎯 Criando perfil de líder...');
    
    const { data: leaderData, error: leaderError } = await supabase
      .from('leader_profiles')
      .upsert({
        id: ADMIN_USER_ID,
        email: 'admin@teste.com',
        phone: null,
        birth_date: null,
        gender: null,
        cep: null,
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        notes: 'Administrador principal do sistema',
        status: 'ACTIVE',
        latitude: null,
        longitude: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        goal: 100,
        accepted_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (leaderError) {
      console.error('❌ Erro ao criar perfil de líder:', leaderError.message);
    } else {
      console.log('✅ Perfil de líder criado com sucesso!');
    }
    
    // 3. Criar meta de líder na tabela leader_targets
    console.log('\n🎯 Criando meta de líder...');
    
    const { data: targetData, error: targetError } = await supabase
      .from('leader_targets')
      .upsert({
        leader_id: ADMIN_USER_ID,
        goal: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'leader_id' });
    
    if (targetError) {
      console.error('❌ Erro ao criar meta de líder:', targetError.message);
    } else {
      console.log('✅ Meta de líder criada com sucesso!');
    }
    
    // 4. Verificar se tudo foi criado
    console.log('\n🔍 Verificando dados criados...');
    
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: leaders } = await supabase.from('leader_profiles').select('*');
    const { data: targets } = await supabase.from('leader_targets').select('*');
    
    console.log(`\n📊 Resumo:`);
    console.log(`   👥 Profiles: ${profiles?.length || 0} registros`);
    console.log(`   🎯 Leaders: ${leaders?.length || 0} registros`);
    console.log(`   🎯 Targets: ${targets?.length || 0} registros`);
    
    if (profiles && profiles.length > 0) {
      console.log(`\n👤 Perfil criado:`, profiles[0]);
    }
    
    if (leaders && leaders.length > 0) {
      console.log(`\n🎯 Líder criado:`, leaders[0]);
    }
    
    if (targets && targets.length > 0) {
      console.log(`\n🎯 Meta criada:`, targets[0]);
    }
    
    console.log('\n🎉 Usuário admin configurado como líder com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

createAdminLeaderProfile();
