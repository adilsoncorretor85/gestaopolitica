// Script para testar a ativação automática de líderes
// Execute com: node scripts/test-leader-activation.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (use as variáveis de ambiente do seu projeto)
const supabaseUrl = process.env.SUPABASE_URL || 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada nas variáveis de ambiente');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLeaderActivation() {
  console.log('🧪 Testando ativação automática de líderes...\n');

  try {
    // 1. Buscar líderes com status PENDING
    console.log('1️⃣ Buscando líderes com status PENDING...');
    const { data: pendingLeaders, error: fetchError } = await supabase
      .from('leader_profiles')
      .select('id, email, status, created_at')
      .eq('status', 'PENDING')
      .limit(5);

    if (fetchError) {
      console.error('❌ Erro ao buscar líderes pendentes:', fetchError);
      return;
    }

    if (!pendingLeaders || pendingLeaders.length === 0) {
      console.log('ℹ️ Nenhum líder pendente encontrado para teste');
      return;
    }

    console.log(`✅ Encontrados ${pendingLeaders.length} líderes pendentes:`);
    pendingLeaders.forEach(leader => {
      console.log(`   - ${leader.email} (ID: ${leader.id})`);
    });

    // 2. Verificar invite_tokens correspondentes
    console.log('\n2️⃣ Verificando invite_tokens correspondentes...');
    for (const leader of pendingLeaders) {
      const { data: inviteToken, error: tokenError } = await supabase
        .from('invite_tokens')
        .select('email, accepted_at, leader_profile_id')
        .eq('email', leader.email)
        .single();

      if (tokenError) {
        console.log(`   ⚠️ Convite não encontrado para ${leader.email}`);
      } else {
        console.log(`   📧 Convite para ${leader.email}:`);
        console.log(`      - accepted_at: ${inviteToken.accepted_at || 'null'}`);
        console.log(`      - leader_profile_id: ${inviteToken.leader_profile_id || 'null'}`);
      }
    }

    // 3. Simular ativação (opcional - descomente para testar)
    console.log('\n3️⃣ Para testar a ativação automática:');
    console.log('   - Faça login com um dos líderes pendentes listados acima');
    console.log('   - Verifique o console do navegador para logs de ativação');
    console.log('   - Verifique se o status mudou para ACTIVE no banco');
    console.log('   - Os triggers do banco cuidam de accepted_at e invite_tokens');

    // 4. Verificar líderes ativos
    console.log('\n4️⃣ Verificando líderes ativos...');
    const { data: activeLeaders, error: activeError } = await supabase
      .from('leader_profiles')
      .select('id, email, status, updated_at')
      .eq('status', 'ACTIVE')
      .limit(5);

    if (activeError) {
      console.error('❌ Erro ao buscar líderes ativos:', activeError);
    } else {
      console.log(`✅ Encontrados ${activeLeaders?.length || 0} líderes ativos`);
      activeLeaders?.forEach(leader => {
        console.log(`   - ${leader.email} (atualizado em: ${leader.updated_at})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar o teste
testLeaderActivation().then(() => {
  console.log('\n✅ Teste concluído!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
