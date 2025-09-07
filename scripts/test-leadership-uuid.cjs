// Script para testar validação de UUID no sistema de liderança
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente do arquivo .env.development
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env.development');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Erro ao carregar .env.development:', error.message);
    return {};
  }
}

const envVars = loadEnvFile();
const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

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
    // 1. Buscar alguns profiles para testar
    console.log('1️⃣ Buscando profiles para teste...');
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

    // 2. Testar validação de UUID com valores inválidos
    console.log('\n2️⃣ Testando validação de UUID...');
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

    // 3. Testar se a tabela profile_leaderships existe
    console.log('\n3️⃣ Testando se a tabela profile_leaderships existe...');
    const { data: leadership, error: leadershipError } = await supabase
      .from('profile_leaderships')
      .select('*')
      .limit(1);

    if (leadershipError) {
      console.log('❌ Tabela profile_leaderships não existe ou não acessível:', leadershipError.message);
      console.log('📝 Execute o script create-profile-leaderships-table.sql no Supabase');
    } else {
      console.log('✅ Tabela profile_leaderships existe e é acessível');
      console.log(`📊 Total de registros: ${leadership.length}`);
    }

    console.log('\n✅ Teste concluído!');
    console.log('\n📋 Resumo das correções implementadas:');
    console.log('  ✅ Validação de UUID no service de leadership');
    console.log('  ✅ Uso do profile_id correto (profiles.id) ao invés de leader_profiles.id');
    console.log('  ✅ Validação e logs no modal');
    console.log('  ✅ Tratamento de erros com mensagens amigáveis');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar teste
testLeadershipUuid();
