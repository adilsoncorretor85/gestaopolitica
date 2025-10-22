// Script para importar TODAS as pessoas do banco online
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase online (com chave de serviço)
const supabaseUrlOnline = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseServiceKeyOnline = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgwMzMzNSwiZXhwIjoyMDcxMzc5MzM1fQ.UbvVutPo6QzCM26KPSeHY5CYvSQLLNzPsqp3_thW3dE';

// Configurações do Supabase local (com chave anônima JWT)
const supabaseUrlLocal = 'http://127.0.0.1:54321';
const supabaseAnonKeyLocal = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabaseOnline = createClient(supabaseUrlOnline, supabaseServiceKeyOnline);
const supabaseLocal = createClient(supabaseUrlLocal, supabaseAnonKeyLocal);

// ID do usuário admin local
const ADMIN_USER_ID = 'bc0be6f1-5ce7-4a6f-ad82-93dcdb9965b2';

async function importAllPeople() {
  console.log('🚀 Iniciando importação de TODAS as pessoas...');
  
  try {
    // 1. Fazer login como admin
    console.log('\n🔐 Fazendo login como admin...');
    
    const { data: signInData, error: signInError } = await supabaseLocal.auth.signInWithPassword({
      email: 'admin@teste.com',
      password: 'admin123'
    });
    
    if (signInError) {
      console.error('❌ Erro ao fazer login:', signInError.message);
      return;
    }
    
    console.log('✅ Login realizado como admin');
    
    // 2. Primeiro, vamos contar quantas pessoas existem no online
    console.log('\n📊 Contando pessoas no banco online...');
    
    const { count: totalCount, error: countError } = await supabaseOnline
      .from('people')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erro ao contar pessoas:', countError.message);
      return;
    }
    
    console.log(`📈 Total de pessoas no online: ${totalCount}`);
    
    // 3. Limpar pessoas existentes no local
    console.log('\n🧹 Limpando pessoas existentes no local...');
    
    const { error: deleteError } = await supabaseLocal
      .from('people')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.log('⚠️  Erro ao limpar pessoas locais:', deleteError.message);
    } else {
      console.log('✅ Pessoas locais limpas');
    }
    
    // 4. Importar todas as pessoas em lotes
    console.log('\n📥 Importando todas as pessoas...');
    
    const batchSize = 1000; // Tamanho do lote
    const totalBatches = Math.ceil(totalCount / batchSize);
    
    console.log(`📦 Total de lotes: ${totalBatches}`);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const offset = batchIndex * batchSize;
      
      console.log(`\n🔄 Processando lote ${batchIndex + 1}/${totalBatches} (offset: ${offset})...`);
      
      try {
        // Buscar lote de pessoas do online
        const { data: peopleBatch, error: fetchError } = await supabaseOnline
          .from('people')
          .select('*')
          .range(offset, offset + batchSize - 1);
        
        if (fetchError) {
          console.error(`❌ Erro ao buscar lote ${batchIndex + 1}:`, fetchError.message);
          continue;
        }
        
        if (!peopleBatch || peopleBatch.length === 0) {
          console.log(`ℹ️  Lote ${batchIndex + 1} está vazio`);
          continue;
        }
        
        console.log(`📥 Lote ${batchIndex + 1}: ${peopleBatch.length} pessoas encontradas`);
        
        // Mapear owner_id para o admin
        const mappedPeople = peopleBatch.map(person => ({
          ...person,
          owner_id: ADMIN_USER_ID
        }));
        
        // Inserir lote no local
        const { error: insertError } = await supabaseLocal
          .from('people')
          .insert(mappedPeople);
        
        if (insertError) {
          console.error(`❌ Erro ao inserir lote ${batchIndex + 1}:`, insertError.message);
        } else {
          console.log(`✅ Lote ${batchIndex + 1}/${totalBatches} inserido com sucesso!`);
        }
        
        // Pequena pausa entre lotes para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`💥 Erro inesperado no lote ${batchIndex + 1}:`, err.message);
      }
    }
    
    console.log('\n🎊 Importação de pessoas concluída!');
    
    // 5. Verificar resultado final
    console.log('\n🔍 Verificando resultado final...');
    
    const { data: localPeople, error: localError } = await supabaseLocal
      .from('people')
      .select('*', { count: 'exact' });
    
    if (localError) {
      console.error('❌ Erro ao verificar pessoas locais:', localError.message);
    } else {
      console.log(`\n📊 Resumo final:`);
      console.log(`   📈 Pessoas no online: ${totalCount}`);
      console.log(`   📥 Pessoas importadas: ${localPeople?.length || 0}`);
      console.log(`   ✅ Taxa de sucesso: ${((localPeople?.length || 0) / totalCount * 100).toFixed(1)}%`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
  }
}

importAllPeople();
