const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDMzMzUsImV4cCI6MjA3MTM3OTMzNX0.yYNiRdi0Ve9fzdAHGYsIi1iQf4Lredve3PMbRjw41BI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addLatLngToLeaderProfiles() {
  try {
    console.log('Adicionando campos latitude e longitude na tabela leader_profiles...');
    
    // Executar a migração SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Adicionar campos de latitude e longitude na tabela leader_profiles
        ALTER TABLE public.leader_profiles 
        ADD COLUMN IF NOT EXISTS latitude numeric NULL,
        ADD COLUMN IF NOT EXISTS longitude numeric NULL;
        
        -- Comentários para documentação
        COMMENT ON COLUMN public.leader_profiles.latitude IS 'Latitude geográfica do endereço do líder';
        COMMENT ON COLUMN public.leader_profiles.longitude IS 'Longitude geográfica do endereço do líder';
      `
    });
    
    if (error) {
      console.error('Erro ao executar migração:', error);
      return;
    }
    
    console.log('✅ Migração executada com sucesso!');
    console.log('Campos latitude e longitude adicionados na tabela leader_profiles');
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

// Executar a migração
addLatLngToLeaderProfiles();



