// Script para testar a tabela profile_leaderships
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.development' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLeadershipTable() {
  console.log('🔍 Testando tabela profile_leaderships...\n');

  try {
    // 1. Verificar se a tabela existe
    console.log('1️⃣ Verificando se a tabela profile_leaderships existe...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'profile_leaderships');

    if (tablesError) {
      console.error('❌ Erro ao verificar tabelas:', tablesError);
      return;
    }

    if (tables && tables.length > 0) {
      console.log('✅ Tabela profile_leaderships existe');
    } else {
      console.log('❌ Tabela profile_leaderships NÃO existe');
      console.log('📝 Execute o script create-profile-leaderships-table.sql no Supabase');
      return;
    }

    // 2. Verificar estrutura da tabela
    console.log('\n2️⃣ Verificando estrutura da tabela...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'profile_leaderships')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ Erro ao verificar colunas:', columnsError);
      return;
    }

    console.log('📋 Colunas da tabela:');
    columns?.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // 3. Verificar constraints
    console.log('\n3️⃣ Verificando constraints...');
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'profile_leaderships');

    if (constraintsError) {
      console.error('❌ Erro ao verificar constraints:', constraintsError);
      return;
    }

    console.log('🔒 Constraints:');
    constraints?.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
    });

    // 4. Verificar RLS
    console.log('\n4️⃣ Verificando Row Level Security...');
    const { data: rls, error: rlsError } = await supabase
      .from('pg_tables')
      .select('rowsecurity')
      .eq('schemaname', 'public')
      .eq('tablename', 'profile_leaderships');

    if (rlsError) {
      console.error('❌ Erro ao verificar RLS:', rlsError);
      return;
    }

    if (rls && rls.length > 0) {
      console.log(`🔐 RLS: ${rls[0].rowsecurity ? 'Habilitado' : 'Desabilitado'}`);
    }

    // 5. Testar inserção (se houver dados de teste)
    console.log('\n5️⃣ Testando operações básicas...');
    
    // Verificar se há dados
    const { data: count, error: countError } = await supabase
      .from('profile_leaderships')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Erro ao contar registros:', countError);
      return;
    }

    console.log(`📊 Total de registros: ${count || 0}`);

    // 6. Verificar se há profiles para testar
    console.log('\n6️⃣ Verificando profiles disponíveis...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(5);

    if (profilesError) {
      console.error('❌ Erro ao buscar profiles:', profilesError);
      return;
    }

    if (profiles && profiles.length > 0) {
      console.log('👥 Profiles disponíveis para teste:');
      profiles.forEach(profile => {
        console.log(`  - ${profile.id}: ${profile.full_name || 'Sem nome'}`);
      });
    } else {
      console.log('⚠️ Nenhum profile encontrado para teste');
    }

    console.log('\n✅ Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar teste
testLeadershipTable();

