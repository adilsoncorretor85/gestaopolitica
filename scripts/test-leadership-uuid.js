// Script para testar validação de UUID no sistema de liderança
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.development' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Função para validar UUID (mesma do service)
function isUuid(value) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

async function testLeadershipUuid() {
  console.log('🔍 Testando validação de UUID no sistema de liderança...\n');

  try {
    // 1. Verificar se a tabela profile_leaderships existe
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

    // 2. Buscar alguns profiles para testar
    console.log('\n2️⃣ Buscando profiles para teste...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(3);

    if (profilesError) {
      console.error('❌ Erro ao buscar profiles:', profilesError);
      return;
    }

    if (profiles && profiles.length > 0) {
      console.log('👥 Profiles encontrados:');
      profiles.forEach(profile => {
        console.log(`  - ${profile.id}: ${profile.full_name || 'Sem nome'}`);
        console.log(`    UUID válido: ${isUuid(profile.id) ? '✅' : '❌'}`);
      });
    } else {
      console.log('⚠️ Nenhum profile encontrado');
      return;
    }

    // 3. Testar validação de UUID com valores inválidos
    console.log('\n3️⃣ Testando validação de UUID...');
    const testValues = [
      'undefined',
      'null',
      '',
      'invalid-uuid',
      '123',
      profiles[0].id, // UUID válido
    ];

    testValues.forEach(value => {
      const isValid = isUuid(value);
      console.log(`  - "${value}": ${isValid ? '✅ Válido' : '❌ Inválido'}`);
    });

    // 4. Testar query com UUID válido
    console.log('\n4️⃣ Testando query com UUID válido...');
    const validProfileId = profiles[0].id;
    
    const { data: leadership, error: leadershipError } = await supabase
      .from('profile_leaderships')
      .select('*')
      .eq('profile_id', validProfileId)
      .limit(1)
      .maybeSingle();

    if (leadershipError) {
      console.error('❌ Erro na query de liderança:', leadershipError);
    } else {
      console.log('✅ Query executada com sucesso');
      console.log(`📊 Registros encontrados: ${leadership ? 1 : 0}`);
    }

    // 5. Testar query com UUID inválido (deve falhar)
    console.log('\n5️⃣ Testando query com UUID inválido...');
    const { data: invalidData, error: invalidError } = await supabase
      .from('profile_leaderships')
      .select('*')
      .eq('profile_id', 'undefined')
      .limit(1)
      .maybeSingle();

    if (invalidError) {
      console.log('✅ Erro esperado com UUID inválido:', invalidError.message);
    } else {
      console.log('⚠️ Query com UUID inválido não falhou como esperado');
    }

    console.log('\n✅ Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar teste
testLeadershipUuid();
