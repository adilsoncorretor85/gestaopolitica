// Script para testar as correções implementadas
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDMzMzUsImV4cCI6MjA3MTM3OTMzNX0.yYNiRdi0Ve9fzdAHGYsIi1iQf4Lredve3PMbRjw41BI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixes() {
  try {
    console.log('🧪 Testando as correções implementadas...');
    
    // Verificar se as tabelas têm a coluna created_by
    console.log('🔍 Verificando estrutura das tabelas...');
    
    const { data: cityGoals, error: cityGoalsError } = await supabase
      .from('city_goals')
      .select('*')
      .limit(1);
    
    if (cityGoalsError) {
      console.error('❌ Erro ao verificar city_goals:', cityGoalsError);
    } else {
      console.log('✅ Tabela city_goals acessível');
      if (cityGoals && cityGoals.length > 0) {
        console.log('📋 Colunas disponíveis:', Object.keys(cityGoals[0]));
      }
    }
    
    const { data: neighborhoodGoals, error: neighborhoodGoalsError } = await supabase
      .from('neighborhood_goals')
      .select('*')
      .limit(1);
    
    if (neighborhoodGoalsError) {
      console.error('❌ Erro ao verificar neighborhood_goals:', neighborhoodGoalsError);
    } else {
      console.log('✅ Tabela neighborhood_goals acessível');
      if (neighborhoodGoals && neighborhoodGoals.length > 0) {
        console.log('📋 Colunas disponíveis:', Object.keys(neighborhoodGoals[0]));
      }
    }
    
    // Testar filtros com ilike
    console.log('🔍 Testando filtros com ilike...');
    
    const { data: filteredHoods, error: filterError } = await supabase
      .from('neighborhood_goals')
      .select('*')
      .ilike('city', 'são paulo');
    
    if (filterError) {
      console.error('❌ Erro no filtro ilike:', filterError);
    } else {
      console.log('✅ Filtro ilike funcionando:', filteredHoods?.length || 0, 'registros encontrados');
    }
    
    console.log('🎉 Testes concluídos!');
    console.log('💡 Para testar as operações de escrita, faça login como ADMIN no sistema');
    
  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

testFixes();


















